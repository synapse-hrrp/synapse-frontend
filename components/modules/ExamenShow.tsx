"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getExamen } from "@/lib/api";
import { useAuthz } from "@/lib/authz";
import { Pencil } from "lucide-react";

type R = {
  id:string;
  patient?: { id:string; nom:string; prenom:string; numero_dossier?:string }|null;
  patient_id: string;
  service?: { slug:string; name:string }|null;
  service_slug?: string|null;

  type_origine: "interne"|"externe";
  prescripteur_externe?: string|null;
  reference_demande?: string|null;

  code_examen?: string|null;
  nom_examen?: string|null;
  prelevement?: string|null;
  statut: "en_attente"|"en_cours"|"termine"|"valide";

  valeur_resultat?: string|null;
  unite?: string|null;
  intervalle_reference?: string|null;

  resultat_json?: any;
  prix?: string|number|null;
  devise?: string|null;

  demande_par?: { id:number; full_name?:string }|number|null;
  valide_par?: { id:number; full_name?:string }|number|null;

  date_demande?: string|null;
  date_validation?: string|null;
};

export default function ExamenShow({
  id,
  contextLabel="Laboratoire",
  basePath="/laboratoire/examens"
}:{ id:string; contextLabel?:string; basePath?:string }) {
  const { canAny } = useAuthz();
  const allowView = canAny(["examen.view"]);
  const allowEdit = canAny(["examen.result.write"]);

  const [row,setRow]=useState<R|null>(null);
  const [err,setErr]=useState<string|null>(null);

  useEffect(()=>{
    if(!allowView){ setErr("forbidden"); return; }
    (async ()=>{
      try{
        const r:any = await getExamen(id);
        const d = Array.isArray(r) ? r[0] : (r.data ?? r);
        setRow(d);
      }catch(e:any){
        setErr(e?.message || "Erreur de chargement");
      }
    })();
  },[id,allowView]);

  if (!allowView) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm">
        <div className="text-lg font-semibold text-ink-900">Accès refusé</div>
        <p className="text-sm text-ink-600 mt-1">Vous n’avez pas la permission de consulter cet examen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>{contextLabel}</li><li aria-hidden>/</li>
            <li><Link href={basePath} className="underline">Examens</Link></li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Détail</li>
          </ol>
        </nav>
        <div className="inline-flex items-center gap-2">
          <Link href={basePath} className="rounded-lg border px-3 py-2 text-sm">↩ Liste</Link>
          {allowEdit && row && (
            <Link href={`${basePath}/${row.id}/edit`} className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white">
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
        {!row && !err && <div className="text-sm text-ink-600">Chargement…</div>}
        {err && <div className="text-sm text-congo-red">{err}</div>}
        {row && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><b>Date demande:</b> {row.date_demande ? new Date(row.date_demande).toLocaleString() : "—"}</div>
            <div><b>Statut:</b> {row.statut}</div>
            <div><b>Patient:</b> {row.patient ? `${row.patient.nom} ${row.patient.prenom}` : row.patient_id} {row.patient?.numero_dossier && <em className="text-ink-500">({row.patient.numero_dossier})</em>}</div>
            <div><b>Service:</b> {row.service?.name ?? row.service_slug ?? "—"}</div>
            <div><b>Origine:</b> {row.type_origine}</div>
            <div><b>Prescripteur ext.:</b> {row.prescripteur_externe ?? "—"}</div>
            <div><b>Réf. demande:</b> {row.reference_demande ?? "—"}</div>

            <div className="sm:col-span-2 h-px bg-ink-100 my-2" />

            <div><b>Code:</b> {row.code_examen ?? "—"}</div>
            <div><b>Examen:</b> {row.nom_examen ?? "—"}</div>
            <div><b>Prélèvement:</b> {row.prelevement ?? "—"}</div>
            <div><b>Prix:</b> {row.prix!=null ? `${row.prix} ${row.devise||""}` : "—"}</div>

            <div className="sm:col-span-2 h-px bg-ink-100 my-2" />

            <div><b>Résultat:</b> {row.valeur_resultat ?? "—"} {row.unite ? ` ${row.unite}` : ""}</div>
            <div><b>Intervalle réf.:</b> {row.intervalle_reference ?? "—"}</div>

            <div className="sm:col-span-2 h-px bg-ink-100 my-2" />

            <div><b>Demandé par:</b> {typeof row.demande_par==="object" ? (row.demande_par?.full_name || row.demande_par?.id) : (row.demande_par ?? "—")}</div>
            <div><b>Validé par:</b> {typeof row.valide_par==="object" ? (row.valide_par?.full_name || row.valide_par?.id) : (row.valide_par ?? "—")}</div>
            <div><b>Date validation:</b> {row.date_validation ? new Date(row.date_validation).toLocaleString() : "—"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
