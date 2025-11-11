"use client";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function GestionMaladeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Gestion — Malade"
        subtitle="Mouvements, hospitalisations, billets de sortie et déclarations de naissance"
      />
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
      <SiteFooter />
    </div>
  );
}
