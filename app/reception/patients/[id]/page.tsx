"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AbilityGuard } from "@/lib/authz";
import { getPatient } from "@/lib/api";

type Patient = {
  id: string;
  numero_dossier?: string;
  nom?: string;
  prenom?: string;
  sexe?: string|null;
  date_naissance?: string|null;
  telephone?: string|null;
  groupe_sanguin?: string|null;
  is_active?: boolean;
  // ajoute les champs dont tu as besoin
};

export default function ReceptionPatientShowPage({ params }: { params: { id: string } }) {
  const [p, setP] = useState<Patient | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abo = false;
    (async () => {
      try {
        const data = await getPatient(params.id);
        if (!abo) setP(data);
      } catch (e: any) {
        if (!abo) setErr(e?.message || "Erreur de chargement");
      }
    })();
    return () => { abo = true; };
  }, [params.id]);

  return (
    <AbilityGuard anyOf={["patients.view","patients.read"]}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Dossier patient</h2>
            <p className="text-xs text-ink-600">Consultation des informations</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/reception/patients" className="text-congo-green hover:underline">← Retour</Link>
            <AbilityGuard anyOf={["patients.update","patients.write"]}>
              <Link
                href={`/reception/patients/${params.id}/edit`}
                className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 hover:bg-ink-50"
              >
                Modifier
              </Link>
            </AbilityGuard>
          </div>
        </div>

        {err && <p className="text-sm text-congo-red">{err}</p>}
        {!p && !err && <p className="text-sm text-ink-600">Chargement…</p>}

        {p && (
          <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm text-sm">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              <div><dt className="text-ink-500">N° dossier</dt><dd className="font-medium">{p.numero_dossier ?? "—"}</dd></div>
              <div><dt className="text-ink-500">Nom</dt><dd className="font-medium">{`${p.nom ?? ""} ${p.prenom ?? ""}`.trim() || "—"}</dd></div>
              <div><dt className="text-ink-500">Sexe</dt><dd className="font-medium">{p.sexe ?? "—"}</dd></div>
              <div><dt className="text-ink-500">Date de naissance</dt><dd className="font-medium">{p.date_naissance ?? "—"}</dd></div>
              <div><dt className="text-ink-500">Téléphone</dt><dd className="font-medium">{p.telephone ?? "—"}</dd></div>
              <div><dt className="text-ink-500">Groupe sanguin</dt><dd className="font-medium">{p.groupe_sanguin ?? "—"}</dd></div>
              <div><dt className="text-ink-500">Statut</dt>
                <dd><span className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? "bg-congo-greenL text-congo-green":"bg-ink-200 text-ink-700"}`}>
                  {p.is_active ? "Actif":"Inactif"}
                </span></dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </AbilityGuard>
  );
}
