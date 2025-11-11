"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getGestionMalade, updateGestionMalade } from "@/lib/api";

const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

type GM = {
  id: string;
  patient_id: string;
  visite_id?: string|null;
  date_acte?: string|null;
  type_action: "admission"|"transfert"|"hospitalisation"|"sortie";
  service_source?: string|null;
  service_destination?: string|null;
  pavillon?: string|null; chambre?: string|null; lit?: string|null;
  date_entree?: string|null; date_sortie_prevue?: string|null; date_sortie_effective?: string|null;
  motif?: string|null; diagnostic?: string|null; examen_clinique?: string|null; traitements?: string|null; observation?: string|null;
  statut: "en_cours"|"clos"|"annule";
};

export default function EditMouvementPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/gestion-malade/mouvements/${params.id}/edit`); return; }
    me().catch(() => window.location.replace(`/login?next=/gestion-malade/mouvements/${params.id}/edit`));
  }, [params.id]);

  const [item, setItem] = useState<GM | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => { try { setItem(await getGestionMalade(params.id)); } catch {} })(); }, [params.id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setBusy(true);
    try {
      const payload = {
        patient_id: item.patient_id,
        visite_id: item.visite_id || null,
        type_action: item.type_action,
        service_source: item.service_source || null,
        service_destination: item.service_destination || null,
        pavillon: item.pavillon || null,
        chambre: item.chambre || null,
        lit: item.lit || null,
        date_entree: item.date_entree || null,
        date_sortie_prevue: item.date_sortie_prevue || null,
        date_sortie_effective: item.date_sortie_effective || null,
        motif: item.motif || null,
        diagnostic: item.diagnostic || null,
        examen_clinique: item.examen_clinique || null,
        traitements: item.traitements || null,
        observation: item.observation || null,
        statut: item.statut,
        date_acte: item.date_acte || null,
      };
      await updateGestionMalade(params.id, payload);
      router.replace("/gestion-malade/mouvements?flash=updated");
    } catch (e: any) {
      alert("Erreur: " + (e?.message || "inconnue"));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Modifier mouvement" subtitle={`ID: ${params.id}`} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {!item ? <p>Chargement…</p> : (
          <form onSubmit={onSubmit} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-4">
            <Field label="Patient ID"><input className={inputCls} value={item.patient_id} onChange={e=>setItem(i=>i?{...i,patient_id:e.target.value}:i)} /></Field>
            <Field label="Visite ID"><input className={inputCls} value={item.visite_id || ""} onChange={e=>setItem(i=>i?{...i,visite_id:e.target.value}:i)} /></Field>
            <Field label="Type d'action">
              <select className={inputCls} value={item.type_action} onChange={e=>setItem(i=>i?{...i,type_action:e.target.value as any}:i)}>
                <option value="admission">Admission</option>
                <option value="transfert">Transfert</option>
                <option value="hospitalisation">Hospitalisation</option>
                <option value="sortie">Sortie</option>
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Service source"><input className={inputCls} value={item.service_source || ""} onChange={e=>setItem(i=>i?{...i,service_source:e.target.value}:i)} /></Field>
              <Field label="Service destination"><input className={inputCls} value={item.service_destination || ""} onChange={e=>setItem(i=>i?{...i,service_destination:e.target.value}:i)} /></Field>
              <Field label="Pavillon"><input className={inputCls} value={item.pavillon || ""} onChange={e=>setItem(i=>i?{...i,pavillon:e.target.value}:i)} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Chambre"><input className={inputCls} value={item.chambre || ""} onChange={e=>setItem(i=>i?{...i,chambre:e.target.value}:i)} /></Field>
              <Field label="Lit"><input className={inputCls} value={item.lit || ""} onChange={e=>setItem(i=>i?{...i,lit:e.target.value}:i)} /></Field>
              <Field label="Date de l’acte">
                <input type="datetime-local" className={inputCls}
                  value={item.date_acte ? new Date(item.date_acte).toISOString().slice(0,16) : ""}
                  onChange={e=>setItem(i=>i?{...i,date_acte: e.target.value ? new Date(e.target.value).toISOString() : null}:i)} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Entrée">
                <input type="datetime-local" className={inputCls}
                  value={item.date_entree ? new Date(item.date_entree).toISOString().slice(0,16) : ""}
                  onChange={e=>setItem(i=>i?{...i,date_entree: e.target.value ? new Date(e.target.value).toISOString() : null}:i)} />
              </Field>
              <Field label="Sortie prévue">
                <input type="datetime-local" className={inputCls}
                  value={item.date_sortie_prevue ? new Date(item.date_sortie_prevue).toISOString().slice(0,16) : ""}
                  onChange={e=>setItem(i=>i?{...i,date_sortie_prevue: e.target.value ? new Date(e.target.value).toISOString() : null}:i)} />
              </Field>
              <Field label="Sortie effective">
                <input type="datetime-local" className={inputCls}
                  value={item.date_sortie_effective ? new Date(item.date_sortie_effective).toISOString().slice(0,16) : ""}
                  onChange={e=>setItem(i=>i?{...i,date_sortie_effective: e.target.value ? new Date(e.target.value).toISOString() : null}:i)} />
              </Field>
            </div>
            <Field label="Motif"><input className={inputCls} value={item.motif || ""} onChange={e=>setItem(i=>i?{...i,motif:e.target.value}:i)} /></Field>
            <Field label="Diagnostic"><input className={inputCls} value={item.diagnostic || ""} onChange={e=>setItem(i=>i?{...i,diagnostic:e.target.value}:i)} /></Field>
            <Field label="Examen clinique"><textarea className={inputCls} rows={3} value={item.examen_clinique || ""} onChange={e=>setItem(i=>i?{...i,examen_clinique:e.target.value}:i)} /></Field>
            <Field label="Traitements"><textarea className={inputCls} rows={3} value={item.traitements || ""} onChange={e=>setItem(i=>i?{...i,traitements:e.target.value}:i)} /></Field>
            <Field label="Observation"><textarea className={inputCls} rows={3} value={item.observation || ""} onChange={e=>setItem(i=>i?{...i,observation:e.target.value}:i)} /></Field>
            <Field label="Statut">
              <select className={inputCls} value={item.statut} onChange={e=>setItem(i=>i?{...i,statut:e.target.value as any}:i)}>
                <option value="en_cours">En cours</option>
                <option value="clos">Clos</option>
                <option value="annule">Annulé</option>
              </select>
            </Field>

            <div className="pt-2">
              <button type="submit" disabled={busy} className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                {busy ? "Sauvegarde…" : "Enregistrer les modifications"}
              </button>
            </div>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode; }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">{label}</label>
      {children}
    </div>
  );
}
