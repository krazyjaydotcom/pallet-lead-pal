import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Lead } from '@/types/Lead';
import { toast } from 'sonner';

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
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database data to match our Lead type
      const transformedLeads: Lead[] = data.map(lead => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone || '',
        email: lead.email || '',
        company: lead.company || '',
        palletNeeds: lead.pallet_needs || '',
        serviceType: (lead.service_type as 'delivery' | 'pickup' | 'both') || 'delivery',
        forklifitAccess: lead.forklift_access || false,
        currentCustomer: lead.current_customer || false,
        date: lead.date,
        submittedDate: lead.submitted_date || null,
        status: (lead.status as "New" | "Contacted" | "Client") || 'New',
        notes: lead.notes || '',
        tags: lead.tags || [],
        lastContact: lead.last_contact || null,
        followUpDate: lead.follow_up_date || null,
        ltvData: (lead.ltv_pallets_per_month !== null || lead.ltv_pallet_type || lead.ltv_price_per_pallet !== null || lead.ltv_not_sure) ? {
          palletsPerMonth: lead.ltv_pallets_per_month,
          palletType: (lead.ltv_pallet_type as 'standard' | 'custom') || 'standard',
          pricePerPallet: lead.ltv_price_per_pallet ? Number(lead.ltv_price_per_pallet) : null,
          notSure: lead.ltv_not_sure || false
        } : undefined
      }));

      setLeads(transformedLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const saveLeads = async (newLeads: Lead[]) => {
    if (!user) return;

    try {
      // Transform leads to match database schema
      const dbLeads = newLeads.map(lead => ({
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
        ltv_not_sure: lead.ltvData?.notSure || false
      }));

      const { error } = await supabase
        .from('leads')
        .upsert(dbLeads, { onConflict: 'id' });

      if (error) throw error;

      setLeads(newLeads);
      return true;
    } catch (error) {
      console.error('Error saving leads:', error);
      toast.error('Failed to save leads');
      return false;
    }
  };

  const addLeads = async (newLeads: Lead[]) => {
    const success = await saveLeads([...leads, ...newLeads]);
    if (success) {
      toast.success(`Added ${newLeads.length} leads successfully!`);
    }
  };

  const updateLead = async (updatedLead: Lead) => {
    const updatedLeads = leads.map(lead => 
      lead.id === updatedLead.id ? updatedLead : lead
    );
    await saveLeads(updatedLeads);
  };

  const deleteLead = async (leadId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      const updatedLeads = leads.filter(lead => lead.id !== leadId);
      setLeads(updatedLeads);
      toast.success('Lead deleted successfully!');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    }
  };

  return {
    leads,
    loading,
    addLeads,
    updateLead,
    deleteLead,
    refreshLeads: loadLeads
  };
};