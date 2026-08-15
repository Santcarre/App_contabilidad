"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Header onMenuClick={() => setMobileOpen(true)} />
      <main className="lg:ml-64 p-3 sm:p-4 lg:p-6 transition-all duration-200 min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
