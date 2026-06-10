import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Bell,
  Camera,
  ChevronRight,
  Inbox,
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
  Navigation,
  Map,
  BarChart2,
  X,
  CheckCircle,
  ArrowLeft,
  Copy,
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

// ── Pure helpers ──────────────────────────────────────────────────────────────
const todayIso = () => new Date().toISOString().split("T")[0];
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};
const prettyTime = (date?: string | null) => {
  if (!date) return "No date set";
  if (date <= todayIso()) return "Today";
  if (date === tomorrowIso()) return "Tomorrow";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const normalizeEmail = (e?: string | null) => (e || "").trim().toLowerCase();
const normalizePhone = (p?: string | null) => (p || "").replace(/\D/g, "").slice(-10);
const normalizeCompany = (c?: string | null) =>
  (c || "")
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
const uniqueValues = (values: string[]) => Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
const sourceFromTags = (lead: Lead) =>
  lead.source || lead.tags.find((t) => t.startsWith("source:"))?.replace("source:", "") || "manual";
const initialsFor = (label: string) =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "PP";

const buildAccounts = (leads: Lead[]): AccountGroup[] => {
  const groups = new Map<string, AccountGroup>();
  leads.forEach((lead) => {
    const key = lead.accountKey || getAccountKey(lead);
    const existing = groups.get(key);
    const next: AccountGroup = existing || {
      key,
      label: lead.company || lead.name || lead.email || "Unnamed",
      company: lead.company || "",
      leads: [],
      emails: [],
      phones: [],
      sources: [],
      tags: [],
      nextFollowUp: null,
      status: lead.status,
    };
    next.leads.push(lead);
    next.emails = uniqueValues([...next.emails, lead.email]);
    next.phones = uniqueValues([...next.phones, lead.phone]);
    next.sources = uniqueValues([...next.sources, sourceFromTags(lead)]);
    next.tags = uniqueValues([...next.tags, ...lead.tags]);
    next.company = next.company || lead.company;
    next.label = next.company || next.label;
    next.status =
      next.status === "Client" || lead.status === "Client"
        ? "Client"
        : next.status === "Contacted" || lead.status === "Contacted"
          ? "Contacted"
          : "New";
    if (lead.followUpDate) {
      next.nextFollowUp =
        !next.nextFollowUp || lead.followUpDate < next.nextFollowUp ? lead.followUpDate : next.nextFollowUp;
    }
    groups.set(key, next);
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
    const escaped = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
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

// ── GPS helpers (free, no API key) ────────────────────────────────────────────
const openNavigation = (label: string, app: "google" | "waze") => {
  const q = encodeURIComponent(label);
  const url =
    app === "waze"
      ? `https://waze.com/ul?q=${q}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  window.open(url, "_blank");
};

// ── Style constants ───────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  Client: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  Contacted: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  New: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  "Due Today": "bg-red-500/20 text-red-300 border border-red-500/30",
};
const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-400 to-orange-500",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-cyan-400 to-sky-600",
];
const avatarColor = (label: string) => AVATAR_COLORS[label.charCodeAt(0) % AVATAR_COLORS.length];

// ── Sub-components ────────────────────────────────────────────────────────────
const RoutePanel = ({ account, onClose }: { account: AccountGroup; onClose: () => void }) => (
  <div className="lux-panel rounded-3xl p-5 space-y-4 lux-fade">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-white">Navigate to</h2>
      <button
        onClick={onClose}
        className="h-9 w-9 grid place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
    <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-4">
      <p className="text-lg font-semibold text-white">{account.label}</p>
      <p className="text-sm text-slate-400 mt-1">
        {account.leads[0]?.palletNeeds || "Add a full address in lead notes for best results"}
      </p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => openNavigation(account.label, "google")}
        className="flex flex-col items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 hover:bg-slate-800 transition"
      >
        <div className="h-12 w-12 rounded-full bg-blue-600/20 grid place-items-center">
          <Map className="h-6 w-6 text-blue-400" />
        </div>
        <span className="text-sm font-semibold text-white">Google Maps</span>
        <span className="text-xs text-slate-400">Free</span>
      </button>
      <button
        onClick={() => openNavigation(account.label, "waze")}
        className="flex flex-col items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 hover:bg-slate-800 transition"
      >
        <div className="h-12 w-12 rounded-full bg-cyan-600/20 grid place-items-center">
          <Navigation className="h-6 w-6 text-cyan-400" />
        </div>
        <span className="text-sm font-semibold text-white">Waze</span>
        <span className="text-xs text-slate-400">Free · Live traffic</span>
      </button>
    </div>
    <p className="text-xs text-slate-500 text-center">Tip: Add a full street address in lead notes for best results</p>
  </div>
);

const LeadCard = ({
  account,
  isSelected,
  onClick,
  onNavigate,
}: {
  account: AccountGroup;
  isSelected: boolean;
  onClick: () => void;
  onNavigate: () => void;
}) => {
  const tag =
    account.status === "Client"
      ? "Client"
      : account.nextFollowUp && account.nextFollowUp <= todayIso()
        ? "Due Today"
        : account.status === "New"
          ? "New"
          : "Contacted";
  return (
    <button
      onClick={onClick}
      className={`relative w-full rounded-2xl p-4 text-left transition duration-200 ${
        isSelected ? "lux-glow bg-blue-950/20" : "border border-slate-800/80 bg-slate-950/40 hover:border-blue-500/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarColor(account.label)} text-lg font-bold text-white shadow-lg`}
        >
          {initialsFor(account.label)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-bold text-white truncate">{account.label}</p>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[tag] || STATUS_COLOR.New}`}
            >
              {tag}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {account.leads[0]?.palletNeeds || account.sources[0] || "No details yet"}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {account.phones[0] && (
              <a
                href={`tel:${account.phones[0]}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            )}
            {account.emails[0] && (
              <a
                href={`mailto:${account.emails[0]}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate();
              }}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              <Navigation className="h-3.5 w-3.5" /> Navigate
            </button>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-500">Next</p>
          <p className="text-xs font-medium text-blue-400 mt-0.5">{prettyTime(account.nextFollowUp)}</p>
        </div>
      </div>
    </button>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
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
  const [navAccount, setNavAccount] = useState<AccountGroup | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/auth");
  }, [loading, isAuthenticated, navigate]);

  const accounts = useMemo(() => buildAccounts(leads), [leads]);

  const visibleAccounts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return accounts.filter((a) => {
      const matchesSearch =
        !search ||
        [a.label, a.company, ...a.emails, ...a.phones, ...a.tags].some((v) => v.toLowerCase().includes(search));
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const matchesSource = sourceFilter === "all" || a.sources.includes(sourceFilter);
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [accounts, searchTerm, statusFilter, sourceFilter]);

  const selectedAccount = visibleAccounts.find((a) => a.key === selectedAccountKey) || visibleAccounts[0];
  const primaryLead = selectedAccount?.leads[0];
  const dueToday = accounts.filter((a) => a.nextFollowUp && a.nextFollowUp <= todayIso()).length;
  const needsReply = accounts.filter((a) => a.status === "New" || a.tags.includes("needs-reply")).length;
  const newLeads = accounts.filter((a) => a.status === "New").length;
  const clientCount = accounts.filter((a) => a.status === "Client").length;

  const handleCSVImport = (importedLeads: Lead[]) =>
    addLeads(
      importedLeads.map((l) => ({ ...l, source: "csv", tags: uniqueValues([...(l.tags || []), "source:csv"]) })),
    );

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
  };

  const handleCopyEmails = async () => {
    const emails = uniqueValues(visibleAccounts.flatMap((a) => a.emails)).join(", ");
    if (emails) {
      await navigator.clipboard.writeText(emails);
      toast.success("Emails copied");
    } else toast.error("No emails found");
  };

  const handleSwipeEmailImport = () => {
    const parsed = parseSwipePagesEmail(swipeEmailText);
    if (!parsed.email && !parsed.phone && !parsed.company) {
      toast.error("Paste the Swipe Pages notification first");
      return;
    }
    addLeads([
      createEmptyLead({
        ...parsed,
        name: parsed.name || parsed.company || parsed.email || "Website lead",
        source: "swipe-pages",
        tags: ["source:swipe-pages", "website-form", "needs-reply"],
        nextAction: "Reply to website form lead",
      }),
    ]);
    setSwipeEmailText("");
    setActiveView("dashboard");
  };

  const handleReceiptCapture = (lead: Lead, file?: File) => {
    if (!file) return;
    updateLead({
      ...lead,
      tags: uniqueValues([...lead.tags, "receipt-photo", "needs-review"]),
      notes: `${lead.notes || ""}\n\nReceipt captured ${todayIso()}: ${file.name}`.trim(),
    });
    toast.success("Receipt added");
  };

  if (loading || leadsLoading) {
    return (
      <div className="min-h-screen bg-[#020914] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="mt-3 text-sm text-slate-300">Loading CRM...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const bottomNav = [
    { key: "dashboard" as ViewKey, label: "Home", icon: Inbox },
    { key: "intake" as ViewKey, label: "Intake", icon: MessageSquare },
    { key: "add" as ViewKey, label: "Add", icon: Plus, center: true },
    { key: "leads" as ViewKey, label: "Leads", icon: Users },
    { key: "reports" as ViewKey, label: "Reports", icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen bg-[#020914] text-slate-100">
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes softPulse {
          0%,100% { opacity:.55; transform:scale(1); }
          50%     { opacity:.9;  transform:scale(1.04); }
        }
        .lux-panel {
          background: linear-gradient(145deg,rgba(11,27,45,.93),rgba(3,13,26,.97));
          border: 1px solid rgba(125,169,217,.16);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04),0 20px 60px rgba(0,0,0,.22);
        }
        .lux-card {
          background: linear-gradient(145deg,rgba(15,35,57,.84),rgba(4,16,30,.92));
          border: 1px solid rgba(127,174,225,.14);
        }
        .lux-glow {
          box-shadow: 0 0 0 1px rgba(0,128,255,.7),0 0 28px rgba(0,119,255,.15),inset 0 1px 0 rgba(255,255,255,.05);
        }
        .lux-fade { animation: fadeUp .38s ease both; }
      `}</style>

      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl animate-[softPulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 right-0 h-56 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-48 rounded-full bg-blue-700/10 blur-3xl" />
      </div>

      <main className="relative mx-auto min-h-screen max-w-lg px-4 pb-28 pt-5">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between lux-fade">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Pallet Pros <span className="text-blue-400">CRM</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {accounts.length} accounts · {dueToday > 0 ? `${dueToday} due today` : "all caught up"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch((s) => !s)}
              className="h-11 w-11 grid place-items-center rounded-full border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 transition"
            >
              {showSearch ? <X className="h-5 w-5 text-slate-300" /> : <Search className="h-5 w-5 text-slate-300" />}
            </button>
            <button
              onClick={() => setActiveView(activeView === "settings" ? "dashboard" : "settings")}
              className="relative h-11 w-11 grid place-items-center rounded-full border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 transition"
            >
              <Bell className="h-5 w-5 text-slate-300" />
              {needsReply > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-5 min-w-5 grid place-items-center rounded-full bg-blue-600 text-[10px] font-bold text-white px-1">
                  {needsReply}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Collapsible search */}
        {showSearch && (
          <div className="mb-4 lux-fade">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search accounts, emails, phone..."
                className="h-12 rounded-2xl border-slate-700/70 bg-slate-900/80 pl-11 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-slate-400 hover:text-white" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {activeView === "dashboard" && (
          <section className="space-y-4 lux-fade">
            {navAccount ? (
              <RoutePanel account={navAccount} onClose={() => setNavAccount(null)} />
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { label: "Total", value: accounts.length, icon: Users, color: "text-slate-300" },
                      { label: "New", value: newLeads, icon: UserPlus, color: "text-amber-400" },
                      { label: "Due", value: dueToday, icon: CalendarClock, color: "text-red-400" },
                      { label: "Clients", value: clientCount, icon: CheckCircle, color: "text-emerald-400" },
                    ] as const
                  ).map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="lux-card rounded-2xl p-3 flex flex-col items-center gap-1">
                      <Icon className={`h-5 w-5 ${color}`} />
                      <p className="text-2xl font-black text-white leading-none">{value}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent leads */}
                <div className="lux-panel rounded-3xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <h2 className="text-base font-bold text-white">Recent Leads</h2>
                    <button
                      onClick={() => setActiveView("leads")}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      View all <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="px-3 pb-4 space-y-2">
                    {visibleAccounts.slice(0, 6).map((account) => (
                      <LeadCard
                        key={account.key}
                        account={account}
                        isSelected={selectedAccount?.key === account.key}
                        onClick={() => setSelectedAccountKey(account.key)}
                        onNavigate={() => setNavAccount(account)}
                      />
                    ))}
                    {visibleAccounts.length === 0 && (
                      <div className="rounded-2xl border border-slate-800 p-8 text-center text-sm text-slate-500">
                        No leads yet. Tap <strong className="text-white">+</strong> to add one.
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 cursor-pointer hover:bg-slate-900 transition">
                    <Camera className="h-6 w-6 text-blue-400" />
                    <span className="text-xs text-slate-300 font-medium text-center">Receipt</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => primaryLead && handleReceiptCapture(primaryLead, e.target.files?.[0])}
                    />
                  </label>
                  <button
                    onClick={() => setActiveView("intake")}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 hover:bg-slate-900 transition"
                  >
                    <Inbox className="h-6 w-6 text-blue-400" />
                    <span className="text-xs text-slate-300 font-medium">Intake</span>
                  </button>
                  <button
                    onClick={() => setActiveView("settings")}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 hover:bg-slate-900 transition"
                  >
                    <Settings className="h-6 w-6 text-blue-400" />
                    <span className="text-xs text-slate-300 font-medium">Settings</span>
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── INTAKE ── */}
        {activeView === "intake" && (
          <section className="lux-fade">
            <div className="lux-panel rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveView("dashboard")}
                  className="h-9 w-9 grid place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold text-white">Website Intake</h2>
              </div>
              <textarea
                value={swipeEmailText}
                onChange={(e) => setSwipeEmailText(e.target.value)}
                placeholder="Paste the Swipe Pages form email here..."
                className="w-full min-h-[220px] rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-100 outline-none focus:border-blue-500 transition resize-none"
              />
              <Button
                onClick={handleSwipeEmailImport}
                className="h-12 w-full rounded-2xl bg-blue-600 text-sm hover:bg-blue-700"
              >
                <Inbox className="mr-2 h-4 w-4" /> Add to CRM
              </Button>
            </div>
          </section>
        )}

        {/* ── ADD LEAD ── */}
        {activeView === "add" && (
          <section className="lux-fade">
            <div className="lux-panel rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveView("dashboard")}
                  className="h-9 w-9 grid place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold text-white">Add Lead</h2>
              </div>
              <LeadEntryForm
                onAddLead={(lead) =>
                  addLeads([{ ...lead, source: "manual", tags: uniqueValues([...(lead.tags || []), "source:manual"]) }])
                }
              />
            </div>
          </section>
        )}

        {/* ── LEADS ── */}
        {activeView === "leads" && (
          <section className="space-y-4 lux-fade">
            <div className="lux-panel rounded-3xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                <button
                  onClick={() => setActiveView("dashboard")}
                  className="h-9 w-9 grid place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold text-white">Lead Records</h2>
              </div>
              <div className="px-3 pb-5">
                <LeadTable leads={leads} onUpdateLead={updateLead} onDeleteLead={deleteLead} />
              </div>
            </div>
            <ClientsTracker leads={leads} onUpdateLead={updateLead} />
          </section>
        )}

        {/* ── REPORTS ── */}
        {activeView === "reports" && (
          <section className="lux-fade">
            <div className="lux-panel rounded-3xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                <button
                  onClick={() => setActiveView("dashboard")}
                  className="h-9 w-9 grid place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold text-white">Reports</h2>
              </div>
              <div className="px-3 pb-5">
                <ChartsDashboard leads={leads} />
              </div>
            </div>
          </section>
        )}

        {/* ── SETTINGS ── */}
        {activeView === "settings" && (
          <section className="lux-fade">
            <div className="lux-panel rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveView("dashboard")}
                  className="h-9 w-9 grid place-items-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold text-white">Settings</h2>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-300">Filters</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
                  >
                    <option value="all">All Status</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Client">Client</option>
                  </select>
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
                  >
                    <option value="all">All Sources</option>
                    <option value="manual">Manual</option>
                    <option value="swipe-pages">Swipe Pages</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-300">Data</p>
                <CSVImporter onImport={handleCSVImport} existingLeads={leads} />
                <Button
                  onClick={handleCopyEmails}
                  variant="outline"
                  className="w-full border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800 h-11 rounded-xl"
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy Visible Emails
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-300 mb-3">Integrations</p>
                {[
                  ["Swipe Pages", "Webhook ready"],
                  ["Quo", "Phone matching ready"],
                  ["QuickBooks", "Receipt queue ready"],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-xs text-emerald-400">{val}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSignOut}
                variant="outline"
                className="h-12 w-full rounded-xl border-slate-700/60 bg-slate-950/60 text-slate-300 hover:bg-slate-800"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/80 bg-[#03101f]/96 px-4 pb-5 pt-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-1">
          {bottomNav.map(({ key, label, icon: Icon, center }) => (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition ${
                activeView === key ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <span
                className={
                  center
                    ? "-mt-7 grid h-14 w-14 place-items-center rounded-full bg-blue-600 text-white shadow-[0_12px_36px_rgba(37,99,235,.5)]"
                    : ""
                }
              >
                <Icon className={center ? "h-8 w-8" : "h-6 w-6"} />
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Index;
