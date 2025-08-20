"use client";

import { useMemo, useState } from "react";
import { ServiceGuard } from "@/components/guards";
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  FileText,
  Printer,
  ShieldCheck,
  LogIn,
  LogOut,
  DollarSign,
  Barcode,
} from "lucide-react";

// Types minimaux

type Role = "agent" | "superuser";

type Produit = {
  id: string;
  libelle: string;
  prix: number;
  stock: number;
  seuil: number;
  code?: string;
};

type Ligne = { produitId: string; libelle: string; qte: number; prix: number; total: number };

type Facture = {
  id: string;
  date: string;
  lignes: Ligne[];
  totalHT: number;
  totalTTC: number;
};

const TVA = 0.0; // adapter si besoin

const PRODUITS_INIT: Produit[] = [
  { id: "P-0001", libelle: "Paracétamol 500mg (10)", prix: 1200, stock: 40, seuil: 10, code: "PARA500" },
  { id: "P-0002", libelle: "Amoxicilline 500mg (16)", prix: 3500, stock: 18, seuil: 8, code: "AMOX500" },
  { id: "P-0003", libelle: "Gants Nitrile (x100)", prix: 9000, stock: 6, seuil: 5, code: "GANT100" },
  { id: "P-0004", libelle: "Sérum physiologique 0,9% 500ml", prix: 2500, stock: 25, seuil: 10, code: "SERUM500" },
];

