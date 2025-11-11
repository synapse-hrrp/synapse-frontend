"use client";

import { useEffect, useState } from "react";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { AbilityGuard } from "@/lib/authz"; // ⬅️ was AdminGuard
import { listFacturesPaginated, getFactureFull, encaisserFacture } from "@/lib/api";
import { Search, CreditCard, Loader2 } from "lucide-react";

export default function EncaissementPage() {
  return (
    <AbilityGuard anyOf={["*", "caisse.access"]}>
      <Inner />
    </AbilityGuard>
  );
}

function Inner() {
  const [numero, setNumero] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<any>(null);

  const [amount, setAmount] = useState<number>(0);
  const [mode, setMode]     = useState("cash");
  const [ref, setRef]       = useState("");

  async function searchByNumero(e?: React.FormEvent) {
    e?.preventDefault();
    if (!numero.trim()) return;
    setBusy(true);
    try {
      const r: any = await listFacturesPaginated({ numero: numero.trim(), per_page: 1, page: 1 });
      const hit = r?.data?.[0];
      if (!hit) { setF(null); alert("Aucune facture trouvée"); }
      else {
        const full = await getFactureFull(hit.id);
        setF(full);
        setAmount(Number(full.montant_du || 0));
      }
    } finally { setBusy(false); }
  }

  async function encaisser() {
    if (!f) return;
    try {
      await encaisserFacture(f.id, { montant: Number(amount||0), mode, reference: ref || undefined });
      const full = await getFactureFull(f.id);
      setF(full);
      setAmount(Number(full.montant_du || 0));
      setRef("");
      alert("Paiement enregistré.");
    } catch (e:any) {
      console.error("Encaissement FAIL:", e?.status, e); // ⬅️ pour diagnostiquer 403/409/422/500
      alert(e?.message || "Échec encaissement");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Encaissement rapide" subtitle="Recherche par numéro & règlement" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <form onSubmit={searchByNumero} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input value={numero} onChange={(e)=>setNumero(e.target.value)} placeholder="Numéro de facture (FAC-…)" className="w-full rounded-lg border border-ink-100 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20" />
            </div>
            <button className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm hover:bg-ink-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}</button>
          </div>
        </form>

        {f && (
          <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm space-y-4">
            <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 text-sm">
              <div><b>N°</b> {f.numero} • <b>Statut</b> {f.statut}</div>
              <div><b>Total</b> {Number(f.montant_total).toLocaleString()} {f.devise} • <b>Reste</b> {Number(f.montant_du).toLocaleString()} {f.devise}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-600">Montant</label>
                <input type="number" value={amount} onChange={(e)=>setAmount(parseFloat(e.target.value||"0"))} className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600">Mode</label>
                <select value={mode} onChange={(e)=>setMode(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm">
                  <option value="cash">Espèces</option>
                  <option value="momo">Mobile Money</option>
                  <option value="card">Carte</option>
                  <option value="cheque">Chèque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600">Référence</label>
                <input value={ref} onChange={(e)=>setRef(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-3">
                <button onClick={encaisser} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
                  <CreditCard className="h-4 w-4" /> Encaisser
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
