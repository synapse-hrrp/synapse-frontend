"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuthz } from "@/lib/authz";
import VisiteFormPro from "@/components/VisiteFormPro";

export default function ReceptionNewVisitePage() {
  const { isAuthenticated, isAdmin, can } = useAuthz();

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.replace("/login?next=/reception/visites/new");
      return;
    }
    if (!isAdmin && !can("visites.write")) {
      window.location.replace("/reception/visites");
    }
  }, [isAuthenticated, isAdmin, can]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Nouvelle visite</h2>
          <p className="text-xs text-ink-600">Enregistrer un passage patient</p>
        </div>
        <Link href="/reception/visites" className="text-sm text-congo-green hover:underline">
          ← Retour à la liste
        </Link>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
        {/* Le formulaire gère l’appel API. S’il supporte une prop `afterSaveHref`,
           passe `afterSaveHref="/reception/visites"`. Sinon laisse par défaut. */}
        <VisiteFormPro />
      </div>
    </div>
  );
}
