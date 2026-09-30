import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Users, GraduationCap, UserCog, UsersRound, ClipboardList,
  Utensils, Megaphone, CalendarRange, ArrowRightLeft, LogOut, Menu as MenuIcon, X, ChevronDown, Heart,
  BookOpen, Sparkles, Building2, Scan, Image as ImageIcon, CalendarDays, Inbox, NotebookPen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

// Menu grouped by frequency of use. Each group is collapsible.
// `admin: true` hides the item for non-admin roles.
const NAV_GROUPS = [
  {
    key: "oggi",
    label: "Oggi",
    defaultOpen: true,
    items: [
      { to: "/s", icon: Home, label: "Dashboard", end: true },
      { to: "/s/presenze", icon: Scan, label: "Presenze" },
      { to: "/s/diario", icon: NotebookPen, label: "Diario" },
    ],
  },
  {
    key: "anagrafiche",
    label: "Anagrafiche",
    items: [
      { to: "/s/alunni", icon: GraduationCap, label: "Alunni" },
      { to: "/s/sezioni", icon: Users, label: "Sezioni" },
      { to: "/s/genitori", icon: UsersRound, label: "Genitori" },
      { to: "/s/maestre", icon: UserCog, label: "Maestre", admin: true },
    ],
  },
  {
    key: "vita",
    label: "Vita scolastica",
    items: [
      { to: "/s/piano", icon: BookOpen, label: "Piano didattico" },
      { to: "/s/laboratori", icon: Sparkles, label: "Laboratori" },
      { to: "/s/comunicazioni", icon: Megaphone, label: "Comunicazioni" },
      { to: "/s/eventi", icon: CalendarDays, label: "Festività & Chiusure" },
      { to: "/s/galleria", icon: ImageIcon, label: "Galleria" },
    ],
  },
  {
    key: "gestione",
    label: "Gestione",
    admin: true,
    items: [
      { to: "/s/iscrizioni", icon: Inbox, label: "Iscrizioni", admin: true },
      { to: "/s/menu-mensa", icon: Utensils, label: "Menu mensa", admin: true },
      { to: "/s/scuola", icon: Building2, label: "Profilo scuola", admin: true },
      { to: "/s/anni", icon: CalendarRange, label: "Anni scolastici", admin: true },
      { to: "/s/passaggio-anno", icon: ArrowRightLeft, label: "Passaggio anno", admin: true, danger: true },
    ],
  },
];

// Bottom nav for mobile: 4 quick actions + "Altro" that opens the drawer
const MOBILE_QUICK = [
  { to: "/s", icon: Home, label: "Home", end: true },
  { to: "/s/presenze", icon: Scan, label: "Presenze" },
  { to: "/s/diario", icon: NotebookPen, label: "Diario" },
  { to: "/s/alunni", icon: GraduationCap, label: "Alunni" },
];

// Which group contains a given path
function groupOfPath(pathname) {
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      if (it.end ? pathname === it.to : pathname.startsWith(it.to)) return g.key;
    }
  }
  return null;
}

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

  const filteredGroups = NAV_GROUPS
    .filter((g) => !g.admin || user?.role === "admin")
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !it.admin || user?.role === "admin"),
    }))
    .filter((g) => g.items.length > 0);

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
              {user?.tenant?.logo_base64 ? (
                <img src={`data:image/png;base64,${user.tenant.logo_base64}`} alt={user.tenant.name} className="h-9 w-9 rounded-2xl object-cover shadow-sm"/>
              ) : (
                <span className="h-9 w-9 rounded-2xl bg-[#FF8C6B] flex items-center justify-center shadow-sm">
                  <Heart className="h-4 w-4 text-white" fill="white" />
                </span>
              )}
              <span className="hidden sm:flex flex-col leading-tight">
                <span className="text-[15px] truncate max-w-[180px]" data-testid="staff-tenant-name">{user?.tenant?.name || "nido."}</span>
                <span className="text-[10px] font-normal text-stone-500 -mt-0.5">powered by nido<span className="text-brand">.</span></span>
              </span>
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
          <SideNav groups={filteredGroups} pathname={loc.pathname} />
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
                className="fixed inset-y-0 left-0 z-50 w-72 bg-white p-5 md:hidden flex flex-col rounded-r-[2rem] shadow-2xl overflow-y-auto"
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
                <SideNav groups={filteredGroups} pathname={loc.pathname} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="min-w-0 pb-20 md:pb-0">
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

      {/* Bottom navigation (mobile only) */}
      <BottomNav pathname={loc.pathname} onOpenMore={() => setOpen(true)} />
    </div>
  );
}

function BottomNav({ pathname, onOpenMore }) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      data-testid="mobile-bottom-nav"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-5 h-16">
        {MOBILE_QUICK.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
                isActive ? "text-[#FF7A54]" : "text-stone-500 hover:text-stone-800"
              }`
            }
            data-testid={`bnav-${n.label.toLowerCase()}`}
          >
            <n.icon className="h-5 w-5" />
            <span>{n.label}</span>
          </NavLink>
        ))}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-stone-500 hover:text-stone-800"
          data-testid="bnav-more"
        >
          <MenuIcon className="h-5 w-5" />
          <span>Altro</span>
        </button>
      </div>
    </nav>
  );
}

function SideNav({ groups, pathname }) {
  const activeGroup = groupOfPath(pathname);
  // Restore state from localStorage, default from group config, and always open the active group
  const [openMap, setOpenMap] = useState(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("nav_groups_open") || "{}"); } catch (_) {}
    const map = {};
    groups.forEach((g) => {
      map[g.key] = saved[g.key] !== undefined ? saved[g.key] : !!g.defaultOpen;
    });
    return map;
  });

  useEffect(() => {
    if (activeGroup && !openMap[activeGroup]) {
      setOpenMap((m) => ({ ...m, [activeGroup]: true }));
    }
    // eslint-disable-next-line
  }, [activeGroup]);

  useEffect(() => {
    localStorage.setItem("nav_groups_open", JSON.stringify(openMap));
  }, [openMap]);

  const toggle = (key) => setOpenMap((m) => ({ ...m, [key]: !m[key] }));

  return (
    <nav className="space-y-1">
      {groups.map((g) => {
        const isOpen = !!openMap[g.key];
        return (
          <div key={g.key} className="mb-1">
            <button
              onClick={() => toggle(g.key)}
              className="w-full flex items-center justify-between h-9 px-3 rounded-xl text-[10px] uppercase tracking-[.14em] font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
              data-testid={`nav-group-${g.key}`}
              aria-expanded={isOpen}
            >
              <span>{g.label}</span>
              <motion.span animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.18 }}>
                <ChevronDown className="h-3.5 w-3.5" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 pt-1 pb-1">
                    {g.items.map((n) => (
                      <NavLink
                        key={n.to}
                        to={n.to}
                        end={n.end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 h-11 px-4 rounded-2xl text-sm font-semibold transition-all ${
                            isActive
                              ? "bg-[#FFF3EF] text-[#FF7A54] shadow-sm"
                              : n.danger
                                ? "text-rose-700 hover:bg-rose-50"
                                : "text-stone-700 hover:bg-stone-100"
                          }`
                        }
                        data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <n.icon className="h-[18px] w-[18px]" />
                        <span className="truncate">{n.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
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
