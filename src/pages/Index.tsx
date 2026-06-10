import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bell,
  Camera,
  ChevronRight,
  Inbox,
  Link2,
  Clock,
  Copy,
  List,
  LogOut,
  Mail,
  Phone,
  Plus,
  Search,
  Settings,
  CalendarClock,
  MessageSquare,
  UserPlus,
  Users,
} from "lucide-react";
import { LeadTable } from "@/components/LeadTable";
import ChartsDashboard from "@/components/ChartsDashboard";
import CSVImporter from "@/components/CSVImporter";
import { ClientsTracker } from "@/components/ClientsTracker";
import { LeadEntryForm } from "@/components/LeadEntryForm";
import { Lead } from "@/types/Lead";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";

type ViewKey = "dashboard" | "intake" | "add" | "leads" | "reports" | "settings";

type IconType = React.ComponentType<{ className?: string }>;

type MetricItem = {
  label: string;
  value: number;
  note?: string;
  icon: IconType;
};

type NavItem = {
  key: ViewKey;
  label: string;
  icon: IconType;
  center?: boolean;
};

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

const prettyTime = (date?: string | null) => {
  if (!date) return "No Next Step";
  if (date <= todayIso()) return "Today";
  if (date === tomorrowIso()) return "Tomorrow";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

const initialsFor = (label: string) =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "PP";

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

const StatusPill = ({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "slate" | "amber" }) => {
  const tones = {
    blue: "bg-blue-500/90 text-white shadow-[0_0_24px_rgba(37,99,235,.26)]",
    slate: "bg-slate-700/70 text-slate-100",
    amber: "bg-amber-500/90 text-slate-950",
  };

  return <span className={`rounded-md px-3 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
};

const Index = () => {
  const { loading, signOut, isAuthenticated } = useAuth();
  const { leads, loading: leadsLoading, addLeads, updateLead, deleteLead } = useLeads();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
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
  const newLeads = accounts.filter((account) => account.status === "New").length;

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
    setActiveView("dashboard");
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
      <div className="min-h-screen bg-[#020914] text-white flex items-center justify-center">
        <div className="text-center animate-[fadeUp_.5s_ease_both]">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="mt-3 text-sm text-slate-300">Loading CRM...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const stats: MetricItem[] = [
    { label: "Accounts", value: accounts.length, note: "Total", icon: Users },
    { label: "Need Reply", value: needsReply, note: "Waiting on you", icon: MessageSquare },
    { label: "Due Today", value: dueToday, note: "Follow ups due", icon: CalendarClock },
    { label: "Receipts", value: receiptQueue, note: "Need review", icon: Inbox },
  ];

  const glance: MetricItem[] = [
    { label: "New Leads", value: newLeads, icon: UserPlus },
    { label: "Need Reply", value: needsReply, icon: MessageSquare },
    { label: "Due Today", value: dueToday, icon: CalendarClock },
    { label: "Receipts", value: receiptQueue, icon: Inbox },
    { label: "No Next Step", value: stuckDeals, icon: Clock },
  ];

  const bottomNav: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: Inbox },
    { key: "intake", label: "Intake", icon: Inbox },
    { key: "add", label: "Add Lead", icon: Plus, center: true },
    { key: "leads", label: "Leads", icon: Users },
    { key: "reports", label: "Reports", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#020914] text-slate-100">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes softPulse {
          0%, 100% { opacity: .55; transform: scale(1); }
          50% { opacity: .9; transform: scale(1.04); }
        }
        .lux-panel {
          background: linear-gradient(145deg, rgba(11, 27, 45, .92), rgba(3, 13, 26, .96));
          border: 1px solid rgba(125, 169, 217, .18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 20px 60px rgba(0,0,0,.22);
        }
        .lux-card {
          background: linear-gradient(145deg, rgba(15, 35, 57, .84), rgba(4, 16, 30, .92));
          border: 1px solid rgba(127, 174, 225, .17);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.045), 0 12px 34px rgba(0, 0, 0, .2);
        }
        .lux-glow {
          box-shadow: 0 0 0 1px rgba(0, 128, 255, .9), 0 0 38px rgba(0, 119, 255, .18), inset 0 1px 0 rgba(255,255,255,.05);
        }
        .lux-fade {
          animation: fadeUp .48s ease both;
        }
      `}</style>

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl animate-[softPulse_5s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 right-0 h-72 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-56 rounded-full bg-blue-700/12 blur-3xl" />
      </div>

      <main className="relative mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between lux-fade">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-200 to-orange-500 shadow-[0_16px_42px_rgba(245,158,11,.22)]">
              <Link2 className="h-7 w-7 text-slate-950" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-normal text-white sm:text-4xl">
                Pallet Pros <span className="text-blue-500">CRM</span>
              </h1>
              <p className="hidden text-sm text-slate-400 sm:block">Mobile-first deal command center</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView(activeView === "settings" ? "dashboard" : "settings")}
              className="grid h-14 w-14 place-items-center rounded-full border border-slate-700/70 bg-slate-900/70 shadow-xl transition hover:border-blue-500/60 hover:bg-slate-800"
              aria-label="Search and settings"
            >
              <Search className="h-6 w-6 text-slate-100" />
            </button>
            <button
              onClick={() => setActiveView(activeView === "settings" ? "dashboard" : "settings")}
              className="relative grid h-14 w-14 place-items-center rounded-full border border-slate-700/70 bg-slate-900/70 shadow-xl transition hover:border-blue-500/60 hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell className="h-6 w-6 text-slate-100" />
              {needsReply > 0 && (
                <span className="absolute -right-1 -top-1 grid h-7 min-w-7 place-items-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
                  {needsReply}
                </span>
              )}
            </button>
          </div>
        </header>

        {activeView === "dashboard" && (
          <section className="space-y-4 lux-fade">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.label}
                    className="lux-card rounded-2xl text-slate-100"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <CardContent className="flex min-h-[138px] flex-col justify-between p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-600 shadow-[0_0_32px_rgba(37,99,235,.42)]">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-base font-medium text-slate-100">{item.label}</p>
                      </div>
                      <div>
                        <p className="text-4xl font-bold tracking-normal text-slate-100">{item.value}</p>
                        <p className="mt-1 text-sm text-slate-400">{item.note}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="lux-panel rounded-2xl text-slate-100">
              <CardHeader className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    Account Queue
                    <span className="rounded-full bg-blue-600/20 px-2 py-1 text-sm font-bold text-blue-400">
                      {needsReply}
                    </span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => setActiveView("settings")}
                    className="h-11 rounded-xl border-slate-700/70 bg-slate-900/60 text-slate-100 hover:bg-slate-800"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search accounts, contacts, emails..."
                    className="h-16 rounded-xl border-slate-700/80 bg-slate-950/60 pl-12 text-base text-slate-100 placeholder:text-slate-400 focus-visible:ring-blue-500"
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-3 pt-0 sm:p-4 sm:pt-0">
                {visibleAccounts.slice(0, 5).map((account, index) => {
                  const isSelected = selectedAccount?.key === account.key || (!selectedAccountKey && index === 0);
                  const firstLead = account.leads[0];
                  const tag =
                    account.status === "Client"
                      ? "Client"
                      : account.nextFollowUp && account.nextFollowUp <= todayIso()
                        ? "Due Today"
                        : account.status === "New"
                          ? "New Lead"
                          : "Waiting";

                  return (
                    <button
                      key={account.key}
                      onClick={() => setSelectedAccountKey(account.key)}
                      className={`relative w-full rounded-2xl p-4 text-left transition duration-300 ${isSelected ? "lux-glow bg-blue-950/20" : "border border-slate-800/90 bg-slate-950/35 hover:border-blue-500/40"}`}
                    >
                      {isSelected && (
                        <span className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-blue-500 shadow-[0_0_18px_rgba(37,99,235,.8)]" />
                      )}
                      <div className="flex items-center gap-4">
                        <div
                          className={`grid h-20 w-20 shrink-0 place-items-center rounded-full text-2xl font-bold text-white ${isSelected ? "bg-blue-600" : "bg-slate-700/80"}`}
                        >
                          {initialsFor(account.label)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xl font-bold text-white">{account.label}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusPill tone={tag === "Due Today" ? "blue" : tag === "No Next Step" ? "slate" : "blue"}>
                              {tag}
                            </StatusPill>
                            <StatusPill tone="slate">
                              {account.tags.find((tag) => !tag.startsWith("source:")) ||
                                account.sources[0] ||
                                "Industrial"}
                            </StatusPill>
                          </div>
                          <div className="mt-3 flex gap-4 text-slate-300">
                            <Mail className="h-5 w-5" />
                            <Phone className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="hidden text-right sm:block">
                          <p className="text-sm text-slate-400">Next:</p>
                          <p className="mt-2 text-blue-400">{prettyTime(account.nextFollowUp)}</p>
                        </div>
                        <ChevronRight className="h-7 w-7 text-slate-300" />
                      </div>
                    </button>
                  );
                })}

                {visibleAccounts.length === 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-8 text-center text-slate-400">
                    No accounts match the current filters.
                  </div>
                )}

                <button
                  onClick={() => setActiveView("leads")}
                  className="flex w-full items-center justify-between border-t border-slate-800 px-4 py-5 text-slate-300"
                >
                  <span className="flex items-center gap-3 text-lg">
                    <List className="h-5 w-5" /> View all accounts
                  </span>
                  <ChevronRight className="h-6 w-6" />
                </button>
              </CardContent>
            </Card>

            <Card className="lux-panel rounded-2xl text-slate-100">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Clock className="h-6 w-6 text-slate-300" /> Today at a Glance
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-5 gap-1 p-4 pt-0">
                {glance.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="border-r border-slate-700/70 px-2 last:border-r-0">
                      <Icon className="mb-2 h-6 w-6 text-blue-500" />
                      <p className="min-h-9 text-xs text-slate-300">{item.label}</p>
                      <p className="text-3xl font-bold text-slate-100">{item.value}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="lux-panel rounded-2xl text-slate-100">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="text-2xl">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3">
                  <LeadEntryForm
                    onAddLead={(lead) =>
                      addLeads([
                        { ...lead, source: "manual", tags: uniqueValues([...(lead.tags || []), "source:manual"]) },
                      ])
                    }
                  />
                </div>
                <Button
                  onClick={() => setActiveView("intake")}
                  variant="outline"
                  className="h-20 rounded-2xl border-slate-800 bg-slate-950/35 text-base text-slate-100 hover:bg-slate-800"
                >
                  <Inbox className="mr-3 h-7 w-7 text-blue-500" /> Intake
                </Button>
                <label className="flex h-20 cursor-pointer items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/35 text-base font-medium text-slate-100 hover:bg-slate-800">
                  <Camera className="mr-3 h-7 w-7 text-blue-500" />
                  Upload Receipt
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => primaryLead && handleReceiptCapture(primaryLead, event.target.files?.[0])}
                  />
                </label>
                <Button
                  onClick={() => setActiveView("leads")}
                  variant="outline"
                  className="h-20 rounded-2xl border-slate-800 bg-slate-950/35 text-base text-slate-100 hover:bg-slate-800"
                >
                  <Clock className="mr-3 h-7 w-7 text-blue-500" /> Follow Ups
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {activeView === "intake" && (
          <section className="space-y-4 lux-fade">
            <Card className="lux-panel rounded-2xl text-slate-100">
              <CardHeader className="p-5">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Inbox className="h-6 w-6 text-blue-500" /> Website Intake
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-0">
                <textarea
                  value={swipeEmailText}
                  onChange={(event) => setSwipeEmailText(event.target.value)}
                  placeholder="Paste the Swipe Pages form notification email here..."
                  className="min-h-[260px] w-full rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-base text-slate-100 outline-none transition focus:border-blue-500"
                />
                <Button
                  onClick={handleSwipeEmailImport}
                  className="h-14 w-full rounded-2xl bg-blue-600 text-base hover:bg-blue-700"
                >
                  <Inbox className="mr-2 h-5 w-5" />
                  Add to CRM
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {activeView === "add" && (
          <section className="space-y-4 lux-fade">
            <Card className="lux-panel rounded-2xl text-slate-100">
              <CardHeader className="p-5">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Plus className="h-6 w-6 text-blue-500" /> Add Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-0">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
                  <LeadEntryForm
                    onAddLead={(lead) =>
                      addLeads([
                        { ...lead, source: "manual", tags: uniqueValues([...(lead.tags || []), "source:manual"]) },
                      ])
                    }
                  />
                </div>
                <p className="text-sm text-slate-400">
                  Use the Add Lead button above for manual capture. Website form capture lives under Intake.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {activeView === "leads" && (
          <section className="space-y-4 lux-fade">
            <Card className="lux-panel rounded-2xl text-slate-100">
              <CardHeader className="p-5">
                <CardTitle className="text-2xl">Lead Records</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
                <LeadTable leads={leads} onUpdateLead={updateLead} onDeleteLead={deleteLead} />
              </CardContent>
            </Card>
            <ClientsTracker leads={leads} onUpdateLead={updateLead} />
          </section>
        )}

        {activeView === "reports" && (
          <section className="space-y-4 lux-fade">
            <Card className="lux-panel rounded-2xl text-slate-100">
              <CardHeader className="p-5">
                <CardTitle className="text-2xl">Reports</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
                <ChartsDashboard leads={leads} />
              </CardContent>
            </Card>
          </section>
        )}

        {activeView === "settings" && (
          <section className="space-y-4 lux-fade">
            <Card className="lux-panel rounded-2xl text-slate-100">
              <CardHeader className="p-5">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Settings className="h-6 w-6 text-blue-500" /> Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
                    <p className="mb-3 text-lg font-semibold">Data Import</p>
                    <CSVImporter onImport={handleCSVImport} existingLeads={leads} />
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
                    <p className="mb-3 text-lg font-semibold">Account Tools</p>
                    <Button
                      onClick={handleCopyEmails}
                      variant="outline"
                      className="w-full border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Visible Emails
                    </Button>
                  </div>
                </div>

                <Card className="border-slate-800 bg-slate-950/35 text-slate-100">
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">Integration Readiness</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 p-4 pt-0 sm:grid-cols-2">
                    {[
                      ["Swipe Pages", "Webhook endpoint ready"],
                      ["Email", "Reply flow ready"],
                      ["Quo", "Phone matching ready"],
                      ["QuickBooks", "Receipt queue ready"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3"
                      >
                        <span className="text-slate-300">{label}</span>
                        <Badge variant="outline" className="border-slate-700 text-slate-100">
                          {value}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
                  >
                    <option value="all">All Status</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Client">Client</option>
                  </select>
                  <select
                    value={sourceFilter}
                    onChange={(event) => setSourceFilter(event.target.value)}
                    className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
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

                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="h-12 w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/90 bg-[#03101f]/95 px-3 pb-4 pt-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-5 items-end gap-1">
          {bottomNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`flex flex-col items-center justify-end gap-1 rounded-2xl py-2 text-xs transition duration-300 ${
                  activeView === item.key ? "text-blue-500" : "text-slate-300 hover:text-white"
                }`}
              >
                <span
                  className={`${item.center ? "-mt-8 grid h-16 w-16 place-items-center rounded-full bg-blue-600 text-white shadow-[0_16px_42px_rgba(37,99,235,.45)]" : ""}`}
                >
                  <Icon className={`${item.center ? "h-9 w-9" : "h-7 w-7"}`} />
                </span>
                <span className="text-[13px] sm:text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Index;
