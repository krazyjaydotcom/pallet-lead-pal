import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Lead } from "@/types/Lead";
import { toast } from "sonner";

const normalizeEmail = (email?: string | null) => (email || "").trim().toLowerCase();

const normalizePhone = (phone?: string | null) => (phone || "").replace(/\D/g, "").slice(-10);

const normalizeCompany = (company?: string | null) =>
  (company || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(llc|inc|co|company|corp|corporation)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const getAccountKey = (lead: Pick<Lead, "email" | "phone" | "company" | "name">) => {
  const email = normalizeEmail(lead.email);
  const phone = normalizePhone(lead.phone);
  const company = normalizeCompany(lead.company);
  const name = normalizeCompany(lead.name);

  if (email) return `email:${email}`;
  if (phone) return `phone:${phone}`;
  if (company) return `company:${company}`;
  return `name:${name}`;
};

const getLeadSource = (tags: string[] = []): Lead["source"] => {
  const sourceTag = tags.find((tag) => tag.startsWith("source:"));
  return (sourceTag?.replace("source:", "") as Lead["source"]) || "manual";
};

const mergeTags = (...tagGroups: Array<string[] | undefined>) =>
  Array.from(new Set(tagGroups.flatMap((tags) => tags || []).filter(Boolean)));

const mergeLeadRecords = (existing: Lead, incoming: Lead): Lead => {
  const newNotes = incoming.notes?.trim();
  const existingNotes = existing.notes?.trim();
  const notes =
    newNotes && existingNotes && !existingNotes.includes(newNotes)
      ? `${existingNotes}\n\nNew intake note (${new Date().toLocaleDateString()}): ${newNotes}`
      : existingNotes || newNotes || "";

  return {
    ...existing,
    name: existing.name || incoming.name,
    phone: existing.phone || incoming.phone,
    email: existing.email || incoming.email,
    company: existing.company || incoming.company,
    palletNeeds: incoming.palletNeeds || existing.palletNeeds,
    serviceType: incoming.serviceType || existing.serviceType,
    forklifitAccess: existing.forklifitAccess || incoming.forklifitAccess,
    currentCustomer: existing.currentCustomer || incoming.currentCustomer,
    submittedDate: incoming.submittedDate || existing.submittedDate,
    status: existing.status === "Client" ? "Client" : incoming.status || existing.status,
    notes,
    tags: mergeTags(existing.tags, incoming.tags, ["merged-account"]),
    lastContact: existing.lastContact || incoming.lastContact,
    followUpDate: incoming.followUpDate || existing.followUpDate,
    source: existing.source || incoming.source || getLeadSource(mergeTags(existing.tags, incoming.tags)),
    sourceDetails: incoming.sourceDetails || existing.sourceDetails,
    accountKey: existing.accountKey || incoming.accountKey || getAccountKey(existing),
    nextAction: incoming.nextAction || existing.nextAction,
  };
};

export const useLeads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Load leads from database
  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });

      if (error) throw error;

      // Transform database data to match our Lead type
      const transformedLeads: Lead[] = data.map((lead) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone || "",
        email: lead.email || "",
        company: lead.company || "",
        palletNeeds: lead.pallet_needs || "",
        serviceType: (lead.service_type as "delivery" | "pickup" | "both") || "delivery",
        forklifitAccess: lead.forklift_access || false,
        currentCustomer: lead.current_customer || false,
        date: lead.date,
        submittedDate: lead.submitted_date || null,
        status: (lead.status as "New" | "Contacted" | "Client") || "New",
        notes: lead.notes || "",
        tags: lead.tags || [],
        lastContact: lead.last_contact || null,
        followUpDate: lead.follow_up_date || null,
        source: getLeadSource(lead.tags || []),
        accountKey: getAccountKey({
          name: lead.name,
          email: lead.email || "",
          phone: lead.phone || "",
          company: lead.company || "",
        }),
        nextAction: lead.follow_up_date ? "Follow up" : "",
        ltvData:
          lead.ltv_pallets_per_month !== null ||
          lead.ltv_pallet_type ||
          lead.ltv_price_per_pallet !== null ||
          lead.ltv_not_sure
            ? {
                palletsPerMonth: lead.ltv_pallets_per_month,
                palletType: (lead.ltv_pallet_type as "standard" | "custom") || "standard",
                pricePerPallet: lead.ltv_price_per_pallet ? Number(lead.ltv_price_per_pallet) : null,
                notSure: lead.ltv_not_sure || false,
              }
            : undefined,
      }));

      setLeads(transformedLeads);
    } catch (error) {
      console.error("Error loading leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const saveLeads = async (newLeads: Lead[]) => {
    if (!user) return;

    try {
      // Transform leads to match database schema
      const dbLeads = newLeads.map((lead) => ({
        id: lead.id,
        user_id: user.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        company: lead.company,
        pallet_needs: lead.palletNeeds,
        service_type: lead.serviceType,
        forklift_access: lead.forklifitAccess,
        current_customer: lead.currentCustomer,
        date: lead.date,
        submitted_date: lead.submittedDate,
        status: lead.status,
        notes: lead.notes,
        tags: lead.tags,
        last_contact: lead.lastContact,
        follow_up_date: lead.followUpDate,
        ltv_pallets_per_month: lead.ltvData?.palletsPerMonth || null,
        ltv_pallet_type: lead.ltvData?.palletType || null,
        ltv_price_per_pallet: lead.ltvData?.pricePerPallet || null,
        ltv_not_sure: lead.ltvData?.notSure || false,
      }));

      const { error } = await supabase.from("leads").upsert(dbLeads, { onConflict: "id" });

      if (error) throw error;

      setLeads(newLeads);
      return true;
    } catch (error) {
      console.error("Error saving leads:", error);
      toast.error("Failed to save leads");
      return false;
    }
  };

  const addLeads = async (newLeads: Lead[]) => {
    let mergedCount = 0;
    const nextLeads = [...leads];

    newLeads.forEach((newLead) => {
      const normalizedNewLead = {
        ...newLead,
        accountKey: newLead.accountKey || getAccountKey(newLead),
        source: newLead.source || getLeadSource(newLead.tags),
        tags: mergeTags(newLead.tags, newLead.source ? [`source:${newLead.source}`] : []),
      };

      const incomingEmail = normalizeEmail(normalizedNewLead.email);
      const incomingPhone = normalizePhone(normalizedNewLead.phone);
      const incomingCompany = normalizeCompany(normalizedNewLead.company);
      const duplicateIndex = nextLeads.findIndex((existing) => {
        const existingEmail = normalizeEmail(existing.email);
        const existingPhone = normalizePhone(existing.phone);
        const existingCompany = normalizeCompany(existing.company);

        return (
          (incomingEmail && existingEmail === incomingEmail) ||
          (incomingPhone && existingPhone === incomingPhone) ||
          (incomingCompany && existingCompany === incomingCompany)
        );
      });

      if (duplicateIndex >= 0) {
        nextLeads[duplicateIndex] = mergeLeadRecords(nextLeads[duplicateIndex], normalizedNewLead);
        mergedCount += 1;
      } else {
        nextLeads.push(normalizedNewLead);
      }
    });

    const success = await saveLeads(nextLeads);
    if (success) {
      const createdCount = newLeads.length - mergedCount;
      const messageParts = [
        createdCount ? `${createdCount} new` : "",
        mergedCount ? `${mergedCount} merged` : "",
      ].filter(Boolean);
      toast.success(`Lead flywheel updated: ${messageParts.join(", ") || "no changes"}`);
    }
  };

  const updateLead = async (updatedLead: Lead) => {
    const updatedLeads = leads.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead));
    await saveLeads(updatedLeads);
  };

  const deleteLead = async (leadId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("leads").delete().eq("id", leadId);

      if (error) throw error;

      const updatedLeads = leads.filter((lead) => lead.id !== leadId);
      setLeads(updatedLeads);
      toast.success("Lead deleted successfully!");
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead");
    }
  };

  return {
    leads,
    loading,
    addLeads,
    updateLead,
    deleteLead,
    refreshLeads: loadLeads,
  };
};
