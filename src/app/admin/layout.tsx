'use client';

import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      {/* 1. Admin Sidebar (Black/Gold theme to differentiate from App) */}
      <aside className="w-64 bg-slate-950 text-white flex-shrink-0 hidden md:flex flex-col border-r border-slate-800">
        <div className="p-6 font-bold text-xl tracking-wider flex items-center gap-2">
            <div className="h-8 w-8 bg-amber-500 rounded-lg flex items-center justify-center text-black">
                <span className="font-bold">K</span>
            </div>
          <span>KLARO<span className="text-amber-500">ADMIN</span></span>
        </div>
        <Sidebar />
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        {/* 3. The Scrollable Dashboard */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
