"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PatientFormPro from "@/components/PatientFormPro";
import { getPatient } from "@/lib/api";
import { useAuthz } from "@/lib/authz";

export default function PatientEdit({ id, contextLabel="Réception" }:{ id:string; contextLabel?:string }) {
  const { canAny } = useAuthz();
  const allowEdit = canAny(["patients.update","patients.write"]);
  const allowView = canAny(["patients.read","patients.view"]);

  const [initial,setInitial]=useState<any>(null);
  const [err,setErr]=useState<string|null>(null);

  useEffect(()=>{
    if(!allowEdit && !allowView){ setErr("forbidden"); return; }
    (async ()=>{
      try { const r:any = await getPatient(id); setInitial(Array.isArray(r)? r[0] : (r.data ?? r)); }
      catch(e:any){ setErr(e?.message||"Erreur"); }
    })();
  },[id,allowEdit,allowView]);

  if (!allowEdit) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm">
        <div className="text-lg font-semibold text-ink-900">Accès refusé</div>
        <p className="text-sm text-ink-600 mt-1">Vous n’avez pas la permission de modifier ce patient.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-600">
        <ol className="flex items-center gap-2">
          <li>{contextLabel}</li><li aria-hidden>/</li>
          <li>Patients</li><li aria-hidden>/</li>
          <li className="font-medium text-ink-900">Édition</li>
        </ol>
      </nav>

      {!initial && !err && <div className="text-sm text-ink-600">Chargement…</div>}
      {err && <div className="text-sm text-congo-red">{err}</div>}
      {initial && (
        // ⚠️ si ton PatientFormPro supporte {initialData} → passe-le ici
        <PatientFormPro initialData={initial} />
      )}

      <div>
        <Link href={`/reception/patients/${id}`} className="text-sm underline">↩ Retour au détail</Link>
      </div>
    </div>
  );
}
