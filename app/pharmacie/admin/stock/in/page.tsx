// app/pharmacie/admin/stock/in/page.tsx
"use client";

import { useEffect, useState } from "react";
import { listArticles, stockIn } from "@/lib/api";

export default function StockInPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    article_id: "", quantity: "", lot_number: "", expires_at: "", unit_price: "", sell_price: "", supplier: "", reference: ""
  });
  const [msg, setMsg] = useState<string>("");

  useEffect(()=>{ (async()=>{
    const p = await listArticles({ per_page: 100 });
    setArticles(p.data);
  })(); },[]);

  const save = async () => {
    const payload:any = {};
    for (const [k,v] of Object.entries(form)) {
      if (v === "" || v === null || typeof v === "undefined") continue;
      if (["article_id","quantity","unit_price","sell_price"].includes(k)) payload[k] = Number(v);
      else payload[k] = v;
    }
    const r = await stockIn(payload);
    setMsg("Entrée enregistrée. Lot: " + (r?.lot?.lot_number ?? ""));
  };

  return (
    <div className="px-4 py-6 space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">Entrée stock (IN)</h1>

      {!!msg && <div className="p-3 rounded border bg-green-50 text-green-800">{msg}</div>}

      <div className="grid sm:grid-cols-2 gap-3 bg-white rounded-lg border p-4">
        <label className="grid gap-1">
          <span>Article *</span>
          <select className="px-3 py-2 rounded border" value={form.article_id} onChange={e=>setForm((f:any)=>({...f,article_id:e.target.value}))}>
            <option value="">—</option>
            {articles.map(a=> <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
          </select>
        </label>

        <label className="grid gap-1">
          <span>Quantité *</span>
          <input className="px-3 py-2 rounded border" value={form.quantity} onChange={e=>setForm((f:any)=>({...f,quantity:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Lot (optionnel)</span>
          <input className="px-3 py-2 rounded border" value={form.lot_number} onChange={e=>setForm((f:any)=>({...f,lot_number:e.target.value}))} placeholder="L2025-00001…" />
        </label>

        <label className="grid gap-1">
          <span>Expiration</span>
          <input type="date" className="px-3 py-2 rounded border" value={form.expires_at} onChange={e=>setForm((f:any)=>({...f,expires_at:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Prix achat (optionnel)</span>
          <input className="px-3 py-2 rounded border" value={form.unit_price} onChange={e=>setForm((f:any)=>({...f,unit_price:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Prix vente (optionnel)</span>
          <input className="px-3 py-2 rounded border" value={form.sell_price} onChange={e=>setForm((f:any)=>({...f,sell_price:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Fournisseur</span>
          <input className="px-3 py-2 rounded border" value={form.supplier} onChange={e=>setForm((f:any)=>({...f,supplier:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Référence</span>
          <input className="px-3 py-2 rounded border" value={form.reference} onChange={e=>setForm((f:any)=>({...f,reference:e.target.value}))} />
        </label>
      </div>

      <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white" disabled={!form.article_id || !form.quantity}>Enregistrer</button>
    </div>
  );
}
