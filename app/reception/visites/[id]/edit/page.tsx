"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthz } from "@/lib/authz";
import VisiteFormPro from "@/components/VisiteFormPro";

export default function ReceptionVisiteEditPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isAdmin, can } = useAuthz();

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.replace(`/login?next=/reception/visites/${id}/edit`);
      return;
    }
    if (!isAdmin && !can("visites.write")) {
      window.location.replace(`/reception/visites/${id}`);
    }
  }, [id, isAuthenticated, isAdmin, can]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Modifier la visite</h2>
          <p className="text-xs text-ink-600">Mettez à jour les informations</p>
        </div>
        <Link href={`/reception/visites/${id}`} className="text-sm text-congo-green hover:underline">
          ← Retour
        </Link>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
        {/* Si ton VisiteFormPro accepte une prop `visiteId`, préfère: */}
        {/* <VisiteFormPro visiteId={String(id)} afterSaveHref="/reception/visites" /> */}
        <VisiteFormPro />
      </div>
    </div>
  );
}
