"use client";

import { useEffect, useState } from "react";
import { getDci, updateDci, type DciDTO } from "@/lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Guarded from "@/components/admin/Guarded";

export default function DciEditPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [item, setItem] = useState<DciDTO | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    getDci(id).then((d:any)=> {
      setItem(d);
      setName(d.name ?? "");
      setDesc(d.description ?? "");
    }).catch(e=>alert(e.message || "Erreur chargement"));
  }, [id]);

  const onSave = async () => {
    try {
      await updateDci(id, { name, description: desc });
      router.push("/pharmacie/admin/dcis");
    } catch (e:any) {
      alert(e.message || "Erreur sauvegarde");
    }
  };

  return (
    <Guarded>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Modifier DCI #{id}</h1>
          <Link href="/pharmacie/admin/dcis" className="text-congo-green underline">← Retour</Link>
        </div>
        {!item ? (
          <div>Chargement…</div>
        ) : (
          <div className="rounded-lg border bg-white p-4 grid gap-3">
            <input value={name} onChange={e=>setName(e.target.value)} className="px-3 py-2 rounded border" placeholder="Nom" />
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} className="px-3 py-2 rounded border" placeholder="Description" />
            <div>
              <button onClick={onSave} className="px-4 py-2 rounded bg-blue-600 text-white">Enregistrer</button>
            </div>
          </div>
        )}
      </div>
    </Guarded>
  );
}
