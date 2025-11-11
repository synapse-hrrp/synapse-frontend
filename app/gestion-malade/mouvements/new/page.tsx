"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, createGestionMalade } from "@/lib/api";

const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

type Payload = {
  patient_id: string;
  visite_id?: string|null;
  type_action: "admission"|"transfert"|"hospitalisation"|"sortie";
  service_source?: string|null; service_destination?: string|null;
  pavillon?: string|null; chambre?: string|null; lit?: string|null;
  date_entree?: string|null; date_sortie_prevue?: string|null; date_sortie_effective?: string|null;
  motif?: string|null; diagnostic?: string|null; examen_clinique?: string|null; traitements?: string|null; observation?: string|null;
  statut?: "en_cours"|"clos"|"annule";
  date_acte?: string|null;
};

export default function NewMouvementPage() {
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/gestion-malade/mouvements/new`); return; }
    me().catch(() => window.location.replace(`/login?next=/gestion-malade/mouvements/new`));
  }, []);

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Payload>({ patient_id: "", type_action: "admission", statut: "en_cours" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createGestionMalade(form);
      router.replace("/gestion-malade/mouvements?flash=created");
    } catch (e: any) {
      alert("Erreur: " + (e?.message || "inconnue"));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Nouveau mouvement" subtitle="Gestion de malade" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <form onSubmit={onSubmit} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-4">
          <Field label="Patient ID"><input className={inputCls} value={form.patient_id} onChange={e=>setForm({...form, patient_id:e.target.value})} /></Field>
          <Field label="Visite ID"><input className={inputCls} value={form.visite_id || ""} onChange={e=>setForm({...form, visite_id:e.target.value})} /></Field>
          <Field label="Type d'action">
            <select className={inputCls} value={form.type_action} onChange={e=>setForm({...form, type_action:e.target.value as any})}>
              <option value="admission">Admission</option>
              <option value="transfert">Transfert</option>
              <option value="hospitalisation">Hospitalisation</option>
              <option value="sortie">Sortie</option>
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Service source"><input className={inputCls} value={form.service_source || ""} onChange={e=>setForm({...form, service_source:e.target.value})} /></Field>
            <Field label="Service destination"><input className={inputCls} value={form.service_destination || ""} onChange={e=>setForm({...form, service_destination:e.target.value})} /></Field>
            <Field label="Pavillon"><input className={inputCls} value={form.pavillon || ""} onChange={e=>setForm({...form, pavillon:e.target.value})} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Chambre"><input className={inputCls} value={form.chambre || ""} onChange={e=>setForm({...form, chambre:e.target.value})} /></Field>
            <Field label="Lit"><input className={inputCls} value={form.lit || ""} onChange={e=>setForm({...form, lit:e.target.value})} /></Field>
            <Field label="Date de l’acte">
              <input type="datetime-local" className={inputCls}
                onChange={e=>setForm({...form, date_acte: e.target.value ? new Date(e.target.value).toISOString() : null})} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Entrée">
              <input type="datetime-local" className={inputCls}
                onChange={e=>setForm({...form, date_entree: e.target.value ? new Date(e.target.value).toISOString() : null})} />
            </Field>
            <Field label="Sortie prévue">
              <input type="datetime-local" className={inputCls}
                onChange={e=>setForm({...form, date_sortie_prevue: e.target.value ? new Date(e.target.value).toISOString() : null})} />
            </Field>
            <Field label="Sortie effective">
              <input type="datetime-local" className={inputCls}
                onChange={e=>setForm({...form, date_sortie_effective: e.target.value ? new Date(e.target.value).toISOString() : null})} />
            </Field>
          </div>
          <Field label="Motif"><input className={inputCls} value={form.motif || ""} onChange={e=>setForm({...form, motif:e.target.value})} /></Field>
          <Field label="Diagnostic"><input className={inputCls} value={form.diagnostic || ""} onChange={e=>setForm({...form, diagnostic:e.target.value})} /></Field>
          <Field label="Examen clinique"><textarea className={inputCls} rows={3} value={form.examen_clinique || ""} onChange={e=>setForm({...form, examen_clinique:e.target.value})} /></Field>
          <Field label="Traitements"><textarea className={inputCls} rows={3} value={form.traitements || ""} onChange={e=>setForm({...form, traitements:e.target.value})} /></Field>
          <Field label="Observation"><textarea className={inputCls} rows={3} value={form.observation || ""} onChange={e=>setForm({...form, observation:e.target.value})} /></Field>
          <Field label="Statut">
            <select className={inputCls} value={form.statut || "en_cours"} onChange={e=>setForm({...form, statut:e.target.value as any})}>
              <option value="en_cours">En cours</option>
              <option value="clos">Clos</option>
              <option value="annule">Annulé</option>
            </select>
          </Field>

          <div className="pt-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
              {busy ? "Création…" : "Enregistrer"}
            </button>
          </div>
        </form>
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
