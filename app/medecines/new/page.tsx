// app/medecines/new/page.tsx
"use client";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MedecineFormPro from "@/components/MedecineFormPro";

export default function NewMedecinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Nouvel acte médical"
        subtitle="Créer un enregistrement de médecine"
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-6 text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Portail</li><li aria-hidden>/</li>
            <li>Médecine</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Nouveau</li>
          </ol>
        </nav>

        <MedecineFormPro afterSavePath="/medecines" />
      </main>
      <SiteFooter />
    </div>
  );
}
