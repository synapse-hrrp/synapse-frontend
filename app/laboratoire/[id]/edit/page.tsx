"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getLaboratoire, updateLaboratoire, LaboratoireDTO } from "@/lib/api";

const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

export default function LaboEdit() {
  const { id } = useParams<{ id: string }>(); const router = useRouter();
  const [item, setItem] = useState<LaboratoireDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultJsonText, setResultJsonText] = useState("");

  useEffect(() => { (async () => { const it = await getLaboratoire(id); setItem(it); setResultJsonText(it?.result_json ? JSON.stringify(it.result_json, null, 2) : ""); })(); }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    let result_json: any = undefined;
    if (resultJsonText.trim()) {
      try { result_json = JSON.parse(resultJsonText); }
      catch { alert("JSON invalide"); return; }
    }
    setBusy(true);
    try {
      await updateLaboratoire(id, {
        test_code: item.test_code, test_name: item.test_name, specimen: item.specimen,
        status: item.status, result_value: item.result_value, unit: item.unit, ref_range: item.ref_range,
        result_json, price: item.price, currency: item.currency
      });
      router.replace(`/laboratoire/${id}`);
    } catch (e:any) { alert("Échec de mise à jour : " + (e?.message || "inconnue")); }
    finally { setBusy(false); }
  }

  if (!item) return <div className="p-6">Chargement…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Modifier examen labo" subtitle={`${item.test_name} (${item.test_code})`} logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <form onSubmit={onSubmit} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Code *"><input className={inputCls} value={item.test_code} onChange={e=>setItem(i=>i?{...i, test_code:e.target.value}:i)} required /></Field>
            <Field label="Nom du test *"><input className={inputCls} value={item.test_name} onChange={e=>setItem(i=>i?{...i, test_name:e.target.value}:i)} required /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Specimen"><input className={inputCls} value={item.specimen || ""} onChange={e=>setItem(i=>i?{...i, specimen:e.target.value}:i)} /></Field>
            <Field label="Statut">
              <select className={inputCls} value={item.status || "pending"} onChange={e=>setItem(i=>i?{...i, status:e.target.value as any}:i)}>
                <option value="pending">En attente</option><option value="in_progress">En cours</option>
                <option value="validated">Validé</option><option value="canceled">Annulé</option>
              </select>
            </Field>
            <div />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Valeur"><input className={inputCls} value={item.result_value || ""} onChange={e=>setItem(i=>i?{...i, result_value:e.target.value}:i)} /></Field>
            <Field label="Unité"><input className={inputCls} value={item.unit || ""} onChange={e=>setItem(i=>i?{...i, unit:e.target.value}:i)} /></Field>
            <Field label="Référence"><input className={inputCls} value={item.ref_range || ""} onChange={e=>setItem(i=>i?{...i, ref_range:e.target.value}:i)} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Prix"><input type="number" step="0.01" className={inputCls} value={item.price ?? ""} onChange={e=>setItem(i=>i?{...i, price:e.target.value === "" ? null : Number(e.target.value)}:i)} /></Field>
            <Field label="Devise"><input className={inputCls} value={item.currency || ""} onChange={e=>setItem(i=>i?{...i, currency:e.target.value.toUpperCase()}:i)} /></Field>
            <div />
          </div>
          <Field label="Résultats (JSON)">
            <textarea rows={6} className={inputCls} value={resultJsonText} onChange={(e)=>setResultJsonText(e.target.value)} />
          </Field>
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
              {busy ? "Mise à jour…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
function Field({label, children}:{label:string; children:React.ReactNode}) {
  return <div><label className="block text-xs font-medium text-ink-600">{label}</label>{children}</div>;
}
