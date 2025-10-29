"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import VisiteFormPro from "@/components/VisiteFormPro";
import { getVisite } from "@/lib/api";
import { useAuthz } from "@/lib/authz";

type InitialForForm = {
  // patient sélectionné (pour l’étape 1)
  selectedPatient?: { id: string; numero_dossier?: string; nom?: string; prenom?: string } | null;

  // clés brutes / champs directs du form
  service_id?: number | "";
  motif?: string;
  hypothese?: string;
  affectation_id?: string | null;

  // médecin
  medecin_id?: number | "";
  medecin_nom?: string;

  // tarification (dans ton form, tu utilises le "code" dans le select)
  tarif_code?: string;
  montant_prevu?: number | string | null;
  devise?: string | null;

  // statut
  statut?: "EN_ATTENTE" | "A_ENCAISSER" | "PAYEE" | "CLOTUREE";
};

export default function VisiteNew({ contextLabel = "Réception" }: { contextLabel?: string }) {
  const { canAny } = useAuthz();
  const allowCreate = canAny(["visites.write"]);

  const sp = useSearchParams();
  const from = sp.get("from"); // ?from=<visiteId> pour dupliquer/pré-remplir

  const [initial, setInitial] = useState<InitialForForm | null>(null);
  const [loading, setLoading] = useState<boolean>(!!from);
  const [error, setError] = useState<string | null>(null);

  // Charger la visite source si ?from= est présent
  useEffect(() => {
    let cancelled = false;
    if (!from) { setInitial(null); setLoading(false); setError(null); return; }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res: any = await getVisite(from);
        const v = Array.isArray(res) ? res[0] : (res.data ?? res);

        // --- mapping depuis VisiteResource ---
        const patient = v?.patient ? {
          id: String(v.patient.id),
          numero_dossier: v.patient.numero_dossier ?? "",
          nom: v.patient.nom ?? "",
          prenom: v.patient.prenom ?? "",
        } : null;

        const init: InitialForForm = {
          selectedPatient: patient,
          service_id: v?.service?.id ?? "",
          motif: v?.plaintes_motif ?? "",
          hypothese: v?.hypothese_diagnostic ?? "",
          affectation_id: null, // on NE réutilise pas l’ancienne affectation

          medecin_id: v?.medecin?.id ?? "",
          medecin_nom: v?.medecin?.nom ?? "",

          tarif_code: v?.prix?.tarif?.code ?? "",
          montant_prevu: v?.prix?.montant_prevu ?? "",
          devise: v?.prix?.devise ?? v?.prix?.tarif?.devise ?? "XAF",

          // tu peux aussi décider de toujours repartir sur EN_ATTENTE
          statut: v?.statut ?? "EN_ATTENTE",
        };

        if (!cancelled) setInitial(init);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Impossible de charger la visite à dupliquer.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [from]);

  if (!allowCreate) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm">
        <div className="text-lg font-semibold text-ink-900">Accès refusé</div>
        <p className="text-sm text-ink-600 mt-1">Vous n’avez pas la permission de créer une visite.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fil d’Ariane */}
      <nav className="text-sm text-ink-600">
        <ol className="flex items-center gap-2">
          <li>{contextLabel}</li>
          <li aria-hidden>/</li>
          <li>Admissions</li>
          <li aria-hidden>/</li>
          <li className="font-medium text-ink-900">
            {from ? "Nouvelle visite (pré-remplie)" : "Nouvelle visite"}
          </li>
        </ol>
      </nav>

      {/* États de chargement/erreur quand duplication */}
      {from && loading && (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm animate-pulse h-24" />
      )}
      {from && error && (
        <div className="rounded-lg border border-congo-red/30 bg-[color:var(--color-congo-red)]/10 p-3 text-sm text-congo-red">
          {error}
        </div>
      )}

      {/* Formulaire (si from: on attend le pré-remplissage; sinon on rend direct) */}
      {!from ? (
        <VisiteFormPro />
      ) : (
        !loading && !error && <VisiteFormPro initialData={initial ?? undefined} />
      )}

      {/* Lien retour liste */}
      <div>
        <Link href="/reception/visites" className="text-sm underline">
          ↩ Retour à la liste
        </Link>
      </div>
    </div>
  );
}
