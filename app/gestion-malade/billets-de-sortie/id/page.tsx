"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getBilletSortie } from "@/lib/api";

type Billet = {
  id: string;
  patient_id: string;
  service_slug?: string | null;
  motif_sortie?: string | null;
  diagnostic_sortie?: string | null;
  resume_clinique?: string | null;
  consignes?: string | null;
  traitement_sortie_json?: any | null;
  rdv_controle_at?: string | null;
  destination?: string | null;
  date_sortie_effective?: string | null;
  statut: "brouillon" | "valide" | "remis";
  prix?: number | string | null;
  devise?: string | null;
};

export default function BilletShowPage({ params }: { params: { id: string } }) {
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/gestion-malade/billets-de-sortie/${params.id}`); return; }
    me().catch(() => window.location.replace(`/login?next=/gestion-malade/billets-de-sortie/${params.id}`));
  }, [params.id]);

  const [item, setItem] = useState<Billet | null>(null);

  useEffect(() => {
    (async () => {
      try { setItem(await getBilletSortie(params.id)); } catch {}
    })();
  }, [params.id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Détail billet de sortie" subtitle="Résumé clinique & consignes" />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Gestion — Malade</li><li aria-hidden>/</li>
            <li>Billets de sortie</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">{params.id}</li>
          </ol>
        </nav>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          {!item ? <p>Chargement…</p> : (
            <div className="space-y-2 text-sm">
              <div><b>Patient ID :</b> {item.patient_id}</div>
              <div><b>Service :</b> {item.service_slug || "—"}</div>
              <div><b>Statut :</b> {item.statut}</div>
              <div><b>Motif de sortie :</b> {item.motif_sortie || "—"}</div>
              <div><b>Diagnostic de sortie :</b> <pre className="whitespace-pre-wrap">{item.diagnostic_sortie || "—"}</pre></div>
              <div><b>Résumé clinique :</b> <pre className="whitespace-pre-wrap">{item.resume_clinique || "—"}</pre></div>
              <div><b>Consignes :</b> <pre className="whitespace-pre-wrap">{item.consignes || "—"}</pre></div>
              <div><b>Traitement (JSON) :</b> <pre className="whitespace-pre-wrap">{item.traitement_sortie_json ? JSON.stringify(item.traitement_sortie_json, null, 2) : "—"}</pre></div>
              <div><b>RDV contrôle :</b> {item.rdv_controle_at ? new Date(item.rdv_controle_at).toLocaleString() : "—"}</div>
              <div><b>Destination :</b> {item.destination || "—"}</div>
              <div><b>Sortie effective :</b> {item.date_sortie_effective ? new Date(item.date_sortie_effective).toLocaleString() : "—"}</div>
              <div><b>Tarif :</b> {item.prix ?? "—"} {item.devise || ""}</div>

              <div className="pt-3">
                <Link href={`/gestion-malade/billets-de-sortie/${params.id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">Modifier</Link>
                <Link href="/gestion-malade/billets-de-sortie" className="ml-2 text-xs text-congo-green hover:underline">← Retour à la liste</Link>
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
