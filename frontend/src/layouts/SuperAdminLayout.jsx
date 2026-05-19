import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Shield, Building2, LogOut, Plus, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-[#0f0e0c] text-stone-200">
      <header className="sticky top-0 z-40 backdrop-blur bg-black/60 border-b border-stone-800">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/superadmin" className="flex items-center gap-2 font-display font-bold">
            <span className="h-9 w-9 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center">
              <Shield className="h-4 w-4 text-stone-900" />
            </span>
            <span className="text-stone-100">superadmin<span className="text-amber-400">.</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <NavLink to="/superadmin" end className={({isActive})=>`h-10 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2 ${isActive?"bg-amber-400 text-stone-900":"text-stone-300 hover:bg-stone-800"}`} data-testid="sa-nav-tenants">
              <Building2 className="h-4 w-4"/> Scuole
            </NavLink>
            <button onClick={async()=>{await logout(); nav("/login");}} className="h-10 px-3 rounded-2xl text-sm font-semibold text-rose-400 hover:bg-stone-800 flex items-center gap-1.5" data-testid="sa-logout">
              <LogOut className="h-4 w-4"/> Esci
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-5 pb-2 text-[11px] text-stone-500">
          Connesso come <b className="text-stone-300">{user?.email}</b> · area riservata
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-10"><Outlet/></main>
    </div>
  );
}
