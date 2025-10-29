// app/pharmacie/admin/dcis/new/page.tsx
"use client";

import { useState } from "react";
import { createDci } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DciCreatePage() {
  const [name, setName] = useState("");
  const [description, setDesc] = useState("");
  const router = useRouter();

  return (
    <div className="px-4 py-6 space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nouvelle DCI</h1>
        <Link href="/pharmacie/admin/dcis" className="text-congo-green underline">← Retour</Link>
      </div>
      <label className="grid gap-1">
        <span>Nom *</span>
        <input className="px-3 py-2 rounded border" value={name} onChange={e=>setName(e.target.value)} />
      </label>
      <label className="grid gap-1">
        <span>Description</span>
        <textarea className="px-3 py-2 rounded border" value={description} onChange={e=>setDesc(e.target.value)} />
      </label>
      <button
        className="px-4 py-2 rounded bg-blue-600 text-white"
        onClick={async()=>{
          await createDci({ name, description: description || undefined });
          router.push("/pharmacie/admin/dcis");
        }}
        disabled={!name.trim()}
      >
        Enregistrer
      </button>
    </div>
  );
}
