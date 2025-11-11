"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getDeclarationNaissance } from "@/lib/api";

type Decl = {
  id: string;
  mere_id: string;
  service_slug?: string | null;
  bebe_nom?: string | null;
  bebe_prenom?: string | null;
  pere_nom?: string | null;
  pere_prenom?: string | null;
  date_heure_naissance?: string | null;
  lieu_naissance?: string | null;
  sexe?: "M" | "F" | "I" | null;
  poids_kg?: number | string | null;
  taille_cm?: number | string | null;
  numero_acte?: string | null;
  officier_etat_civil?: string | null;
  documents_json?: any | null;
  statut: "brouillon" | "valide" | "transmis";
  date_transmission?: string | null;
  prix?: number | string | null;
  devise?: string | null;
};

export default function DeclarationShowPage({ params }: { params: { id: string } }) {
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/gestion-malade/declarations-naissance/${params.id}`); return; }
    me().catch(() => window.location.replace(`/login?next=/gestion-malade/declarations-naissance/${params.id}`));
  }, [params.id]);

  const [item, setItem] = useState<Decl | null>(null);

  useEffect(() => {
    (async () => {
      try { setItem(await getDeclarationNaissance(params.id)); } catch {}
    })();
  }, [params.id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Détail déclaration de naissance" subtitle="État civil — maternité" />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Gestion — Malade</li><li aria-hidden>/</li>
            <li>Déclarations de naissance</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">{params.id}</li>
          </ol>
        </nav>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          {!item ? <p>Chargement…</p> : (
            <div className="space-y-2 text-sm">
              <div><b>Mère ID :</b> {item.mere_id}</div>
              <div><b>Service :</b> {item.service_slug || "—"}</div>
              <div><b>Bébé :</b> {[(item.bebe_prenom||""),(item.bebe_nom||"")].filter(Boolean).join(" ") || "—"}</div>
              <div><b>Père :</b> {[(item.pere_prenom||""),(item.pere_nom||"")].filter(Boolean).join(" ") || "—"}</div>
              <div><b>Date/heure :</b> {item.date_heure_naissance ? new Date(item.date_heure_naissance).toLocaleString() : "—"}</div>
              <div><b>Lieu :</b> {item.lieu_naissance || "—"}</div>
              <div><b>Sexe :</b> {item.sexe || "—"}</div>
              <div><b>Poids (kg) / Taille (cm) :</b> {(item.poids_kg ?? "—") + " / " + (item.taille_cm ?? "—")}</div>
              <div><b>Numéro d'acte :</b> {item.numero_acte || "—"}</div>
              <div><b>Officier état civil :</b> {item.officier_etat_civil || "—"}</div>
              <div><b>Documents (JSON) :</b> <pre className="whitespace-pre-wrap">{item.documents_json ? JSON.stringify(item.documents_json, null, 2) : "—"}</pre></div>
              <div><b>Statut :</b> {item.statut}</div>
              <div><b>Date de transmission :</b> {item.date_transmission ? new Date(item.date_transmission).toLocaleString() : "—"}</div>
              <div><b>Tarif :</b> {item.prix ?? "—"} {item.devise || ""}</div>

              <div className="pt-3">
                <Link href={`/gestion-malade/declarations-naissance/${params.id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">Modifier</Link>
                <Link href="/gestion-malade/declarations-naissance" className="ml-2 text-xs text-congo-green hover:underline">← Retour à la liste</Link>
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
