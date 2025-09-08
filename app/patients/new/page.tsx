// app/patients/new/page.tsx
"use client";

import { useEffect } from "react";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PatientFormPro from "@/components/PatientFormPro";
import { getToken, me } from "@/lib/api";

export default function NewPatientPage() {
  // Garde (Option A)
  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.replace("/login?next=/patients/new");
      return;
    }
    me().catch(() => window.location.replace("/login?next=/patients/new"));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Nouveau patient"
        subtitle="Créer un dossier et orienter le patient"
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-6 text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Portail</li>
            <li aria-hidden>/</li>
            <li>Admissions</li>
            <li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Nouveau patient</li>
          </ol>
        </nav>

        <PatientFormPro />
      </main>

      <SiteFooter />
    </div>
  );
}
