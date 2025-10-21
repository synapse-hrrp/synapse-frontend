"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import VisiteFormPro from "@/components/VisiteFormPro";
import { getVisite } from "@/lib/api";
import { useAuthz } from "@/lib/authz";

export default function VisiteEdit({ id, contextLabel="Réception" }:{ id:string; contextLabel?:string }) {
  const { canAny } = useAuthz();
  const allow = canAny(["visites.write"]);
  const [initial,setInitial]=useState<any>(null);
  const [err,setErr]=useState<string|null>(null);

  useEffect(()=>{
    if(!allow){ setErr("forbidden"); return; }
    (async()=>{
      try { const r:any = await getVisite(id); setInitial(Array.isArray(r)? r[0] : (r.data ?? r)); }
      catch(e:any){ setErr(e?.message||"Erreur"); }
    })();
  },[id,allow]);

  if (!allow) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm">
        <div className="text-lg font-semibold text-ink-900">Accès refusé</div>
        <p className="text-sm text-ink-600 mt-1">Vous n’avez pas la permission de modifier cette visite.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-600">
        <ol className="flex items-center gap-2">
          <li>{contextLabel}</li><li aria-hidden>/</li>
          <li>Admissions</li><li aria-hidden>/</li>
          <li className="font-medium text-ink-900">Édition</li>
        </ol>
      </nav>

      {!initial && !err && <div className="text-sm text-ink-600">Chargement…</div>}
      {err && <div className="text-sm text-congo-red">{err}</div>}
      {initial && (
        // ⚠️ si ton VisiteFormPro supporte {initialData} → passe-le ici
        <VisiteFormPro initialData={initial} />
      )}

      <div><Link href={`/reception/visites/${id}`} className="text-sm underline">↩ Retour au détail</Link></div>
    </div>
  );
}
