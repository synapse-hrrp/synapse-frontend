// app/medecins/[id]/edit/page.tsx — Édition
"use client";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MedecinFormPro from "@/components/MedecinFormPro";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function EditMedecinPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Modifier la fiche médecin" subtitle="Mettre à jour les informations" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/medecin" className="hover:underline">Médecins</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Modifier</li>
            </ol>
          </nav>
          <Link href={`/medecin/${id}`} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Annuler
          </Link>
        </div>

        <MedecinFormPro medecinId={id} afterSavePath={`/medecin/${id}`} />
      </main>
      <SiteFooter />
    </div>
  );
}
