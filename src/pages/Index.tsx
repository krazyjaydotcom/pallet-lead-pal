import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertCircle,
  CalendarClock,
  Camera,
  CheckCircle2,
  Copy,
  Inbox,
  Link2,
  LogOut,
  Mail,
  MessageSquare,
  Search,
  UserPlus,
} from "lucide-react";
import { LeadTable } from "@/components/LeadTable";
import ChartsDashboard from "@/components/ChartsDashboard";
import CSVImporter from "@/components/CSVImporter";
import { ClientsTracker } from "@/components/ClientsTracker";
import { LeadEntryForm } from "@/components/LeadEntryForm";
import { Lead } from "@/types/Lead";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";

type AccountGroup = {
  key: string;
  label: string;
  company: string;
  leads: Lead[];
  emails: string[];
  phones: string[];
  sources: string[];
  tags: string[];
  nextFollowUp: string | null;
  status: Lead["status"];
};

const todayIso = () => new Date().toISOString().split("T")[0];

const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

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

const getAccountKey = (lead: Lead) => {
  const email = normalizeEmail(lead.email);
  const phone = normalizePhone(lead.phone);
  const company = normalizeCompany(lead.company);
  const name = normalizeCompany(lead.name);

  if (email) return `email:${email}`;
  if (phone) return `phone:${phone}`;
  if (company) return `company:${company}`;
  return `name:${name || lead.id}`;
};

const uniqueValues = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const sourceFromTags = (lead: Lead) =>
  lead.source || lead.tags.find((tag) => tag.startsWith("source:"))?.replace("source:", "") || "manual";

const buildAccounts = (leads: Lead[]): AccountGroup[] => {
  const groups = new Map<string, AccountGroup>();

  leads.forEach((lead) => {
    const key = lead.accountKey || getAccountKey(lead);
    const existing = groups.get(key);
    const nextGroup: AccountGroup = existing || {
      key,
      label: lead.company || lead.name || lead.email || "Unnamed account",
      company: lead.company || "",
      leads: [],
      emails: [],
      phones: [],
      sources: [],
      tags: [],
      nextFollowUp: null,
      status: lead.status,
    };

    nextGroup.leads.push(lead);
    nextGroup.emails = uniqueValues([...nextGroup.emails, lead.email]);
    nextGroup.phones = uniqueValues([...nextGroup.phones, lead.phone]);
    nextGroup.sources = uniqueValues([...nextGroup.sources, sourceFromTags(lead)]);
    nextGroup.tags = uniqueValues([...nextGroup.tags, ...lead.tags]);
    nextGroup.company = nextGroup.company || lead.company;
    nextGroup.label = nextGroup.company || nextGroup.label;
    nextGroup.status =
      nextGroup.status === "Client" || lead.status === "Client"
        ? "Client"
        : nextGroup.status === "Contacted" || lead.status === "Contacted"
          ? "Contacted"
          : "New";

    if (lead.followUpDate) {
      nextGroup.nextFollowUp =
        !nextGroup.nextFollowUp || lead.followUpDate < nextGroup.nextFollowUp
          ? lead.followUpDate
          : nextGroup.nextFollowUp;
    }

    groups.set(key, nextGroup);
  });

  return Array.from(groups.values()).sort((a, b) => {
    const aDue = a.nextFollowUp || "9999-12-31";
    const bDue = b.nextFollowUp || "9999-12-31";
    return aDue.localeCompare(bDue) || b.leads.length - a.leads.length;
  });
};

const createEmptyLead = (overrides: Partial<Lead>): Lead => ({
  id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
  name: "",
  phone: "",
  email: "",
  company: "",
  palletNeeds: "",
  serviceType: "delivery",
  forklifitAccess: false,
  currentCustomer: false,
  date: todayIso(),
  submittedDate: todayIso(),
  status: "New",
  notes: "",
  tags: [],
  lastContact: null,
  followUpDate: todayIso(),
  ...overrides,
});

