"use client";

import Link from "next/link";
import { AbilityGuard } from "@/lib/authz";
import PatientFormPro from "@/components/PatientFormPro";

export default function ReceptionPatientNewPage() {
  return (
    <AbilityGuard anyOf={["patients.create","patients.write"]}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Nouveau patient</h2>
            <p className="text-xs text-ink-600">Créer un dossier et orienter le patient</p>
          </div>
          <Link
            href="/reception/patients"
            className="text-sm text-congo-green hover:underline"
          >
            ← Retour à la liste
          </Link>
        </div>

        {/* ⤵️ redirige sur la liste imbriquée après succès */}
        <PatientFormPro afterSavePath="/reception/patients" />
      </div>
    </AbilityGuard>
  );
}
