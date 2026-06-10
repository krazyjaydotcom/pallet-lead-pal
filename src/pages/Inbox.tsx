import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Mail, RefreshCw, Send, Link2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Lead } from "@/types/Lead";

type GMessage = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  labelIds: string[];
};

type LinkRow = { message_id: string; lead_id: string | null; action: string };

const extractEmail = (from: string) => from.match(/<([^>]+)>/)?.[1] || from.trim();

const Inbox = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { leads, updateLead, addLeads } = useLeads();

  const [messages, setMessages] = useState<GMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GMessage | null>(null);
  const [fullBody, setFullBody] = useState<string>("");
  const [loadingBody, setLoadingBody] = useState(false);
  const [links, setLinks] = useState<Record<string, LinkRow>>({});
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchSearch, setMatchSearch] = useState("");

  // Composer
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/auth");
  }, [authLoading, isAuthenticated, navigate]);

  const loadLinks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("email_lead_links")
      .select("message_id, lead_id, action")
      .eq("user_id", user.id);
    const map: Record<string, LinkRow> = {};
    (data || []).forEach((r) => (map[r.message_id] = r));
    setLinks(map);
  };

  const loadInbox = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmail-inbox", {
        body: { action: "list", q: "in:inbox", maxResults: 30 },
      });
      if (error) throw error;
      setMessages(data.messages || []);
      await loadLinks();
    } catch (err: any) {
      toast.error(`Inbox failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openMessage = async (msg: GMessage) => {
    setSelected(msg);
    setFullBody("");
    setLoadingBody(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmail-inbox", {
        body: { action: "get", id: msg.id },
      });
      if (error) throw error;
      setFullBody(data.body || data.snippet || "");
    } catch (err: any) {
      toast.error(`Load failed: ${err.message || err}`);
    } finally {
      setLoadingBody(false);
    }
  };

  // Auto-suggested lead match by sender email
  const senderEmail = selected ? extractEmail(selected.from).toLowerCase() : "";
  const autoMatch = useMemo(() => {
    if (!senderEmail) return null;
    return leads.find((l) => l.email && l.email.toLowerCase() === senderEmail) || null;
  }, [leads, senderEmail]);

  const linkedLead = selected && links[selected.id]?.lead_id
    ? leads.find((l) => l.id === links[selected.id].lead_id)
    : null;

  const saveLink = async (msg: GMessage, leadId: string | null, action: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("email_lead_links")
      .upsert(
        {
          user_id: user.id,
          message_id: msg.id,
          thread_id: msg.threadId,
          lead_id: leadId,
          action,
        },
        { onConflict: "user_id,message_id" },
      );
    if (error) toast.error(error.message);
    else await loadLinks();
  };

  const linkToLead = async (lead: Lead) => {
    if (!selected) return;
    await saveLink(selected, lead.id, "linked");
    // Append email reference to lead notes
    const refNote = `Email "${selected.subject}" from ${selected.from} on ${selected.date}`;
    if (!(lead.notes || "").includes(selected.id)) {
      await updateLead({
        ...lead,
        notes: `${lead.notes || ""}\n\n${refNote}\n[gmail:${selected.id}]`.trim(),
        lastContact: new Date().toISOString().split("T")[0],
      });
    }
    setMatchOpen(false);
    toast.success(`Linked to ${lead.name || lead.company}`);
  };

  const createLeadFromEmail = async () => {
    if (!selected) return;
    const today = new Date().toISOString().split("T")[0];
    const fromName = selected.from.split("<")[0].trim().replace(/"/g, "") || senderEmail;
    const newLead: Lead = {
      id: crypto.randomUUID(),
      name: fromName,
      email: senderEmail,
      phone: "",
      company: "",
      palletNeeds: "",
      serviceType: "delivery",
      forklifitAccess: false,
      currentCustomer: false,
      date: today,
      submittedDate: today,
      status: "New",
      notes: `Created from email "${selected.subject}" on ${selected.date}\n\n${fullBody.slice(0, 1000)}`,
      tags: ["source:email", "needs-reply"],
      lastContact: today,
      followUpDate: today,
      source: "email",
    };
    await addLeads([newLead]);
    await saveLink(selected, newLead.id, "created");
    toast.success("Lead created from email");
  };

  const dismissMatch = async () => {
    if (!selected) return;
    await saveLink(selected, null, "dismissed");
    toast.success("Won't ask again");
  };

  const openCompose = (prefillTo?: string) => {
    setComposeTo(prefillTo || "");
    setComposeSubject("");
    setComposeBody("");
    setComposeOpen(true);
  };

  const sendEmail = async () => {
    if (!composeTo || !composeSubject) {
      toast.error("To and subject required");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("gmail-inbox", {
        body: { action: "send", to: composeTo, subject: composeSubject, body: composeBody },
      });
      if (error) throw error;
      toast.success("Email sent");
      setComposeOpen(false);
    } catch (err: any) {
      toast.error(`Send failed: ${err.message || err}`);
    } finally {
      setSending(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const q = matchSearch.toLowerCase();
    if (!q) return true;
    return [l.name, l.company, l.email, l.phone].some((v) => (v || "").toLowerCase().includes(q));
  });

  if (authLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 p-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-slate-200">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold">Inbox</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadInbox} disabled={loading} className="border-slate-700 bg-slate-950 text-slate-100">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => openCompose()}>
              <Send className="mr-2 h-4 w-4" /> New
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-3 p-3">
        {messages.length === 0 && !loading && (
          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardContent className="p-6 text-center text-sm text-slate-400">
              <Mail className="mx-auto mb-2 h-8 w-8" />
              No messages.
            </CardContent>
          </Card>
        )}

        {messages.map((msg) => {
          const link = links[msg.id];
          const isUnread = msg.labelIds?.includes("UNREAD");
          return (
            <button
              key={msg.id}
              onClick={() => openMessage(msg)}
              className={`w-full rounded-md border p-3 text-left transition ${
                isUnread ? "border-red-500/40 bg-slate-900" : "border-slate-800 bg-slate-900/60"
              } hover:border-slate-600`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${isUnread ? "font-semibold text-white" : "text-slate-200"}`}>
                    {msg.from}
                  </p>
                  <p className="truncate text-sm text-slate-300">{msg.subject || "(no subject)"}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{msg.snippet}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-500">{new Date(msg.date).toLocaleDateString()}</span>
                  {link?.action === "linked" && <Badge className="bg-emerald-600 text-white">Linked</Badge>}
                  {link?.action === "created" && <Badge className="bg-sky-600 text-white">Lead+</Badge>}
                  {link?.action === "dismissed" && <Badge variant="outline" className="border-slate-700 text-slate-400">Skipped</Badge>}
                </div>
              </div>
            </button>
          );
        })}
      </main>

      {/* Message detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selected?.subject || "(no subject)"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                <p><span className="font-semibold">From:</span> {selected.from}</p>
                <p><span className="font-semibold">Date:</span> {selected.date}</p>
              </div>

              {/* Match prompt */}
              {!links[selected.id] && (
                <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/30">
                  <CardContent className="p-3 space-y-2">
                    {autoMatch ? (
                      <>
                        <p className="text-sm font-medium">
                          Match to existing lead: <span className="font-bold">{autoMatch.name || autoMatch.company}</span>?
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => linkToLead(autoMatch)}>
                            <Link2 className="mr-2 h-4 w-4" /> Yes, link
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setMatchOpen(true)}>
                            Pick a different lead
                          </Button>
                          <Button size="sm" variant="outline" onClick={createLeadFromEmail}>
                            <UserPlus className="mr-2 h-4 w-4" /> Create new lead
                          </Button>
                          <Button size="sm" variant="ghost" onClick={dismissMatch}>
                            <X className="mr-2 h-4 w-4" /> Don't ask again
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm">No lead found for <span className="font-mono">{senderEmail}</span>.</p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={createLeadFromEmail}>
                            <UserPlus className="mr-2 h-4 w-4" /> Create lead
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setMatchOpen(true)}>
                            <Link2 className="mr-2 h-4 w-4" /> Link to existing
                          </Button>
                          <Button size="sm" variant="ghost" onClick={dismissMatch}>
                            <X className="mr-2 h-4 w-4" /> Don't ask again
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {linkedLead && (
                <p className="text-xs text-emerald-600">
                  Linked to lead: {linkedLead.name || linkedLead.company}
                </p>
              )}

              <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-[40vh] overflow-y-auto">
                {loadingBody ? "Loading…" : fullBody}
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => openCompose(senderEmail)}>
                  <Send className="mr-2 h-4 w-4" /> Reply
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lead picker */}
      <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pick a lead to link</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search name, company, email…"
            value={matchSearch}
            onChange={(e) => setMatchSearch(e.target.value)}
          />
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filteredLeads.map((l) => (
              <button
                key={l.id}
                onClick={() => linkToLead(l)}
                className="w-full rounded-md border p-2 text-left hover:bg-accent"
              >
                <p className="text-sm font-medium">{l.name || l.company || "(unnamed)"}</p>
                <p className="text-xs text-muted-foreground">{l.email || l.phone || l.company}</p>
              </button>
            ))}
            {filteredLeads.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Composer */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="To" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} />
            <Input placeholder="Subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
            <Textarea
              placeholder="Message"
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={8}
            />
            <Button onClick={sendEmail} disabled={sending} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inbox;
