"use client";
import Link from "next/link";
import { useAuthz } from "@/lib/authz";
import PatientFormPro from "@/components/PatientFormPro";
import { Plus } from "lucide-react";

export default function PatientNew({ contextLabel = "Réception" }:{ contextLabel?: string }) {
  const { canAny } = useAuthz();
  const allowCreate = canAny(["patients.create","patients.write"]);

  if (!allowCreate) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm">
        <div className="text-lg font-semibold text-ink-900">Accès refusé</div>
        <p className="text-sm text-ink-600 mt-1">Vous n’avez pas la permission de créer un patient.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>{contextLabel}</li><li aria-hidden>/</li>
            <li>Patients</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Nouveau</li>
          </ol>
        </nav>
      </div>

      {/* Ton formulaire pro tel quel */}
      <PatientFormPro />
    </div>
  );
}
