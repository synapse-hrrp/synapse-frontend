// app/pharmacie/admin/stock/out/page.tsx
"use client";

import { useEffect, useState } from "react";
import { listArticles, stockOut } from "@/lib/api";

export default function StockOutPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    article_id: "", quantity: "", reason: "sale", reference: ""
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
      if (["article_id","quantity"].includes(k)) payload[k] = Number(v);
      else payload[k] = v;
    }
    const r = await stockOut(payload);
    setMsg(`Sortie OK: ${r?.dispatched ?? ""} unités`);
  };

  return (
    <div className="px-4 py-6 space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">Sortie stock (OUT)</h1>

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
          <span>Motif</span>
          <select className="px-3 py-2 rounded border" value={form.reason} onChange={e=>setForm((f:any)=>({...f,reason:e.target.value}))}>
            <option value="sale">Vente</option>
            <option value="transfer">Transfert</option>
            <option value="waste">Casse</option>
          </select>
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
