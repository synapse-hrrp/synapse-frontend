"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, createBilletSortie } from "@/lib/api";

const inputCls =
  "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

type Payload = {
  patient_id: string;
  service_slug?: string | null;
  motif_sortie?: string | null;
  diagnostic_sortie?: string | null;
  resume_clinique?: string | null;
  consignes?: string | null;
  traitement_sortie_json?: any | null; // tu peux passer un objet ou laisser null
  rdv_controle_at?: string | null;
  destination?: string | null;
  date_sortie_effective?: string | null;
  statut?: "brouillon" | "valide" | "remis";
  prix?: number | string | null;
  devise?: string | null;
};

export default function NewBilletSortiePage() {
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.replace(`/login?next=/gestion-malade/billets-de-sortie/new`);
      return;
    }
    me().catch(() =>
      window.location.replace(`/login?next=/gestion-malade/billets-de-sortie/new`)
    );
  }, []);

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Payload>({
    patient_id: "",
    service_slug: "",
    motif_sortie: "",
    diagnostic_sortie: "",
    resume_clinique: "",
    consignes: "",
    traitement_sortie_json: null,
    rdv_controle_at: null,
    destination: "",
    date_sortie_effective: null,
    statut: "brouillon",
    prix: "",
    devise: "XAF",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: Payload = {
        patient_id: form.patient_id,
        service_slug: form.service_slug || null,
        motif_sortie: form.motif_sortie || null,
        diagnostic_sortie: form.diagnostic_sortie || null,
        resume_clinique: form.resume_clinique || null,
        consignes: form.consignes || null,
        traitement_sortie_json: form.traitement_sortie_json ?? null,
        rdv_controle_at: form.rdv_controle_at || null,
        destination: form.destination || null,
        date_sortie_effective: form.date_sortie_effective || null,
        statut: form.statut || "brouillon",
        prix:
          form.prix === "" || form.prix === null
            ? null
            : (typeof form.prix === "string" ? Number(form.prix) : form.prix),
        devise: form.devise || "XAF",
      };

      await createBilletSortie(payload);
      router.replace("/gestion-malade/billets-de-sortie?flash=created");
    } catch (e: any) {
      alert("Erreur: " + (e?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  // Helper pour saisir un JSON simple (optionnel)
  const [jsonText, setJsonText] = useState("");
  useEffect(() => {
    if (!jsonText.trim()) { setForm(f => ({ ...f, traitement_sortie_json: null })); return; }
    try {
      const parsed = JSON.parse(jsonText);
      setForm(f => ({ ...f, traitement_sortie_json: parsed }));
    } catch {
      // on laisse tel quel, l'utilisateur corrige
    }
  }, [jsonText]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Nouveau billet de sortie" subtitle="Résumé clinique et consignes" />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Gestion — Malade</li><li aria-hidden>/</li>
            <li>Billets de sortie</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Nouveau</li>
          </ol>
        </nav>

        <form onSubmit={onSubmit} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-4">
          <Field label="Patient ID">
            <input className={inputCls} value={form.patient_id} onChange={e=>setForm(f=>({...f, patient_id:e.target.value}))} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Service">
              <input className={inputCls} value={form.service_slug || ""} onChange={e=>setForm(f=>({...f, service_slug:e.target.value}))} />
            </Field>
            <Field label="Statut">
              <select className={inputCls} value={form.statut || "brouillon"} onChange={e=>setForm(f=>({...f, statut:e.target.value as any}))}>
                <option value="brouillon">brouillon</option>
                <option value="valide">valide</option>
                <option value="remis">remis</option>
              </select>
            </Field>
          </div>

          <Field label="Motif de sortie">
            <input className={inputCls} value={form.motif_sortie || ""} onChange={e=>setForm(f=>({...f, motif_sortie:e.target.value}))} />
          </Field>
          <Field label="Diagnostic de sortie">
            <textarea className={inputCls} rows={3} value={form.diagnostic_sortie || ""} onChange={e=>setForm(f=>({...f, diagnostic_sortie:e.target.value}))} />
          </Field>
          <Field label="Résumé clinique">
            <textarea className={inputCls} rows={4} value={form.resume_clinique || ""} onChange={e=>setForm(f=>({...f, resume_clinique:e.target.value}))} />
          </Field>
          <Field label="Consignes">
            <textarea className={inputCls} rows={3} value={form.consignes || ""} onChange={e=>setForm(f=>({...f, consignes:e.target.value}))} />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="RDV contrôle">
              <input
                type="datetime-local"
                className={inputCls}
                onChange={e=>setForm(f=>({...f, rdv_controle_at: e.target.value ? new Date(e.target.value).toISOString() : null}))}
              />
            </Field>
            <Field label="Destination">
              <input className={inputCls} value={form.destination || ""} onChange={e=>setForm(f=>({...f, destination:e.target.value}))} />
            </Field>
            <Field label="Date sortie effective">
              <input
                type="datetime-local"
                className={inputCls}
                onChange={e=>setForm(f=>({...f, date_sortie_effective: e.target.value ? new Date(e.target.value).toISOString() : null}))}
              />
            </Field>
          </div>

          <Field label="Traitement de sortie (JSON)">
            <textarea
              className={inputCls}
              placeholder='Ex: [{"med":"Paracétamol 500mg","poso":"1 cp x3/j"}]'
              rows={3}
              value={jsonText}
              onChange={(e)=>setJsonText(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix">
              <input type="number" step="0.01" className={inputCls} value={String(form.prix ?? "")} onChange={e=>setForm(f=>({...f, prix:e.target.value}))} />
            </Field>
            <Field label="Devise">
              <input className={inputCls} value={form.devise || "XAF"} onChange={e=>setForm(f=>({...f, devise:e.target.value}))} />
            </Field>
          </div>

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
