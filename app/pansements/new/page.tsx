"use client";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PansementFormPro from "@/components/PansementFormPro";

export default function NewPansementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Nouveau pansement" subtitle="Enregistrer un soin" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-6 text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Portail</li><li aria-hidden>/</li><li>Pansements</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Nouveau</li>
          </ol>
        </nav>
        <PansementFormPro />
      </main>
      <SiteFooter />
    </div>
  );
}
