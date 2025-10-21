"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getVisite } from "@/lib/api";
import { useAuthz } from "@/lib/authz";
import { Pencil } from "lucide-react";

type Row = {
  id:string|number;
  plaintes_motif:string;
  created_at?:string;
  patient?: { nom:string; prenom:string; numero_dossier?:string } | null;
  service?: { name:string } | null;
};

export default function VisiteShow({ id, contextLabel="Réception" }:{ id:string; contextLabel?:string }) {
  const { canAny } = useAuthz();
  const allowView = canAny(["visites.read"]);
  const allowEdit = canAny(["visites.write"]);

  const [row,setRow]=useState<Row|null>(null);
  const [err,setErr]=useState<string|null>(null);

  useEffect(()=>{
    if(!allowView){ setErr("forbidden"); return; }
    (async()=>{
      try { const r:any = await getVisite(id); setRow(Array.isArray(r)? r[0] : (r.data ?? r)); }
      catch(e:any){ setErr(e?.message || "Erreur"); }
    })();
  },[id,allowView]);

  if (!allowView) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm">
        <div className="text-lg font-semibold text-ink-900">Accès refusé</div>
        <p className="text-sm text-ink-600 mt-1">Vous n’avez pas la permission de consulter cette visite.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>{contextLabel}</li><li aria-hidden>/</li>
            <li>Admissions</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Détail</li>
          </ol>
        </nav>
        <div className="inline-flex items-center gap-2">
          <Link href="/reception/visites" className="rounded-lg border px-3 py-2 text-sm">↩ Liste</Link>
          {allowEdit && row && (
            <Link href={`/reception/visites/${row.id}/edit`} className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white">
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
        {!row && !err && <div className="text-sm text-ink-600">Chargement…</div>}
        {err && <div className="text-sm text-congo-red">{err}</div>}
        {row && (
          <div className="space-y-2 text-sm">
            <div><b>Date:</b> {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</div>
            <div><b>Patient:</b> {row.patient ? `${row.patient.nom} ${row.patient.prenom}` : "—"}
              {row.patient?.numero_dossier ? <span className="text-ink-500"> ({row.patient.numero_dossier})</span> : null}
            </div>
            <div><b>Service:</b> {row.service?.name ?? "—"}</div>
            <div><b>Motif:</b> {row.plaintes_motif}</div>
          </div>
        )}
      </div>
    </div>
  );
}
