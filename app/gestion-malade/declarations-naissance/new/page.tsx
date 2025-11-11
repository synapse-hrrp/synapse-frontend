"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, createDeclarationNaissance } from "@/lib/api";

const inputCls =
  "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

type Payload = {
  mere_id: string;
  service_slug?: string | null;
  bebe_nom?: string | null;
  bebe_prenom?: string | null;
  pere_nom?: string | null;
  pere_prenom?: string | null;
  date_heure_naissance?: string | null;
  lieu_naissance?: string | null;
  sexe?: "M" | "F" | "I" | null;
  poids_kg?: number | null;
  taille_cm?: number | null;
  numero_acte?: string | null;
  officier_etat_civil?: string | null; // si tu l'utilises
  documents_json?: any | null;          // optionnel (JSON)
  statut?: "brouillon" | "valide" | "transmis";
  date_transmission?: string | null;
  prix?: number | string | null;
  devise?: string | null;
};

export default function NewDeclarationNaissancePage() {
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.replace(`/login?next=/gestion-malade/declarations-naissance/new`);
      return;
    }
    me().catch(() =>
      window.location.replace(`/login?next=/gestion-malade/declarations-naissance/new`)
    );
  }, []);

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Payload>({
    mere_id: "",
    service_slug: "",
    bebe_nom: "",
    bebe_prenom: "",
    pere_nom: "",
    pere_prenom: "",
    date_heure_naissance: null,
    lieu_naissance: "",
    sexe: "M",
    poids_kg: null,
    taille_cm: null,
    numero_acte: "",
    officier_etat_civil: "",
    documents_json: null,
    statut: "brouillon",
    date_transmission: null,
    prix: "",
    devise: "XAF",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: Payload = {
        mere_id: form.mere_id,
        service_slug: form.service_slug || null,
        bebe_nom: form.bebe_nom || null,
        bebe_prenom: form.bebe_prenom || null,
        pere_nom: form.pere_nom || null,
        pere_prenom: form.pere_prenom || null,
        date_heure_naissance: form.date_heure_naissance || null,
        lieu_naissance: form.lieu_naissance || null,
        sexe: form.sexe || null,
        poids_kg: form.poids_kg === null || form.poids_kg === undefined || form.poids_kg === ("" as any)
          ? null : (typeof form.poids_kg === "string" ? Number(form.poids_kg) : form.poids_kg),
        taille_cm: form.taille_cm === null || form.taille_cm === undefined || form.taille_cm === ("" as any)
          ? null : (typeof form.taille_cm === "string" ? Number(form.taille_cm) : form.taille_cm),
        numero_acte: form.numero_acte || null,
        officier_etat_civil: form.officier_etat_civil || null,
        documents_json: form.documents_json ?? null,
        statut: form.statut || "brouillon",
        date_transmission: form.date_transmission || null,
        prix:
          form.prix === "" || form.prix === null
            ? null
            : (typeof form.prix === "string" ? Number(form.prix) : form.prix),
        devise: form.devise || "XAF",
      };

      await createDeclarationNaissance(payload);
      router.replace("/gestion-malade/declarations-naissance?flash=created");
    } catch (e: any) {
      alert("Erreur: " + (e?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  // JSON optionnel (documents)
  const [docsText, setDocsText] = useState("");
  useEffect(() => {
    if (!docsText.trim()) { setForm(f => ({ ...f, documents_json: null })); return; }
    try { setForm(f => ({ ...f, documents_json: JSON.parse(docsText) })); } catch { /* noop */ }
  }, [docsText]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Nouvelle déclaration de naissance" subtitle="État civil — maternité" />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Gestion — Malade</li><li aria-hidden>/</li>
            <li>Déclarations de naissance</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Nouveau</li>
          </ol>
        </nav>

        <form onSubmit={onSubmit} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mère ID">
              <input className={inputCls} value={form.mere_id} onChange={e=>setForm(f=>({...f, mere_id:e.target.value}))} required />
            </Field>
            <Field label="Service">
              <input className={inputCls} value={form.service_slug || ""} onChange={e=>setForm(f=>({...f, service_slug:e.target.value}))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom du bébé">
              <input className={inputCls} value={form.bebe_nom || ""} onChange={e=>setForm(f=>({...f, bebe_nom:e.target.value}))} />
            </Field>
            <Field label="Prénom du bébé">
              <input className={inputCls} value={form.bebe_prenom || ""} onChange={e=>setForm(f=>({...f, bebe_prenom:e.target.value}))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom du père">
              <input className={inputCls} value={form.pere_nom || ""} onChange={e=>setForm(f=>({...f, pere_nom:e.target.value}))} />
            </Field>
            <Field label="Prénom du père">
              <input className={inputCls} value={form.pere_prenom || ""} onChange={e=>setForm(f=>({...f, pere_prenom:e.target.value}))} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Date/heure de naissance">
              <input
                type="datetime-local"
                className={inputCls}
                onChange={e=>setForm(f=>({...f, date_heure_naissance: e.target.value ? new Date(e.target.value).toISOString() : null}))}
              />
            </Field>
            <Field label="Lieu de naissance">
              <input className={inputCls} value={form.lieu_naissance || ""} onChange={e=>setForm(f=>({...f, lieu_naissance:e.target.value}))} />
            </Field>
            <Field label="Sexe">
              <select className={inputCls} value={form.sexe || "M"} onChange={e=>setForm(f=>({...f, sexe: e.target.value as any}))}>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="I">I</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Poids (kg)">
              <input
                type="number" step="0.01" className={inputCls}
                value={form.poids_kg as any}
                onChange={e=>setForm(f=>({...f, poids_kg: e.target.value === "" ? ("" as any) : Number(e.target.value)}))}
              />
            </Field>
            <Field label="Taille (cm)">
              <input
                type="number" step="0.01" className={inputCls}
                value={form.taille_cm as any}
                onChange={e=>setForm(f=>({...f, taille_cm: e.target.value === "" ? ("" as any) : Number(e.target.value)}))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Numéro d'acte">
              <input className={inputCls} value={form.numero_acte || ""} onChange={e=>setForm(f=>({...f, numero_acte:e.target.value}))} />
            </Field>
            <Field label="Officier d'état civil (optionnel)">
              <input className={inputCls} value={form.officier_etat_civil || ""} onChange={e=>setForm(f=>({...f, officier_etat_civil:e.target.value}))} />
            </Field>
          </div>

          <Field label="Documents (JSON — optionnel)">
            <textarea
              className={inputCls}
              placeholder='Ex: [{"type":"certificat","numero":"ABC123"}]'
              rows={3}
              value={JSON.stringify(form.documents_json ?? "", null, 2)}
              onChange={(e) => {
                const v = e.target.value;
                try { setForm(f=>({...f, documents_json: v.trim() ? JSON.parse(v) : null })); }
                catch { /* on laisse l'utilisateur corriger */ }
              }}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Statut">
              <select className={inputCls} value={form.statut || "brouillon"} onChange={e=>setForm(f=>({...f, statut: e.target.value as any}))}>
                <option value="brouillon">brouillon</option>
                <option value="valide">valide</option>
                <option value="transmis">transmis</option>
              </select>
            </Field>
            <Field label="Date de transmission (si transmis)">
              <input
                type="datetime-local"
                className={inputCls}
                onChange={e=>setForm(f=>({...f, date_transmission: e.target.value ? new Date(e.target.value).toISOString() : null}))}
              />
            </Field>
          </div>

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
