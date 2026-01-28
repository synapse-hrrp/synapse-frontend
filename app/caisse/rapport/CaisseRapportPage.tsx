//app/caisse/CaisseRapportPage.tsx
"use client";

import { useState } from "react";
import { AbilityGuard } from "@/lib/authz";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import StatsPanel from "./components/StatsPanel";
import PaymentsPanel from "./components/PaymentsPanel";

export default function CaisseRapportPage() {
  const [tab, setTab] = useState<"stats" | "payments">("stats");

  return (
    <AbilityGuard anyOf={["caisse.report.view"]}>
      <div className="min-h-screen bg-slate-50">
        <TopIdentityBar />
        <SiteHeader
          title="Rapport de caisse"
          subtitle="Pilotage DG • Statistiques & journal des transactions"
        />

        <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
          <div className="flex gap-2 border-b">
            <TabButton active={tab === "stats"} onClick={() => setTab("stats")}>
              📊 Statistiques
            </TabButton>
            <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>
              📋 Transactions
            </TabButton>
          </div>

          {tab === "stats" ? <StatsPanel /> : <PaymentsPanel />}
        </main>

        <SiteFooter />
      </div>
    </AbilityGuard>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
        active
          ? "border-congo-green text-congo-green"
          : "border-transparent text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}
