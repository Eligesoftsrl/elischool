import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, Utensils, Newspaper, LogOut, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { to: "/g", icon: Home, label: "Oggi", end: true },
  { to: "/g/timeline", icon: Calendar, label: "Timeline" },
  { to: "/g/menu", icon: Utensils, label: "Menu" },
  { to: "/g/news", icon: Newspaper, label: "News" },
];

export default function ParentLayout() {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex justify-center">
      <div className="w-full max-w-lg flex flex-col min-h-screen relative pb-24">
        {/* Top header */}
        <header className="glass sticky top-0 z-30">
          <div className="px-5 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-2xl bg-[#FF8C6B] flex items-center justify-center shadow-sm">
                <Heart className="h-4 w-4 text-white" fill="white" />
              </span>
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Ciao</p>
                <p className="text-sm font-bold text-stone-800">{user?.first_name || "Genitore"}</p>
              </div>
            </div>
            <button
              onClick={async () => { await logout(); nav("/login"); }}
              className="h-10 w-10 rounded-2xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600"
              data-testid="parent-logout-button"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <motion.main
          key={loc.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 px-5 py-6"
        >
          <Outlet />
        </motion.main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 inset-x-0 mx-auto max-w-lg z-40 px-4 pb-3">
          <div className="glass rounded-3xl px-2 py-2 flex justify-around items-center border border-stone-200 tactile">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl text-[11px] font-semibold transition-all ${
                    isActive ? "text-[#FF7A54]" : "text-stone-500"
                  }`
                }
                data-testid={`parent-nav-${n.label.toLowerCase()}`}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="parent-nav-pill"
                        className="absolute inset-0 bg-[#FFF3EF] rounded-2xl -z-10"
                        transition={{ type: "spring", stiffness: 300, damping: 26 }}
                      />
                    )}
                    <n.icon className="h-5 w-5" />
                    <span>{n.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
