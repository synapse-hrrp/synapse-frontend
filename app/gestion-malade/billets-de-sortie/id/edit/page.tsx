"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getBilletSortie, updateBilletSortie } from "@/lib/api";

const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

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

export default function BilletEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/gestion-malade/billets-de-sortie/${params.id}/edit`); return; }
    me().catch(() => window.location.replace(`/login?next=/gestion-malade/billets-de-sortie/${params.id}/edit`));
  }, [params.id]);

  const [item, setItem] = useState<Billet | null>(null);
  const [busy, setBusy] = useState(false);
  const [jsonText, setJsonText] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const it = await getBilletSortie(params.id);
        setItem(it);
        setJsonText(it?.traitement_sortie_json ? JSON.stringify(it.traitement_sortie_json, null, 2) : "");
      } catch {}
    })();
  }, [params.id]);

  useEffect(() => {
    if (!item) return;
    if (!jsonText.trim()) { setItem(i => i ? ({ ...i, traitement_sortie_json: null }) : i); return; }
    try {
      const parsed = JSON.parse(jsonText);
      setItem(i => i ? ({ ...i, traitement_sortie_json: parsed }) : i);
    } catch { /* noop */ }
  }, [jsonText]); // eslint-disable-line

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setBusy(true);
    try {
      await updateBilletSortie(params.id, {
        patient_id: item.patient_id,
        service_slug: item.service_slug || null,
        motif_sortie: item.motif_sortie || null,
        diagnostic_sortie: item.diagnostic_sortie || null,
        resume_clinique: item.resume_clinique || null,
        consignes: item.consignes || null,
        traitement_sortie_json: item.traitement_sortie_json ?? null,
        rdv_controle_at: item.rdv_controle_at || null,
        destination: item.destination || null,
        date_sortie_effective: item.date_sortie_effective || null,
        statut: item.statut,
        prix: item.prix === "" ? null : (typeof item.prix === "string" ? Number(item.prix) : item.prix ?? null),
        devise: item.devise || "XAF",
      });
      router.replace("/gestion-malade/billets-de-sortie?flash=updated");
    } catch (e:any) {
      alert("Erreur: " + (e?.message || "inconnue"));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Modifier billet de sortie" subtitle={`ID: ${params.id}`} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {!item ? <p>Chargement…</p> : (
          <form onSubmit={onSubmit} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-4">
            <Field label="Patient ID"><input className={inputCls} value={item.patient_id} onChange={e=>setItem(i=>i?{...i,patient_id:e.target.value}:i)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Service"><input className={inputCls} value={item.service_slug || ""} onChange={e=>setItem(i=>i?{...i,service_slug:e.target.value}:i)} /></Field>
              <Field label="Statut">
                <select className={inputCls} value={item.statut} onChange={e=>setItem(i=>i?{...i,statut:e.target.value as any}:i)}>
                  <option value="brouillon">brouillon</option>
                  <option value="valide">valide</option>
                  <option value="remis">remis</option>
                </select>
              </Field>
            </div>

            <Field label="Motif de sortie"><input className={inputCls} value={item.motif_sortie || ""} onChange={e=>setItem(i=>i?{...i,motif_sortie:e.target.value}:i)} /></Field>
            <Field label="Diagnostic de sortie"><textarea className={inputCls} rows={3} value={item.diagnostic_sortie || ""} onChange={e=>setItem(i=>i?{...i,diagnostic_sortie:e.target.value}:i)} /></Field>
            <Field label="Résumé clinique"><textarea className={inputCls} rows={4} value={item.resume_clinique || ""} onChange={e=>setItem(i=>i?{...i,resume_clinique:e.target.value}:i)} /></Field>
            <Field label="Consignes"><textarea className={inputCls} rows={3} value={item.consignes || ""} onChange={e=>setItem(i=>i?{...i,consignes:e.target.value}:i)} /></Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="RDV contrôle">
                <input type="datetime-local" className={inputCls}
                  value={item.rdv_controle_at ? new Date(item.rdv_controle_at).toISOString().slice(0,16) : ""}
                  onChange={e=>setItem(i=>i?{...i,rdv_controle_at:e.target.value?new Date(e.target.value).toISOString():null}:i)} />
              </Field>
              <Field label="Destination"><input className={inputCls} value={item.destination || ""} onChange={e=>setItem(i=>i?{...i,destination:e.target.value}:i)} /></Field>
              <Field label="Date sortie effective">
                <input type="datetime-local" className={inputCls}
                  value={item.date_sortie_effective ? new Date(item.date_sortie_effective).toISOString().slice(0,16) : ""}
                  onChange={e=>setItem(i=>i?{...i,date_sortie_effective:e.target.value?new Date(e.target.value).toISOString():null}:i)} />
              </Field>
            </div>

            <Field label="Traitement de sortie (JSON)">
              <textarea className={inputCls} rows={3} value={jsonText} onChange={(e)=>setJsonText(e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Prix"><input type="number" step="0.01" className={inputCls} value={String(item.prix ?? "")} onChange={e=>setItem(i=>i?{...i,prix:e.target.value}:i)} /></Field>
              <Field label="Devise"><input className={inputCls} value={item.devise || "XAF"} onChange={e=>setItem(i=>i?{...i,devise:e.target.value}:i)} /></Field>
            </div>

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
  return (<div><label className="block text-xs font-medium text-ink-600">{label}</label>{children}</div>);
}
