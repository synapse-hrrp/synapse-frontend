"use client";

import Link from "next/link";
import { AbilityGuard } from "@/lib/authz";
import PatientFormPro from "@/components/PatientFormPro";

export default function ReceptionPatientEditPage({ params }: { params: { id: string } }) {
  return (
    <AbilityGuard anyOf={["patients.update","patients.write"]}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Modifier le patient</h2>
            <p className="text-xs text-ink-600">Mettre à jour les informations</p>
          </div>
          <Link href={`/reception/patients/${params.id}`} className="text-sm text-congo-green hover:underline">
            ← Annuler
          </Link>
        </div>

        {/* ⤵️ passe l’ID et la redirection post-save vers la liste imbriquée */}
        <PatientFormPro patientId={params.id} afterSavePath="/reception/patients" />
      </div>
    </AbilityGuard>
  );
}
