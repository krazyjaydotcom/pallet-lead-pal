import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const normEmail = (v?: string | null) => (v || "").trim().toLowerCase();
const normPhone = (v?: string | null) => (v || "").replace(/\D/g, "").slice(-10);
const normCompany = (v?: string | null) =>
  (v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(llc|inc|co|company|corp|corporation)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Read a value from the payload using a list of possible label aliases (case-insensitive).
const pick = (payload: Record<string, any>, keys: string[]): string => {
  const lower: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) lower[k.toLowerCase().trim()] = v;
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

const parseServiceType = (raw: string): "delivery" | "pickup" | "both" => {
  const v = raw.toLowerCase();
  if (v.includes("both")) return "both";
  if (v.includes("pick")) return "pickup";
  if (v.includes("deliver")) return "delivery";
  return "delivery";
};

const parseBoolish = (raw: string): boolean => /^(y|yes|true|1)/i.test(raw.trim());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || req.headers.get("x-webhook-token") || "";
    if (!token) {
      return new Response(JSON.stringify({ error: "missing token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokenRow, error: tokenErr } = await supabase
      .from("webhook_tokens")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: "invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = tokenRow.user_id;

    let payload: Record<string, any> = {};
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await req.json().catch(() => ({}));
    } else {
      const form = await req.formData().catch(() => null);
      if (form) for (const [k, v] of form.entries()) payload[k] = typeof v === "string" ? v : "";
    }

    // Flatten one level (Swipe Pages sometimes nests in `fields` or `data`)
    if (payload.fields && typeof payload.fields === "object") payload = { ...payload, ...payload.fields };
    if (payload.data && typeof payload.data === "object") payload = { ...payload, ...payload.data };

    const name = pick(payload, ["name of contact", "name", "full name", "contact name", "contact"]);
    const company = pick(payload, ["company name", "company", "business", "business name"]);
    const email = pick(payload, ["email", "email address", "e-mail"]);
    const phone = pick(payload, ["phone", "phone number", "mobile", "cell"]);
    const serviceRaw = pick(payload, ["which is your need? (choose one)", "which is your need", "need", "service", "service type"]);
    const forkliftRaw = pick(payload, ["do you have a forklift driver?", "do you have a forklift driver", "forklift", "forklift access"]);
    const palletNeeds = pick(payload, [
      "how many pallets per week?",
      "how many pallets per week",
      "pallet needs",
      "pallets",
      "quantity",
      "message",
    ]);
    const submittedDate = pick(payload, ["date", "submitted", "submitted at"]) || new Date().toISOString();
    const sourcePage = pick(payload, ["page", "source", "form"]);

    if (!name && !email && !phone && !company) {
      return new Response(JSON.stringify({ error: "no recognizable fields", received: Object.keys(payload) }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedupe against existing leads for this user (email -> phone -> company)
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId);

    const incomingEmail = normEmail(email);
    const incomingPhone = normPhone(phone);
    const incomingCompany = normCompany(company);

    const match = (existingLeads || []).find((l: any) => {
      const e = normEmail(l.email);
      const p = normPhone(l.phone);
      const c = normCompany(l.company);
      return (
        (incomingEmail && e === incomingEmail) ||
        (incomingPhone && p === incomingPhone) ||
        (incomingCompany && c === incomingCompany)
      );
    });

    const today = new Date().toISOString().split("T")[0];
    const baseTags = ["source:swipe-pages", "website-form", "needs-reply"];
    const noteBlock = [
      `Swipe Pages submission ${submittedDate}`,
      sourcePage ? `Page: ${sourcePage}` : "",
      palletNeeds ? `Pallets/week: ${palletNeeds}` : "",
      serviceRaw ? `Need: ${serviceRaw}` : "",
      forkliftRaw ? `Forklift: ${forkliftRaw}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (match) {
      const mergedTags = Array.from(new Set([...(match.tags || []), ...baseTags, "merged-account"]));
      const mergedNotes = match.notes
        ? `${match.notes}\n\nNew intake (${today}):\n${noteBlock}`
        : noteBlock;
      const { error: updErr } = await supabase
        .from("leads")
        .update({
          name: match.name || name,
          email: match.email || email,
          phone: match.phone || phone,
          company: match.company || company,
          pallet_needs: palletNeeds || match.pallet_needs,
          service_type: parseServiceType(serviceRaw) || match.service_type,
          forklift_access: match.forklift_access || parseBoolish(forkliftRaw),
          submitted_date: submittedDate,
          notes: mergedNotes,
          tags: mergedTags,
          status: match.status === "Client" ? "Client" : "New",
        })
        .eq("id", match.id);
      if (updErr) throw updErr;
      return new Response(JSON.stringify({ ok: true, action: "merged", lead_id: match.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insErr } = await supabase
      .from("leads")
      .insert({
        user_id: userId,
        name: name || company || email || "Website lead",
        email,
        phone,
        company,
        pallet_needs: palletNeeds,
        service_type: parseServiceType(serviceRaw),
        forklift_access: parseBoolish(forkliftRaw),
        current_customer: false,
        date: today,
        submitted_date: submittedDate,
        status: "New",
        notes: noteBlock,
        tags: baseTags,
        follow_up_date: today,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, action: "created", lead_id: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("intake-webhook error", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