export default function Page() {
  // Rôle / session (démo: simple bascule locale)
  const [role, setRole] = useState<Role>("agent");

  // Données
  const [produits, setProduits] = useState<Produit[]>(PRODUITS_INIT);
  const [factures, setFactures] = useState<Facture[]>([]);

  // Panier
  const [panier, setPanier] = useState<Record<string, number>>({}); // produitId -> qte
  const [q, setQ] = useState("");

  // Modaux (superuser)
  const [openNew, setOpenNew] = useState(false);
  const [openStock, setOpenStock] = useState<null | Produit>(null);

  // Formulaire ajout produit
  const [fLib, setFLib] = useState("");
  const [fPrix, setFPrix] = useState<number | "">("");
  const [fStock, setFStock] = useState<number | "">("");
  const [fSeuil, setFSeuil] = useState<number | "">(5);
  const [fCode, setFCode] = useState("");

  const produitsFiltres = useMemo(() => {
    const s = q.trim().toLowerCase();
    let l = [...produits];
    if (s) l = l.filter(p => p.libelle.toLowerCase().includes(s) || p.id.toLowerCase().includes(s) || (p.code?.toLowerCase().includes(s) ?? false));
    l.sort((a,b) => a.libelle.localeCompare(b.libelle));
    return l;
  }, [produits, q]);

  const alertes = useMemo(() => produits.filter(p => p.stock <= p.seuil), [produits]);

  function reserverDisponible(p: Produit): number {
    const reserved = panier[p.id] ?? 0;
    return Math.max(0, p.stock - reserved);
  }

  function addToCart(p: Produit) {
    const dispo = reserverDisponible(p);
    if (dispo <= 0) return alert("Stock insuffisant pour cet article.");
    setPanier(prev => ({ ...prev, [p.id]: (prev[p.id] ?? 0) + 1 }));
  }

  function removeFromCart(pid: string) {
    setPanier(prev => {
      const q = (prev[pid] ?? 0) - 1;
      const next = { ...prev };
      if (q <= 0) delete next[pid];
      else next[pid] = q;
      return next;
    });
  }

  function deleteFromCart(pid: string) {
    setPanier(prev => {
      const next = { ...prev };
      delete next[pid];
      return next;
    });
  }

  const lignesPanier: Ligne[] = useMemo(() => {
    return Object.entries(panier).map(([pid, qte]) => {
      const p = produits.find(x => x.id === pid)!;
      const total = p.prix * qte;
      return { produitId: p.id, libelle: p.libelle, qte, prix: p.prix, total };
    });
  }, [panier, produits]);

  const totalHT = useMemo(() => lignesPanier.reduce((s, l) => s + l.total, 0), [lignesPanier]);
  const totalTTC = useMemo(() => Math.round(totalHT * (1 + TVA)), [totalHT]);

  function nextFactureId(): string {
    const base = factures.reduce((max, f) => {
      const m = f.id.match(/INV-(\d+)/);
      if (!m) return max;
      return Math.max(max, parseInt(m[1]!, 10));
    }, 0);
    const next = base + 1;
    return `INV-${String(next).padStart(6, "0")}`;
  }

  function validerVente() {
    if (lignesPanier.length === 0) return alert("Panier vide.");

    for (const l of lignesPanier) {
      const p = produits.find(x => x.id === l.produitId)!;
      if (l.qte > p.stock) return alert(`Stock insuffisant pour: ${p.libelle}`);
    }

    const id = nextFactureId();
    const facture: Facture = {
      id,
      date: new Date().toISOString(),
      lignes: lignesPanier,
      totalHT,
      totalTTC,
    };

    setFactures(prev => [facture, ...prev]);

    setProduits(prev => prev.map(p => {
      const qte = panier[p.id] ?? 0;
      return qte ? { ...p, stock: p.stock - qte } : p;
    }));

    setPanier({});
    alert(`Vente validée. Facture ${id}`);
  }

  function openRestock(p: Produit) {
    setOpenStock(p);
    setFPrix(p.prix);
    setFStock(0);
    setFSeuil(p.seuil);
    setFLib(p.libelle);
    setFCode(p.code || "");
  }

  function saveRestock() {
    if (!openStock) return;
    const add = Number(fStock) || 0;
    const prix = Number(fPrix) || openStock.prix;
    const seuil = Number(fSeuil) || openStock.seuil;

    setProduits(prev => prev.map(p => p.id === openStock.id ? { ...p, prix, stock: p.stock + add, seuil, libelle: fLib.trim() || p.libelle, code: fCode.trim() || p.code } : p));
    setOpenStock(null);
  }

  function saveNew() {
    if (!fLib.trim() || !fPrix || !fStock) return alert("Renseigner libellé, prix, stock.");
    const idBase = produits.reduce((m, p) => Math.max(m, parseInt(p.id.split("-")[1] || "0")), 0) + 1;
    const id = `P-${String(idBase).padStart(4, "0")}`;
    const nouveau: Produit = {
      id,
      libelle: fLib.trim(),
      prix: Number(fPrix),
      stock: Number(fStock),
      seuil: Number(fSeuil) || 5,
      code: fCode.trim() || undefined,
    };
    setProduits(prev => [nouveau, ...prev]);
    setOpenNew(false);
    setFLib("");
    setFPrix("");
    setFStock("");
    setFSeuil(5);
    setFCode("");
  }

  function connecterSuperuser() {
    const key = prompt("Code superuser ?")?.trim();
    if (key === "admin123") setRole("superuser");
    else alert("Code invalide");
  }

  function deconnexion() {
    setRole("agent");
  }

  return (
    <ServiceGuard service="pharmacie">
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
            <h1 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5"/> Pharmacie</h1>
            <div className="ml-auto flex items-center gap-2">
              {role === "superuser" ? (
                <button onClick={deconnexion} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-50"><LogOut className="h-4 w-4"/> Déconnexion</button>
              ) : (
                <button onClick={connecterSuperuser} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-50"><LogIn className="h-4 w-4"/> Superuser</button>
              )}
              {role === "superuser" && (
                <button onClick={() => setOpenNew(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"><Plus className="h-4 w-4"/> Nouveau produit</button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 grid gap-6 md:grid-cols-3">
          <section className="md:col-span-2">
            {alertes.length > 0 && (
              <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 mt-0.5"/>
                <div className="text-sm">
                  <div className="font-semibold">Alerte seuil</div>
                  <ul className="list-disc pl-5">
                    {alertes.map(a => (
                      <li key={a.id}>{a.libelle} — stock {a.stock} / seuil {a.seuil}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="rounded-2xl border bg-white p-3">
              <div className="flex items-center gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher produit, code, ID"
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Produit</th>
                      <th className="px-3 py-2 text-left">Prix</th>
                      <th className="px-3 py-2 text-left">Stock</th>
                      <th className="px-3 py-2 text-left">Code</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produitsFiltres.map(p => (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{p.libelle}</div>
                          <div className="text-xs text-slate-500">{p.id}</div>
                        </td>
                        <td className="px-3 py-2">{p.prix.toLocaleString()} FCFA</td>
                        <td className="px-3 py-2">{p.stock} {p.stock <= p.seuil && <span className="ml-2 text-amber-700">(bas)</span>}</td>
                        <td className="px-3 py-2">{p.code || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => addToCart(p)} disabled={reserverDisponible(p) <= 0} className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50"><ShoppingCart className="h-4 w-4"/> Ajouter</button>
                            {role === "superuser" && (
                              <button onClick={() => openRestock(p)} className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 hover:bg-slate-50"><ShieldCheck className="h-4 w-4"/> Stock</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {produitsFiltres.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-slate-500">Aucun produit.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="md:col-span-1">
            <div className="rounded-2xl border bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4"/> Panier</div>
                <div className="text-sm text-slate-600">{Object.keys(panier).length} article(s)</div>
              </div>

              <div className="mt-3 space-y-2">
                {lignesPanier.map(l => (
                  <div key={l.produitId} className="rounded-xl border p-2 flex items-center gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{l.libelle}</div>
                      <div className="text-xs text-slate-500">{l.prix.toLocaleString()} FCFA</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(l.produitId)} className="rounded-lg border px-2 py-1"><Minus className="h-4 w-4"/></button>
                      <div className="w-8 text-center">{l.qte}</div>
                      <button onClick={() => addToCart(produits.find(p => p.id === l.produitId)!)} className="rounded-lg border px-2 py-1"><Plus className="h-4 w-4"/></button>
                    </div>
                    <div className="w-24 text-right font-semibold">{l.total.toLocaleString()} FCFA</div>
                    <button onClick={() => deleteFromCart(l.produitId)} className="rounded-lg border px-2 py-1 ml-2"><Trash2 className="h-4 w-4"/></button>
                  </div>
                ))}
                {lignesPanier.length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-8">Panier vide</div>
                )}
              </div>

              <div className="mt-3 border-t pt-3 text-sm">
                <div className="flex justify-between"><span>Total HT</span><span className="font-semibold">{totalHT.toLocaleString()} FCFA</span></div>
                <div className="flex justify-between"><span>TVA</span><span>{Math.round(totalHT * TVA).toLocaleString()} FCFA</span></div>
                <div className="flex justify-between text-base font-semibold"><span>Total TTC</span><span>{totalTTC.toLocaleString()} FCFA</span></div>
                <button onClick={validerVente} disabled={lignesPanier.length === 0} className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"><FileText className="h-4 w-4"/> Valider & Facturer</button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border bg-white p-3">
              <div className="font-semibold flex items-center gap-2"><Barcode className="h-4 w-4"/> Factures</div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Total</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factures.map(f => (
                      <tr key={f.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{f.id}</td>
                        <td className="px-3 py-2">{new Date(f.date).toLocaleString()}</td>
                        <td className="px-3 py-2">{f.totalTTC.toLocaleString()} FCFA</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 hover:bg-slate-50"><Printer className="h-4 w-4"/> Imprimer</button>
                        </td>
                      </tr>
                    ))}
                    {factures.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-slate-500">Aucune facture pour le moment.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </aside>
        </main>
      </div>

      {role === "superuser" && (
        <>
          {openNew && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-xl rounded-2xl border bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Nouveau produit</div>
                  <button onClick={() => setOpenNew(false)} className="rounded-lg p-1 hover:bg-slate-100" aria-label="Fermer">✕</button>
                </div>
                <div className="px-4 py-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">Libellé</label>
                    <input value={fLib} onChange={(e)=>setFLib(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"/>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Prix (FCFA)</label>
                    <input type="number" value={fPrix} onChange={(e)=>setFPrix(Number(e.target.value))} className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"/>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Stock initial</label>
                    <input type="number" value={fStock} onChange={(e)=>setFStock(Number(e.target.value))} className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"/>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Seuil</label>
                    <input type="number" value={fSeuil} onChange={(e)=>setFSeuil(Number(e.target.value))} className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"/>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Code</label>
                    <input value={fCode} onChange={(e)=>setFCode(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"/>
                  </div>
                </div>
                <div className="border-t px-4 py-3 flex justify-end gap-2">
                  <button onClick={() => setOpenNew(false)} className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-slate-50">Annuler</button>
                  <button onClick={saveNew} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Enregistrer</button>
                </div>
              </div>
            </div>
          )}

          {openStock && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-xl rounded-2xl border bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Ajuster stock</div>
                  <button onClick={() => setOpenStock(null)} className="rounded-lg p-1 hover:bg-slate-100" aria-label="Fermer">✕</button>
                </div>
                <div className="px-4 py-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2 text-sm text-slate-600">{openStock.libelle} — Actuel: <span className="font-semibold">{openStock.stock}</span></div>
                  <div>
                    <label className="text-sm font-medium">Ajouter au stock</label>
                    <input type="number" value={fStock} onChange={(e)=>setFStock(Number(e.target.value))} className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"/>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Seuil</label>
                    <input type="number" value={fSeuil} onChange={(e)=>setFSeuil(Number(e.target.value))} className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"/>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Prix (FCFA)</label>
                    <input type="number" value={fPrix} onChange={(e)=>setFPrix(Number(e.target.value))} className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"/>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">Libellé</label>
                    <input value={fLib} onChange={(e)=>setFLib(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"/>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Code</label>
                    <input value={fCode} onChange={(e)=>setFCode(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"/>
                  </div>
                </div>
                <div className="border-t px-4 py-3 flex justify-end gap-2">
                  <button onClick={() => setOpenStock(null)} className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-slate-50">Annuler</button>
                  <button onClick={saveRestock} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Enregistrer</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </ServiceGuard>
  );
}
