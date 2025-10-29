// app/pharmacie/admin/dcis/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getDci, updateDci } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function DciEditPage() {
  const { id } = useParams() as { id: string };
  const [form, setForm] = useState<{name:string;description?:string}>({ name:"", description:"" });
  const router = useRouter();

  useEffect(()=>{ (async()=>{
    const d = await getDci(id);
    setForm({ name: d.name ?? "", description: d.description ?? "" });
  })(); },[id]);

  return (
    <div className="px-4 py-6 space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Modifier DCI #{id}</h1>
        <Link href="/pharmacie/admin/dcis" className="text-congo-green underline">← Retour</Link>
      </div>
      <label className="grid gap-1">
        <span>Nom *</span>
        <input className="px-3 py-2 rounded border" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
      </label>
      <label className="grid gap-1">
        <span>Description</span>
        <textarea className="px-3 py-2 rounded border" value={form.description ?? ""} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
      </label>
      <button
        className="px-4 py-2 rounded bg-blue-600 text-white"
        onClick={async()=>{
          const payload:any = {};
          if (form.name.trim()) payload.name = form.name.trim();
          if (form.description?.trim()) payload.description = form.description.trim();
          await updateDci(id, payload);
          router.push("/pharmacie/admin/dcis");
        }}
        disabled={!form.name.trim()}
      >
        Enregistrer
      </button>
    </div>
  );
}
