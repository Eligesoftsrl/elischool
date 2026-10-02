import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Shield, Building2, LogOut, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900">
      <header className="sticky top-0 z-40 backdrop-blur bg-white/80 border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/superadmin" className="flex items-center gap-2 font-display font-bold">
            <span className="h-9 w-9 rounded-2xl bg-[#FF8C6B] flex items-center justify-center shadow-sm">
              <Heart className="h-4 w-4 text-white" fill="white" />
            </span>
            <span className="text-stone-900 flex items-center gap-1">
              nido<span className="text-[#FF8C6B]">.</span>
              <span className="ml-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                <Shield className="h-3 w-3" /> Superadmin
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <NavLink
              to="/superadmin" end
              className={({ isActive }) =>
                `h-10 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2 transition-colors ${
                  isActive ? "bg-[#FF8C6B] text-white shadow-sm" : "text-stone-700 hover:bg-stone-100"
                }`
              }
              data-testid="sa-nav-tenants"
            >
              <Building2 className="h-4 w-4" /> Scuole
            </NavLink>
            <button
              onClick={async () => { await logout(); nav("/login"); }}
              className="h-10 px-3 rounded-2xl text-sm font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
              data-testid="sa-logout"
            >
              <LogOut className="h-4 w-4" /> Esci
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-5 pb-2 text-[11px] text-stone-500">
          Connesso come <b className="text-stone-700">{user?.email}</b> · area riservata
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-8 pb-24"><Outlet /></main>
    </div>
  );
}
