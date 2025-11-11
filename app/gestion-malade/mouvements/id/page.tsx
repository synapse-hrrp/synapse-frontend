"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getGestionMalade } from "@/lib/api";

type GestionMaladeDTO = {
  id: string;
  patient_id: string;
  date_acte?: string;
  type_action: "admission"|"transfert"|"hospitalisation"|"sortie";
  service_source?: string|null;
  service_destination?: string|null;
  pavillon?: string|null;
  chambre?: string|null;
  lit?: string|null;
  date_entree?: string|null;
  date_sortie_prevue?: string|null;
  date_sortie_effective?: string|null;
  motif?: string|null;
  diagnostic?: string|null;
  examen_clinique?: string|null;
  traitements?: string|null;
  observation?: string|null;
  statut: "en_cours"|"clos"|"annule";
  patient?: { nom?: string; prenom?: string; numero_dossier?: string };
};

export default function MouvementShowPage({ params }: { params: { id: string } }) {
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/gestion-malade/mouvements/${params.id}`); return; }
    me().catch(() => window.location.replace(`/login?next=/gestion-malade/mouvements/${params.id}`));
  }, [params.id]);

  const [item, setItem] = useState<GestionMaladeDTO | null>(null);

  useEffect(() => {
    (async () => {
      try { setItem(await getGestionMalade(params.id)); } catch {}
    })();
  }, [params.id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Détail mouvement" subtitle="Gestion de malade" />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Gestion — Malade</li><li aria-hidden>/</li>
            <li>Mouvements</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">{params.id}</li>
          </ol>
        </nav>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          {!item ? <p>Chargement…</p> : (
            <div className="space-y-2 text-sm">
              <div><b>Patient :</b> {item.patient ? `${item.patient.nom ?? ""} ${item.patient.prenom ?? ""}`.trim() : item.patient_id} <span className="text-ink-500">({item.patient?.numero_dossier || "—"})</span></div>
              <div><b>Date de l’acte :</b> {item.date_acte ? new Date(item.date_acte).toLocaleString() : "—"}</div>
              <div><b>Type d’action :</b> {item.type_action}</div>
              <div><b>Statut :</b> {item.statut}</div>
              <div><b>Service source → destination :</b> {(item.service_source || "—") + " → " + (item.service_destination || "—")}</div>
              <div><b>Pavillon / Chambre / Lit :</b> {[item.pavillon, item.chambre, item.lit].filter(Boolean).join(" / ") || "—"}</div>
              <div><b>Dates :</b> entrée {item.date_entree ? new Date(item.date_entree).toLocaleString() : "—"} • sortie prévue {item.date_sortie_prevue ? new Date(item.date_sortie_prevue).toLocaleString() : "—"} • sortie effective {item.date_sortie_effective ? new Date(item.date_sortie_effective).toLocaleString() : "—"}</div>
              <div><b>Motif :</b> {item.motif || "—"}</div>
              <div><b>Diagnostic :</b> {item.diagnostic || "—"}</div>
              <div><b>Examen clinique :</b> <pre className="whitespace-pre-wrap">{item.examen_clinique || "—"}</pre></div>
              <div><b>Traitements :</b> <pre className="whitespace-pre-wrap">{item.traitements || "—"}</pre></div>
              <div><b>Observation :</b> <pre className="whitespace-pre-wrap">{item.observation || "—"}</pre></div>

              <div className="pt-3">
                <Link href={`/gestion-malade/mouvements/${params.id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">Modifier</Link>
                <Link href="/gestion-malade/mouvements" className="ml-2 text-xs text-congo-green hover:underline">← Retour à la liste</Link>
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
