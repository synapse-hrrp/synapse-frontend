"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getHospitalisation } from "@/lib/api";

type Hosp = {
  id: string; patient_id: string; service_slug?: string|null; admission_no?: string|null;
  unite?: string|null; chambre?: string|null; lit?: string|null; medecin_traitant_id?: string|number|null;
  motif_admission?: string|null; diagnostic_entree?: string|null; diagnostic_sortie?: string|null;
  date_admission?: string|null; date_sortie_prevue?: string|null; date_sortie_reelle?: string|null;
  statut: string; prix?: number|string|null; devise?: string|null;
};

export default function HospShowPage({ params }: { params: { id: string } }) {
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/gestion-malade/hospitalisations/${params.id}`); return; }
    me().catch(() => window.location.replace(`/login?next=/gestion-malade/hospitalisations/${params.id}`));
  }, [params.id]);

  const [item, setItem] = useState<Hosp | null>(null);
  useEffect(() => { (async()=>{ try{ setItem(await getHospitalisation(params.id)); } catch{} })(); }, [params.id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Détail hospitalisation" subtitle="Séjour hospitalier" />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Gestion — Malade</li><li aria-hidden>/</li><li>Hospitalisations</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">{params.id}</li>
          </ol>
        </nav>
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          {!item ? <p>Chargement…</p> : (
            <div className="space-y-2 text-sm">
              <div><b>Patient ID :</b> {item.patient_id}</div>
              <div><b>Service :</b> {item.service_slug || "—"} • <b>Admission #</b> {item.admission_no || "—"}</div>
              <div><b>Chambre/Lit :</b> {[item.unite, item.chambre, item.lit].filter(Boolean).join(" / ") || "—"}</div>
              <div><b>Médecin traitant :</b> {item.medecin_traitant_id || "—"}</div>
              <div><b>Dates :</b> {item.date_admission?new Date(item.date_admission).toLocaleString():"—"} → prévue {item.date_sortie_prevue?new Date(item.date_sortie_prevue).toLocaleString():"—"} → réelle {item.date_sortie_reelle?new Date(item.date_sortie_reelle).toLocaleString():"—"}</div>
              <div><b>Motif :</b> {item.motif_admission || "—"}</div>
              <div><b>Diagnostic d'entrée :</b> <pre className="whitespace-pre-wrap">{item.diagnostic_entree || "—"}</pre></div>
              <div><b>Diagnostic de sortie :</b> <pre className="whitespace-pre-wrap">{item.diagnostic_sortie || "—"}</pre></div>
              <div><b>Statut :</b> {item.statut}</div>
              <div><b>Tarif :</b> {item.prix ?? "—"} {item.devise || ""}</div>
              <div className="pt-3">
                <Link href={`/gestion-malade/hospitalisations/${params.id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">Modifier</Link>
                <Link href="/gestion-malade/hospitalisations" className="ml-2 text-xs text-congo-green hover:underline">← Retour</Link>
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
