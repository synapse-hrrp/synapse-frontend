"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getPatient } from "@/lib/api";
import { useAuthz } from "@/lib/authz";
import { Pencil } from "lucide-react";

type Patient = {
  id: string;
  numero_dossier: string;
  nom: string;
  prenom: string;
  sexe?: string | null;
  /** ✅ utilisée pour calculer l’âge */
  date_naissance?: string | null;
  /** ✅ repli si pas de date_naissance */
  age_reporte?: number | null;
  telephone?: string | null;
  groupe_sanguin?: string | null;
  is_active?: boolean;
};

/** ✅ calcule l'âge depuis DOB, sinon retourne age_reporte, sinon "—" */
function ageFrom(dob?: string | null, fallback?: number | null) {
  if (dob) {
    const d = new Date(dob + "T00:00:00");
    if (!isNaN(d.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
      return age >= 0 ? age : "—";
    }
  }
  return typeof fallback === "number" ? fallback : "—";
}

export default function PatientShow({
  id,
  contextLabel = "Réception",
}: {
  id: string;
  contextLabel?: string;
}) {
  const { canAny } = useAuthz();
  const allowView = canAny(["patients.read", "patients.view"]);
  const allowEdit = canAny(["patients.update", "patients.write"]);

  const [row, setRow] = useState<Patient | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!allowView) {
      setErr("forbidden");
      return;
    }
    (async () => {
      try {
        const r: any = await getPatient(id);
        setRow(Array.isArray(r) ? r[0] : r.data ?? r);
      } catch (e: any) {
        setErr(e?.message || "Erreur");
      }
    })();
  }, [id, allowView]);

  if (!allowView) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm">
        <div className="text-lg font-semibold text-ink-900">Accès refusé</div>
        <p className="text-sm text-ink-600 mt-1">
          Vous n’avez pas la permission de consulter ce patient.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fil d’ariane + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>{contextLabel}</li>
            <li aria-hidden>/</li>
            <li>Patients</li>
            <li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Détail</li>
          </ol>
        </nav>
        <div className="inline-flex items-center gap-2">
          <Link
            href="/reception/patients"
            className="rounded-lg border px-3 py-2 text-sm"
          >
            ↩ Liste
          </Link>
          {allowEdit && row && (
            <Link
              href={`/reception/patients/${row.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          )}
        </div>
      </div>

      {/* Carte détail */}
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
        {!row && !err && <div className="text-sm text-ink-600">Chargement…</div>}
        {err && <div className="text-sm text-congo-red">{err}</div>}
        {row && (
          <div className="space-y-2 text-sm">
            <div>
              <b>N° dossier :</b> {row.numero_dossier}
            </div>
            <div>
              <b>Patient :</b> {row.nom} {row.prenom}
            </div>
            <div>
              <b>Sexe :</b> {row.sexe ?? "—"}{" "}
              <span className="text-ink-400 mx-1">—</span>{" "}
              <b>Âge :</b> {ageFrom(row.date_naissance, row.age_reporte)}
            </div>
            <div>
              <b>Date de naissance :</b>{" "}
              {row.date_naissance
                ? new Date(row.date_naissance + "T00:00:00").toLocaleDateString()
                : "—"}
            </div>
            <div>
              <b>Téléphone :</b> {row.telephone ?? "—"}
            </div>
            <div>
              <b>Groupe sanguin :</b> {row.groupe_sanguin ?? "—"}
            </div>
            <div>
              <b>Statut :</b> {row.is_active ? "Actif" : "Inactif"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
