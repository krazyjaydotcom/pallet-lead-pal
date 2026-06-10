import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY")!;

const gwHeaders = {
  Authorization: `Bearer ${LOVABLE_API_KEY}`,
  "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
};

const b64urlDecode = (s: string) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
  } catch {
    return "";
  }
};

const b64urlEncode = (s: string) => {
  const b = btoa(unescape(encodeURIComponent(s)));
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const extractBody = (payload: any): string => {
  if (!payload) return "";
  if (payload.body?.data) return b64urlDecode(payload.body.data);
  if (Array.isArray(payload.parts)) {
    const plain = payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (plain?.body?.data) return b64urlDecode(plain.body.data);
    const html = payload.parts.find((p: any) => p.mimeType === "text/html");
    if (html?.body?.data) return b64urlDecode(html.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    for (const p of payload.parts) {
      const nested = extractBody(p);
      if (nested) return nested;
    }
  }
  return "";
};

const headerVal = (headers: any[], name: string) =>
  headers?.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    if (action === "list") {
      const q = params.q || "in:inbox";
      const max = params.maxResults || 25;
      const listRes = await fetch(
        `${GATEWAY}/users/me/messages?maxResults=${max}&q=${encodeURIComponent(q)}`,
        { headers: gwHeaders },
      );
      const listText = await listRes.text();
      if (!listRes.ok) {
        return new Response(JSON.stringify({ error: "gmail list failed", status: listRes.status, body: listText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const list = JSON.parse(listText);
      const ids: string[] = (list.messages || []).map((m: any) => m.id);

      const messages = await Promise.all(
        ids.map(async (id) => {
          const r = await fetch(`${GATEWAY}/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
            headers: gwHeaders,
          });
          if (!r.ok) {
            await r.text();
            return null;
          }
          const m = await r.json();
          return {
            id: m.id,
            threadId: m.threadId,
            snippet: m.snippet,
            from: headerVal(m.payload?.headers || [], "From"),
            subject: headerVal(m.payload?.headers || [], "Subject"),
            date: headerVal(m.payload?.headers || [], "Date"),
            labelIds: m.labelIds || [],
          };
        }),
      );

      return new Response(JSON.stringify({ messages: messages.filter(Boolean) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      const r = await fetch(`${GATEWAY}/users/me/messages/${params.id}?format=full`, { headers: gwHeaders });
      const text = await r.text();
      if (!r.ok) {
        return new Response(JSON.stringify({ error: "gmail get failed", status: r.status, body: text }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const m = JSON.parse(text);
      const headers = m.payload?.headers || [];
      return new Response(
        JSON.stringify({
          id: m.id,
          threadId: m.threadId,
          from: headerVal(headers, "From"),
          to: headerVal(headers, "To"),
          subject: headerVal(headers, "Subject"),
          date: headerVal(headers, "Date"),
          body: extractBody(m.payload),
          snippet: m.snippet,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "send") {
      const { to, subject, body } = params;
      if (!to || !subject) {
        return new Response(JSON.stringify({ error: "to and subject required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rfc = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "",
        body || "",
      ].join("\r\n");
      const raw = b64urlEncode(rfc);
      const r = await fetch(`${GATEWAY}/users/me/messages/send`, {
        method: "POST",
        headers: { ...gwHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const text = await r.text();
      if (!r.ok) {
        return new Response(JSON.stringify({ error: "gmail send failed", status: r.status, body: text }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(text, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gmail-inbox error", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
