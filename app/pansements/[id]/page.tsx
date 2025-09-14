"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getPansement, PansementDTO, getToken, me } from "@/lib/api";

export default function PansementShowPage({ params }: { params: { id: string } }) {
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/pansements/${params.id}`); return; }
    me().catch(() => window.location.replace(`/login?next=/pansements/${params.id}`));
  }, [params.id]);

  const [item, setItem] = useState<PansementDTO | null>(null);

  useEffect(() => {
    (async () => {
      try { setItem(await getPansement(params.id)); } catch {}
    })();
  }, [params.id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Détail pansement" subtitle="Fiche de soin" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Pansements</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">{params.id}</li>
          </ol>
        </nav>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          {!item ? <p>Chargement…</p> : (
            <div className="space-y-2 text-sm">
              <div><b>Patient :</b> {item.patient ? `${item.patient.nom} ${item.patient.prenom}` : "—"} <span className="text-ink-500">({item.patient?.numero_dossier || "—"})</span></div>
              <div><b>Date/heure :</b> {item.date_soin ? new Date(item.date_soin).toLocaleString() : "—"}</div>
              <div><b>Type :</b> {item.type || "—"}</div>
              <div><b>Statut :</b> {item.status || "en_cours"}</div>
              <div><b>État de la plaie :</b> {item.etat_plaque || "—"}</div>
              <div><b>Produits utilisés :</b> {item.produits_utilises || "—"}</div>
              <div><b>Observation :</b> <pre className="whitespace-pre-wrap">{item.observation || "—"}</pre></div>
              <div><b>Soignant :</b> {item.soignant?.name || "—"}</div>

              <div className="pt-3">
                <Link href={`/pansements/${params.id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">Modifier</Link>
                <Link href="/pansements" className="ml-2 text-xs text-congo-green hover:underline">← Retour à la liste</Link>
              </div>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
