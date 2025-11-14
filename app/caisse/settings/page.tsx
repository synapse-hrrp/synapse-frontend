// app/caisse/settings/page.tsx
"use client";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { AbilityGuard } from "@/lib/authz";
import { useEffect, useState } from "react";

export default function CashSettingsPage() {
  const [ws, setWs] = useState("POS-01");

  useEffect(() => {
    const cur = localStorage.getItem("cash:workstation");
    if (cur) setWs(cur);
  }, []);

  function save() {
    localStorage.setItem("cash:workstation", ws.trim() || "POS-01");
    alert("Poste enregistré.");
  }

  return (
    <AbilityGuard anyOf={["caisse.access"]}>
      <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white">
        <TopIdentityBar />
        <SiteHeader title="Paramètres Caisse" subtitle="Workstation & préférences" />
        <main className="mx-auto max-w-3xl px-4 py-8 space-y-4">
          <label className="block text-sm">
            <span className="text-ink-700">Nom du poste (X-Workstation)</span>
            <input
              value={ws}
              onChange={(e) => setWs(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2"
              placeholder="POS-01"
            />
          </label>
          <button onClick={save} className="rounded-lg bg-congo-green text-white px-4 py-2">
            Enregistrer
          </button>
        </main>
        <SiteFooter />
      </div>
    </AbilityGuard>
  );
}
