"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getDeclarationNaissance, updateDeclarationNaissance } from "@/lib/api";

const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

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

export default function DeclarationEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/gestion-malade/declarations-naissance/${params.id}/edit`); return; }
    me().catch(() => window.location.replace(`/login?next=/gestion-malade/declarations-naissance/${params.id}/edit`));
  }, [params.id]);

  const [item, setItem] = useState<Decl | null>(null);
  const [busy, setBusy] = useState(false);
  const [docsText, setDocsText] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const it = await getDeclarationNaissance(params.id);
        setItem(it);
        setDocsText(it?.documents_json ? JSON.stringify(it.documents_json, null, 2) : "");
      } catch {}
    })();
  }, [params.id]);

  useEffect(() => {
    if (!item) return;
    try {
      setItem(i => i ? ({ ...i, documents_json: docsText.trim() ? JSON.parse(docsText) : null }) : i);
    } catch { /* noop */ }
  }, [docsText]); // eslint-disable-line

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setBusy(true);
    try {
      await updateDeclarationNaissance(params.id, {
        mere_id: item.mere_id,
        service_slug: item.service_slug || null,
        bebe_nom: item.bebe_nom || null,
        bebe_prenom: item.bebe_prenom || null,
        pere_nom: item.pere_nom || null,
        pere_prenom: item.pere_prenom || null,
        date_heure_naissance: item.date_heure_naissance || null,
        lieu_naissance: item.lieu_naissance || null,
        sexe: item.sexe || null,
        poids_kg: item.poids_kg === "" ? null : (typeof item.poids_kg === "string" ? Number(item.poids_kg) : item.poids_kg ?? null),
        taille_cm: item.taille_cm === "" ? null : (typeof item.taille_cm === "string" ? Number(item.taille_cm) : item.taille_cm ?? null),
        numero_acte: item.numero_acte || null,
        officier_etat_civil: item.officier_etat_civil || null,
        documents_json: item.documents_json ?? null,
        statut: item.statut,
        date_transmission: item.date_transmission || null,
        prix: item.prix === "" ? null : (typeof item.prix === "string" ? Number(item.prix) : item.prix ?? null),
        devise: item.devise || "XAF",
      });
      router.replace("/gestion-malade/declarations-naissance?flash=updated");
    } catch (e:any) {
      alert("Erreur: " + (e?.message || "inconnue"));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Modifier déclaration de naissance" subtitle={`ID: ${params.id}`} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {!item ? <p>Chargement…</p> : (
          <form onSubmit={onSubmit} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mère ID"><input className={inputCls} value={item.mere_id} onChange={e=>setItem(i=>i?{...i,mere_id:e.target.value}:i)} /></Field>
              <Field label="Service"><input className={inputCls} value={item.service_slug || ""} onChange={e=>setItem(i=>i?{...i,service_slug:e.target.value}:i)} /></Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom du bébé"><input className={inputCls} value={item.bebe_nom || ""} onChange={e=>setItem(i=>i?{...i,bebe_nom:e.target.value}:i)} /></Field>
              <Field label="Prénom du bébé"><input className={inputCls} value={item.bebe_prenom || ""} onChange={e=>setItem(i=>i?{...i,bebe_prenom:e.target.value}:i)} /></Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom du père"><input className={inputCls} value={item.pere_nom || ""} onChange={e=>setItem(i=>i?{...i,pere_nom:e.target.value}:i)} /></Field>
              <Field label="Prénom du père"><input className={inputCls} value={item.pere_prenom || ""} onChange={e=>setItem(i=>i?{...i,pere_prenom:e.target.value}:i)} /></Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Date/heure de naissance">
                <input type="datetime-local" className={inputCls}
                  value={item.date_heure_naissance ? new Date(item.date_heure_naissance).toISOString().slice(0,16) : ""}
                  onChange={e=>setItem(i=>i?{...i,date_heure_naissance:e.target.value?new Date(e.target.value).toISOString():null}:i)} />
              </Field>
              <Field label="Lieu de naissance"><input className={inputCls} value={item.lieu_naissance || ""} onChange={e=>setItem(i=>i?{...i,lieu_naissance:e.target.value}:i)} /></Field>
              <Field label="Sexe">
                <select className={inputCls} value={item.sexe || "M"} onChange={e=>setItem(i=>i?{...i,sexe:e.target.value as any}:i)}>
                  <option value="M">M</option><option value="F">F</option><option value="I">I</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Poids (kg)"><input type="number" step="0.01" className={inputCls} value={String(item.poids_kg ?? "")} onChange={e=>setItem(i=>i?{...i,poids_kg:e.target.value}:i)} /></Field>
              <Field label="Taille (cm)"><input type="number" step="0.01" className={inputCls} value={String(item.taille_cm ?? "")} onChange={e=>setItem(i=>i?{...i,taille_cm:e.target.value}:i)} /></Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Numéro d'acte"><input className={inputCls} value={item.numero_acte || ""} onChange={e=>setItem(i=>i?{...i,numero_acte:e.target.value}:i)} /></Field>
              <Field label="Officier d'état civil"><input className={inputCls} value={item.officier_etat_civil || ""} onChange={e=>setItem(i=>i?{...i,officier_etat_civil:e.target.value}:i)} /></Field>
            </div>

            <Field label="Documents (JSON)">
              <textarea className={inputCls} rows={3} value={docsText} onChange={(e)=>setDocsText(e.target.value)} />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Statut">
                <select className={inputCls} value={item.statut} onChange={e=>setItem(i=>i?{...i,statut:e.target.value as any}:i)}>
                  <option value="brouillon">brouillon</option>
                  <option value="valide">valide</option>
                  <option value="transmis">transmis</option>
                </select>
              </Field>
              <Field label="Date de transmission">
                <input type="datetime-local" className={inputCls}
                  value={item.date_transmission ? new Date(item.date_transmission).toISOString().slice(0,16) : ""}
                  onChange={e=>setItem(i=>i?{...i,date_transmission:e.target.value?new Date(e.target.value).toISOString():null}:i)} />
              </Field>
            </div>

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
