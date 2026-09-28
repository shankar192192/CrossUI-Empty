"use client";

import { useState } from "react";
import { Menu, GraduationCap } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function DashboardShell({
  userName,
  role,
  children,
}: {
  userName: string;
  role: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userName={userName} role={role} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile-only top bar — the desktop sidebar is always visible above md, so this is hidden there. */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-2 h-14 px-4 bg-slate-900 text-white shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-800"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm">PrepSeven CRM</span>
        </div>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
