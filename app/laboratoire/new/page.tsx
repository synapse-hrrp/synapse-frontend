"use client";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LaboratoireFormPro from "@/components/LaboratoireFormPro";

export default function NewLaboratoirePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Nouvel examen labo" subtitle="Prescrire un test et (optionnel) saisir un résultat" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-6 text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Portail</li><li aria-hidden>/</li><li>Laboratoire</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Nouvel examen</li>
          </ol>
        </nav>
        <LaboratoireFormPro />
      </main>
      <SiteFooter />
    </div>
  );
}