const parseSwipePagesEmail = (text: string): Partial<Lead> => {
  const find = (labels: string[]) => {
    const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const match = text.match(new RegExp(`(?:${escaped})\\s*:?\\s*(.+)`, "i"));
    return match?.[1]?.split("\n")[0]?.trim() || "";
  };

  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || find(["email", "email address"]);
  const phone =
    text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0] || find(["phone", "phone number"]);

  return {
    name: find(["name", "full name", "contact name"]),
    company: find(["company", "business", "business name"]),
    email,
    phone,
    palletNeeds: find(["pallet needs", "needs", "message", "request"]),
    notes: text.trim(),
  };
};

const Index = () => {
  const { loading, signOut, isAuthenticated } = useAuth();
  const { leads, loading: leadsLoading, addLeads, updateLead, deleteLead } = useLeads();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);
  const [swipeEmailText, setSwipeEmailText] = useState("");
  const [receiptPreviews, setReceiptPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [loading, isAuthenticated, navigate]);

  const accounts = useMemo(() => buildAccounts(leads), [leads]);

  const visibleAccounts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchesSearch =
        !search ||
        [account.label, account.company, ...account.emails, ...account.phones, ...account.tags].some((value) =>
          value.toLowerCase().includes(search),
        );
      const matchesStatus = statusFilter === "all" || account.status === statusFilter;
      const matchesSource = sourceFilter === "all" || account.sources.includes(sourceFilter);

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [accounts, searchTerm, statusFilter, sourceFilter]);

  const selectedAccount = visibleAccounts.find((account) => account.key === selectedAccountKey) || visibleAccounts[0];
  const primaryLead = selectedAccount?.leads[0];
  const dueToday = accounts.filter((account) => account.nextFollowUp && account.nextFollowUp <= todayIso()).length;
  const needsReply = accounts.filter(
    (account) => account.status === "New" || account.tags.includes("needs-reply"),
  ).length;
  const stuckDeals = accounts.filter((account) => !account.nextFollowUp && account.status !== "Client").length;
  const receiptQueue = leads.filter((lead) => lead.tags.includes("receipt-photo")).length;

  const handleCSVImport = (importedLeads: Lead[]) => {
    addLeads(
      importedLeads.map((lead) => ({
        ...lead,
        source: "csv",
        tags: uniqueValues([...(lead.tags || []), "source:csv"]),
      })),
    );
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  const handleCopyEmails = async () => {
    const emails = uniqueValues(visibleAccounts.flatMap((account) => account.emails)).join(", ");

    if (emails) {
      try {
        await navigator.clipboard.writeText(emails);
        toast.success(`Copied ${visibleAccounts.length} account email set`);
      } catch (err) {
        toast.error("Failed to copy emails");
      }
    } else {
      toast.error("No emails found");
    }
  };

  const handleSwipeEmailImport = () => {
    const parsed = parseSwipePagesEmail(swipeEmailText);
    if (!parsed.email && !parsed.phone && !parsed.company) {
      toast.error("Paste the full Swipe Pages notification first");
      return;
    }

    addLeads([
      createEmptyLead({
        ...parsed,
        name: parsed.name || parsed.company || parsed.email || "Website lead",
        source: "swipe-pages",
        sourceDetails: "Swipe Pages form email",
        tags: ["source:swipe-pages", "website-form", "needs-reply"],
        nextAction: "Reply to website form lead",
      }),
    ]);
    setSwipeEmailText("");
  };

  const updateLeadWorkflow = (lead: Lead, changes: Partial<Lead>, successMessage: string) => {
    updateLead({
      ...lead,
      ...changes,
      tags: changes.tags || lead.tags,
    });
    toast.success(successMessage);
  };

  const handleReceiptCapture = (lead: Lead, file?: File) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setReceiptPreviews((prev) => ({ ...prev, [lead.id]: previewUrl }));
    updateLeadWorkflow(
      lead,
      {
        tags: uniqueValues([...lead.tags, "receipt-photo", "needs-review"]),
        notes: `${lead.notes || ""}\n\nReceipt captured ${todayIso()}: ${file.name}`.trim(),
      },
      "Receipt added to review queue",
    );
  };

  if (loading || leadsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-3 text-sm text-slate-300">Loading CRM...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-5">
        <header className="flex flex-col gap-3 rounded-md border border-slate-800 bg-slate-900/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-normal text-white sm:text-3xl">Pallet Business CRM</h1>
              <Badge className="bg-red-600 text-white hover:bg-red-600">Flywheel</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-300">Accounts, replies, receipts, and follow-ups in one queue.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <LeadEntryForm
              onAddLead={(lead) =>
                addLeads([{ ...lead, source: "manual", tags: uniqueValues([...(lead.tags || []), "source:manual"]) }])
              }
            />
            <CSVImporter onImport={handleCSVImport} existingLeads={leads} />
            <Button
              variant="outline"
              onClick={() => navigate("/inbox")}
              className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
            >
              <Inbox className="mr-2 h-4 w-4" />
              Inbox
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/settings")}
              className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
            >
              Settings
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Accounts", value: accounts.length, icon: Link2, tone: "text-sky-300" },
            { label: "Need Reply", value: needsReply, icon: Inbox, tone: "text-red-300" },
            { label: "Due Today", value: dueToday, icon: CalendarClock, tone: "text-amber-300" },
            { label: "Receipts", value: receiptQueue, icon: Camera, tone: "text-emerald-300" },
          ].map((item) => (
            <Card key={item.label} className="border-slate-800 bg-slate-900 text-slate-100">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.tone}`}>{item.value}</p>
                </div>
                <item.icon className={`h-5 w-5 ${item.tone}`} />
              </CardContent>
            </Card>
          ))}
        </section>

        <Tabs defaultValue="flywheel" className="space-y-4">
          <TabsList className="grid h-auto grid-cols-2 bg-slate-900 p-1 sm:grid-cols-4">
            <TabsTrigger value="flywheel">Flywheel</TabsTrigger>
            <TabsTrigger value="intake">Website Intake</TabsTrigger>
            <TabsTrigger value="leads">Lead Table</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="flywheel" className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
              <Card className="border-slate-800 bg-slate-900 text-slate-100">
                <CardHeader className="space-y-3 p-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Search className="h-4 w-4 text-red-400" />
                    Account Queue
                  </CardTitle>
                  <div className="grid gap-2">
                    <Input
                      placeholder="Search account, email, phone..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="border-slate-700 bg-slate-950 text-slate-100"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
                      >
                        <option value="all">All Status</option>
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Client">Client</option>
                      </select>
                      <select
                        value={sourceFilter}
                        onChange={(event) => setSourceFilter(event.target.value)}
                        className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
                      >
                        <option value="all">All Sources</option>
                        <option value="manual">Manual</option>
                        <option value="swipe-pages">Swipe Pages</option>
                        <option value="email">Email</option>
                        <option value="quo">Quo</option>
                        <option value="quickbooks">QuickBooks</option>
                        <option value="csv">CSV</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="max-h-[620px] space-y-2 overflow-y-auto p-3 pt-0">
                  {visibleAccounts.map((account) => (
                    <button
                      key={account.key}
                      onClick={() => setSelectedAccountKey(account.key)}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        selectedAccount?.key === account.key
                          ? "border-red-500 bg-red-950/30"
                          : "border-slate-800 bg-slate-950 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">{account.label}</p>
                          <p className="text-xs text-slate-400">
                            {account.emails[0] || account.phones[0] || "No contact yet"}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-slate-700 text-slate-200">
                          {account.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {account.sources.map((source) => (
                          <Badge key={source} className="bg-slate-800 text-slate-200 hover:bg-slate-800">
                            {source}
                          </Badge>
                        ))}
                        {account.nextFollowUp && (
                          <Badge className="bg-amber-500 text-slate-950 hover:bg-amber-500">
                            {account.nextFollowUp}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "New Leads", count: accounts.filter((account) => account.status === "New").length },
                    { label: "Waiting", count: accounts.filter((account) => account.status === "Contacted").length },
                    { label: "No Next Step", count: stuckDeals },
                    { label: "Clients", count: accounts.filter((account) => account.status === "Client").length },
                  ].map((lane) => (
                    <Card key={lane.label} className="border-slate-800 bg-slate-900 text-slate-100">
                      <CardContent className="p-3">
                        <p className="text-xs text-slate-400">{lane.label}</p>
                        <p className="text-xl font-bold text-white">{lane.count}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {selectedAccount && primaryLead ? (
                  <Card className="border-slate-800 bg-slate-900 text-slate-100">
                    <CardHeader className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <CardTitle className="text-xl text-white">{selectedAccount.label}</CardTitle>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedAccount.emails.map((email) => (
                              <Badge key={email} variant="outline" className="border-slate-700 text-slate-200">
                                {email}
                              </Badge>
                            ))}
                            {selectedAccount.phones.map((phone) => (
                              <Badge key={phone} variant="outline" className="border-slate-700 text-slate-200">
                                {phone}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex">
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() =>
                              selectedAccount.emails[0] &&
                              (window.location.href = `mailto:${selectedAccount.emails[0]}`)
                            }
                            disabled={!selectedAccount.emails[0]}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Reply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                            onClick={handleCopyEmails}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Emails
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 p-4 pt-0 lg:grid-cols-[1fr_320px]">
                      <div className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Button
                            variant="outline"
                            className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                            onClick={() =>
                              updateLeadWorkflow(
                                primaryLead,
                                {
                                  status: "Contacted",
                                  lastContact: todayIso(),
                                  tags: primaryLead.tags.filter((tag) => tag !== "needs-reply"),
                                },
                                "Marked contacted",
                              )
                            }
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Contacted
                          </Button>
                          <Button
                            variant="outline"
                            className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                            onClick={() =>
                              updateLeadWorkflow(
                                primaryLead,
                                {
                                  followUpDate: tomorrowIso(),
                                  nextAction: "Follow up tomorrow",
                                  tags: uniqueValues([...primaryLead.tags, "follow-up"]),
                                },
                                "Follow-up set for tomorrow",
                              )
                            }
                          >
                            <CalendarClock className="mr-2 h-4 w-4" />
                            Tomorrow
                          </Button>
                          <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-slate-700 bg-slate-950 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800">
                            <Camera className="mr-2 h-4 w-4" />
                            Receipt
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(event) => handleReceiptCapture(primaryLead, event.target.files?.[0])}
                            />
                          </label>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Card className="border-slate-800 bg-slate-950 text-slate-100">
                            <CardHeader className="p-3">
                              <CardTitle className="flex items-center gap-2 text-sm">
                                <MessageSquare className="h-4 w-4 text-red-400" />
                                Timeline
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 p-3 pt-0">
                              {selectedAccount.leads.map((lead) => (
                                <div key={lead.id} className="rounded-md border border-slate-800 bg-slate-900 p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium">{lead.name || lead.company || "Lead"}</p>
                                    <Badge className="bg-slate-800 text-slate-200 hover:bg-slate-800">
                                      {sourceFromTags(lead)}
                                    </Badge>
                                  </div>
                                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">
                                    {lead.notes || lead.palletNeeds || "No notes yet"}
                                  </p>
                                </div>
                              ))}
                            </CardContent>
                          </Card>

                          <Card className="border-slate-800 bg-slate-950 text-slate-100">
                            <CardHeader className="p-3">
                              <CardTitle className="flex items-center gap-2 text-sm">
                                <AlertCircle className="h-4 w-4 text-amber-300" />
                                Deal Guardrails
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 p-3 pt-0 text-sm">
                              <div className="flex items-center justify-between rounded-md bg-slate-900 p-2">
                                <span className="text-slate-300">Next action</span>
                                <span className="font-medium text-white">
                                  {primaryLead.nextAction || (primaryLead.followUpDate ? "Follow up" : "Missing")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between rounded-md bg-slate-900 p-2">
                                <span className="text-slate-300">Follow-up</span>
                                <span className="font-medium text-white">{primaryLead.followUpDate || "Not set"}</span>
                              </div>
                              <div className="flex items-center justify-between rounded-md bg-slate-900 p-2">
                                <span className="text-slate-300">Receipts</span>
                                <span className="font-medium text-white">
                                  {primaryLead.tags.includes("receipt-photo") ? "Review" : "None"}
                                </span>
                              </div>
                              {receiptPreviews[primaryLead.id] && (
                                <img
                                  src={receiptPreviews[primaryLead.id]}
                                  alt="Receipt preview"
                                  className="mt-2 aspect-video w-full rounded-md object-cover"
                                />
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      <Card className="border-slate-800 bg-slate-950 text-slate-100">
                        <CardHeader className="p-3">
                          <CardTitle className="text-sm">Integrations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 p-3 pt-0">
                          {[
                            {
                              label: "Swipe Pages",
                              value: selectedAccount.sources.includes("swipe-pages") ? "Connected by source" : "Ready",
                            },
                            { label: "Email", value: selectedAccount.emails.length ? "Replyable" : "Missing" },
                            {
                              label: "Quo",
                              value: selectedAccount.phones.length ? "Phone match ready" : "Needs phone",
                            },
                            {
                              label: "QuickBooks",
                              value: primaryLead.status === "Client" ? "Customer ready" : "Lead stage",
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between rounded-md border border-slate-800 p-2"
                            >
                              <span className="text-sm text-slate-300">{item.label}</span>
                              <Badge variant="outline" className="border-slate-700 text-slate-200">
                                {item.value}
                              </Badge>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-slate-800 bg-slate-900 text-slate-100">
                    <CardContent className="p-6 text-center text-slate-300">
                      No accounts match the current filters.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="intake" className="grid gap-3 lg:grid-cols-[1fr_360px]">
            <Card className="border-slate-800 bg-slate-900 text-slate-100">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="h-4 w-4 text-red-400" />
                  Swipe Pages Intake
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <textarea
                  value={swipeEmailText}
                  onChange={(event) => setSwipeEmailText(event.target.value)}
                  placeholder="Paste the Swipe Pages form notification email here..."
                  className="min-h-[220px] w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-red-500"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button onClick={handleSwipeEmailImport} className="bg-red-600 hover:bg-red-700">
                    <Inbox className="mr-2 h-4 w-4" />
                    Add to CRM
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                    onClick={() => setSwipeEmailText("")}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900 text-slate-100">
              <CardHeader className="p-4">
                <CardTitle className="text-base">Webhook Field Map</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {["name", "email", "phone", "company", "pallet_needs", "message", "source"].map((field) => (
                  <div
                    key={field}
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200"
                  >
                    {field}
                  </div>
                ))}
                <p className="text-xs leading-5 text-slate-400">
                  Use the current email parser until the public webhook function is exposed for direct editing.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            <Card className="border-slate-800 bg-slate-900 text-slate-100">
              <CardHeader className="p-4">
                <CardTitle className="text-base">Lead Records</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <LeadTable leads={leads} onUpdateLead={updateLead} onDeleteLead={deleteLead} />
              </CardContent>
            </Card>
            <ClientsTracker leads={leads} onUpdateLead={updateLead} />
          </TabsContent>

          <TabsContent value="analytics">
            <ChartsDashboard leads={leads} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
