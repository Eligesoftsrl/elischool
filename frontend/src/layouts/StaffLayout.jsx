import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Users, GraduationCap, UserCog, UsersRound, ClipboardList,
  Utensils, Megaphone, CalendarRange, ArrowRightLeft, LogOut, Menu as MenuIcon, X, ChevronDown, Heart,
  BookOpen, Sparkles, Building2, Scan, Image as ImageIcon, CalendarDays,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

const NAV = [
  { to: "/s", icon: Home, label: "Dashboard", end: true },
  { to: "/s/presenze", icon: Scan, label: "Presenze" },
  { to: "/s/attivita", icon: ClipboardList, label: "Attività" },
  { to: "/s/alunni", icon: GraduationCap, label: "Alunni" },
  { to: "/s/sezioni", icon: Users, label: "Sezioni" },
  { to: "/s/piano", icon: BookOpen, label: "Piano didattico" },
  { to: "/s/laboratori", icon: Sparkles, label: "Laboratori" },
  { to: "/s/comunicazioni", icon: Megaphone, label: "Comunicazioni" },
  { to: "/s/eventi", icon: CalendarDays, label: "Eventi" },
  { to: "/s/galleria", icon: ImageIcon, label: "Galleria" },
  { to: "/s/menu", icon: Utensils, label: "Menu" },
  { to: "/s/genitori", icon: UsersRound, label: "Genitori" },
  { to: "/s/maestre", icon: UserCog, label: "Maestre", admin: true },
  { to: "/s/scuola", icon: Building2, label: "Profilo Scuola", admin: true },
  { to: "/s/anni", icon: CalendarRange, label: "Anni scolastici", admin: true },
  { to: "/s/passaggio-anno", icon: ArrowRightLeft, label: "Passaggio anno", admin: true },
];

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [years, setYears] = useState([]);
  const [activeYear, setActiveYear] = useState(null);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/school-years");
        setYears(data);
        const active = data.find((y) => y.is_active) || data[0];
        setActiveYear(active);
        if (active) localStorage.setItem("active_year_id", active.id);
      } catch (_) {}
    })();
  }, []);

  const onSwitchYear = async (y) => {
    setActiveYear(y);
    localStorage.setItem("active_year_id", y.id);
    window.dispatchEvent(new CustomEvent("active-year-changed", { detail: y }));
  };

  const filteredNav = NAV.filter((n) => !n.admin || user?.role === "admin");

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Top bar */}
      <header className="glass sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden h-11 w-11 rounded-2xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center"
              onClick={() => setOpen(true)}
              data-testid="staff-menu-toggle"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <Link to="/s" className="flex items-center gap-2 font-display font-bold text-stone-900">
              <span className="h-9 w-9 rounded-2xl bg-[#FF8C6B] flex items-center justify-center shadow-sm">
                <Heart className="h-4 w-4 text-white" fill="white" />
              </span>
              <span className="hidden sm:block">nido<span className="text-brand">.</span></span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <YearSwitcher years={years} active={activeYear} onChange={onSwitchYear} />
            <UserMenu user={user} onLogout={async () => { await logout(); nav("/login"); }} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 grid md:grid-cols-[240px_1fr] gap-8">
        {/* Side nav (desktop) */}
        <aside className="hidden md:block sticky top-24 self-start">
          <SideNav nav={filteredNav} />
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-stone-900/40 z-50 md:hidden"
                onClick={() => setOpen(false)}
              />
              <motion.aside
                key="drawer"
                initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
                transition={{ type: "spring", damping: 26, stiffness: 240 }}
                className="fixed inset-y-0 left-0 z-50 w-72 bg-white p-5 md:hidden flex flex-col rounded-r-[2rem] shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="font-display font-bold text-lg">Menu</span>
                  <button
                    onClick={() => setOpen(false)}
                    className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <SideNav nav={filteredNav} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="min-w-0">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Outlet context={{ activeYear, years }} />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function SideNav({ nav }) {
  return (
    <nav className="space-y-1">
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) =>
            `flex items-center gap-3 h-12 px-4 rounded-2xl text-sm font-semibold transition-all ${
              isActive
                ? "bg-[#FFF3EF] text-[#FF7A54] shadow-sm"
                : "text-stone-700 hover:bg-stone-100"
            }`
          }
          data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <n.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

function YearSwitcher({ years, active, onChange }) {
  const [open, setOpen] = useState(false);
  if (!active) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-11 px-3 md:px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 flex items-center gap-2 text-sm font-semibold"
        data-testid="year-switcher-button"
      >
        <CalendarRange className="h-4 w-4 text-stone-500" />
        <span className="hidden sm:inline">A.S. {active.label}</span>
        <span className="sm:hidden">{active.label}</span>
        <ChevronDown className="h-4 w-4 text-stone-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-stone-200 shadow-xl p-2 z-40">
            {years.map((y) => (
              <button
                key={y.id}
                onClick={() => { onChange(y); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium hover:bg-stone-100 ${active.id === y.id ? "text-brand bg-[#FFF3EF]" : "text-stone-700"}`}
                data-testid={`year-option-${y.label.replace("/", "-")}`}
              >
                {y.label} {y.is_active && <span className="ml-1 text-[10px] uppercase font-bold text-emerald-600">attivo</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const initials = ((user.first_name?.[0] || "") + (user.last_name?.[0] || "")).toUpperCase() || "?";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-11 px-1.5 pr-3 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 flex items-center gap-2 text-sm font-semibold"
        data-testid="user-menu-button"
      >
        <span className="h-8 w-8 rounded-xl bg-stone-900 text-white text-xs font-bold flex items-center justify-center">{initials}</span>
        <span className="hidden md:inline text-stone-700">{user.first_name}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-stone-200 shadow-xl p-2 z-40">
            <div className="px-3 py-2 text-xs">
              <p className="font-bold text-stone-800">{user.name}</p>
              <p className="text-stone-500">{user.email}</p>
              <p className="mt-1 inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 capitalize">{user.role}</p>
            </div>
            <button
              onClick={onLogout}
              className="w-full mt-1 text-left px-3 py-2 rounded-xl text-sm font-medium hover:bg-rose-50 text-rose-600 flex items-center gap-2"
              data-testid="user-menu-logout"
            >
              <LogOut className="h-4 w-4" /> Esci
            </button>
          </div>
        </>
      )}
    </div>
  );
}
