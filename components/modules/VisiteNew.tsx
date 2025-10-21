"use client";
import Link from "next/link";
import { useAuthz } from "@/lib/authz";
import VisiteFormPro from "@/components/VisiteFormPro";

export default function VisiteNew({ contextLabel="Réception" }:{ contextLabel?:string }) {
  const { canAny } = useAuthz();
  const allow = canAny(["visites.write"]);
  if (!allow) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm">
        <div className="text-lg font-semibold text-ink-900">Accès refusé</div>
        <p className="text-sm text-ink-600 mt-1">Vous n’avez pas la permission de créer une visite.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-600">
        <ol className="flex items-center gap-2">
          <li>{contextLabel}</li><li aria-hidden>/</li>
          <li>Admissions</li><li aria-hidden>/</li>
          <li className="font-medium text-ink-900">Nouvelle</li>
        </ol>
      </nav>
      <VisiteFormPro />
      <div><Link href="/reception/visites" className="text-sm underline">↩ Retour à la liste</Link></div>
    </div>
  );
}
