"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function ReactifNewPage(){
  const router = useRouter();
  const [busy,setBusy]=useState(false);
  const [f,setF]=useState({name:"",sku:"",uom:"unit",reorder_point:""});

  async function submit(e:React.FormEvent){
    e.preventDefault(); setBusy(true);
    try{
      await apiFetch("/inventory/reagents",{method:"POST",body:{
        name:f.name.trim(), sku:f.sku.trim(), uom:f.uom.trim()||"unit",
        reorder_point: f.reorder_point===""?0:Number(f.reorder_point)
      }});
      router.push("/stock-reactifs/reactifs?flash=created");
    }catch(e:any){ alert(e?.message||"Erreur"); } finally{ setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <form onSubmit={submit} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <h1 className="text-lg font-semibold">Nouveau réactif</h1>
        <Field label="Nom *"><input required value={f.name} onChange={e=>setF(v=>({...v,name:e.target.value}))} className="input"/></Field>
        <Field label="SKU *"><input required value={f.sku} onChange={e=>setF(v=>({...v,sku:e.target.value}))} className="input font-mono"/></Field>
        <Field label="UoM *"><input required value={f.uom} onChange={e=>setF(v=>({...v,uom:e.target.value}))} className="input" placeholder="mL, g, pcs…"/></Field>
        <Field label="Point de réappro."><input type="number" value={f.reorder_point} onChange={e=>setF(v=>({...v,reorder_point:e.target.value}))} className="input"/></Field>
        <div className="flex gap-2">
          <button disabled={busy} className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Enregistrer</button>
          <button type="button" onClick={()=>history.back()} className="rounded-lg border px-3 py-2 text-sm">Annuler</button>
        </div>
        <style jsx>{`.input{@apply w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20}`}</style>
      </form>
    </main>
  );
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="grid gap-1 text-sm"><span className="text-ink-600">{label}</span>{children}</label>;}
