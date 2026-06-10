import { useState } from "react";
import { Search, Bell, Clock, Contact, Mail, Users, BarChart3, Camera, Filter, Truck } from "lucide-react";

export default function PalletProsCRM() {
  const [clockedIn, setClockedIn] = useState(false);
  const [active, setActive] = useState("leads");

  const nav = [
    { id: "clock", label: clockedIn ? "Clock Out" : "Clock In", icon: Clock },
    { id: "contacts", label: "Contacts", icon: Contact },
    { id: "email", label: "Email", icon: Mail },
    { id: "leads", label: "Leads", icon: Users },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];

  const leads = [
    ["Sarah Johnson", "Marketing Director, Acme Corp.", "Contacted", "$15k"],
    ["Michael Chen", "Operations Manager, Global Logistics", "Demo Done", "$28k"],
    ["Olivia Brown", "Founder, Fresh Startups Inc.", "Meeting Set", "$5k"],
    ["Robert Davis", "Procurement Lead, City Materials", "Nurturing", "$10k"],
  ];

  return (
    <div className="min-h-screen bg-[#061522] text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-gradient-to-b from-[#102536] via-[#071827] to-[#04101b] relative overflow-hidden pb-28">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-400/20 blur-3xl rounded-full" />
        <div className="absolute top-64 -left-20 w-56 h-56 bg-blue-500/20 blur-3xl rounded-full" />

        <header className="relative z-10 px-5 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Pallet Pros CRM</h1>
            <p className="text-sm text-slate-300">Optimized for iOS/Android</p>
          </div>

          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-cyan-200" />
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-orange-700 border border-white/20" />
            <div className="relative">
              <Bell className="w-6 h-6 text-cyan-200" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            </div>
          </div>
        </header>

        <main className="relative z-10 px-5 space-y-4">
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Hi, Sarah W.!</h2>
                <p className="text-sm text-slate-300">Manage your pallet inventory & clients.</p>
              </div>

              <div className="w-14 h-14 rounded-full bg-slate-800 border border-cyan-400/30" />
            </div>

            <div className="mt-4 flex gap-2">
              <div className="flex-1 h-12 rounded-xl bg-[#0b2133]/90 border border-cyan-300/20 flex items-center px-4">
                <Search className="w-5 h-5 text-slate-400 mr-2" />
                <span className="text-sm text-slate-400">Search pallets, clients, or orders...</span>
              </div>

              <button className="w-20 rounded-xl bg-[#0b2133] border border-cyan-300/20 flex flex-col items-center justify-center text-[10px] text-cyan-100">
                <Camera className="w-5 h-5 mb-1" />
                Scan
              </button>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Card title="Total Leads" value="125" note="+5.1% ▲ 6 new" />
            <Card title="In Progress" value="88" note="Contacted 65%" />
            <Card title="New Orders" value="12 Orders" note="3 pending" />
            <Card title="Top Sources" value="LinkedIn" note="45% of leads" />
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold tracking-wider text-slate-300">RECENT LEADS</h3>
            </div>

            <div className="flex gap-2 mb-3">
              <div className="flex-1 h-11 rounded-xl bg-[#0b2133]/90 border border-cyan-300/20 flex items-center px-3">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <span className="text-sm text-slate-400">Search Leads</span>
              </div>

              <button className="h-11 px-4 rounded-xl bg-[#0b2133] border border-cyan-300/20 flex items-center gap-2 text-sm">
                Filters <Filter className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {leads.map(([name, role, status, value], i) => (
                <div
                  key={name}
                  className="rounded-2xl bg-[#0b2133]/90 border border-cyan-300/20 p-3 flex items-center gap-3 shadow-lg"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-300 to-blue-700 grid place-items-center font-bold">
                    {name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold truncate">{name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/30 text-cyan-200">{status}</span>
                    </div>
                    <p className="text-xs text-slate-300 truncate">{role}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">Potential</p>
                    <p className="text-sm font-bold">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#081928]/95 backdrop-blur-xl border-t border-cyan-300/20 rounded-t-3xl px-3 py-3 z-50">
          <div className="grid grid-cols-5 gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "clock") setClockedIn(!clockedIn);
                    setActive(item.id);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-xs transition ${
                    isActive ? "bg-cyan-400/15 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,.25)]" : "text-slate-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function Card({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl bg-[#0b2133]/90 border border-cyan-300/20 p-4 shadow-lg">
      <p className="text-sm text-slate-300">{title}</p>
      <h3 className="text-2xl font-black mt-1">{value}</h3>
      <p className="text-xs text-cyan-300 mt-1">{note}</p>
    </div>
  );
}
