// app/reception/patients/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getPatient } from "@/lib/api";
import { useAuthz } from "@/lib/authz";

type Patient = {
  id: string;
  // Base identité
  nom: string;
  prenom: string;
  date_naissance: string;                 // "YYYY-MM-DD" ou ""
  lieu_naissance: string;
  age_reporte?: string | number | null;   // saisie libre
  sexe: "M" | "F" | "X";
  nationalite: string;
  profession: string;
  // Adresse & contact
  adresse: string;
  quartier: string;
  telephone: string;
  // État civil
  statut_matrimonial: "celibataire" | "marie" | "veuf" | "divorce" | "";
  // Proche
  proche_nom: string;
  proche_tel: string;
  // Médical
  groupe_sanguin: "A+"|"A-"|"B+"|"B-"|"AB+"|"AB-"|"O+"|"O-"|"";
  allergies: string;
  // Assurance
  assurance_id?: string | null;
  numero_assure?: string | null;
  // Divers
  numero_dossier?: string | null;
  is_active: boolean;
};

export default function ReceptionPatientShowPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, can, hasRole } = useAuthz();

  const allow =
    !!isAuthenticated &&
    (
      hasRole?.("admin") ||
      hasRole?.("dg") ||
      can("*") ||
      can("patients.*") ||
      can("patients.view") ||
      can("patients.read")
    );

  const [p, setP] = useState<Patient | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirige vers login si non connecté
  useEffect(() => {
    if (!isAuthenticated) {
      const next = encodeURIComponent(`/reception/patients/${params.id}`);
      window.location.replace(`/login?next=${next}`);
    }
  }, [isAuthenticated, params.id]);

  // Charge le patient, en gérant .data / brut
  useEffect(() => {
    let abo = false;
    (async () => {
      if (!allow) { setLoading(false); return; }
      try {
        setLoading(true);
        const res: any = await getPatient(params.id);
        // Supporte différents formats: {data: {...}} ou {...} direct
        const raw = (res && typeof res === "object" && "data" in res) ? (res.data ?? res) : res;
        if (!abo) setP(normalizePatient(raw));
      } catch (e: any) {
        const msg = e?.message || "Erreur de chargement";
        if (!abo) setErr(msg);
      } finally {
        if (!abo) setLoading(false);
      }
    })();
    return () => { abo = true; };
  }, [params.id, allow]);

  const age = useMemo(() => {
    if (!p) return "—";
    // âge depuis la date de naissance sinon fallback sur age_reporte
    if (p.date_naissance) {
      const d = new Date(p.date_naissance + "T00:00:00");
      if (!isNaN(d.getTime())) {
        const now = new Date();
        let a = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
        return a >= 0 ? String(a) : "—";
      }
    }
    if (p.age_reporte != null && p.age_reporte !== "") return String(p.age_reporte);
    return "—";
  }, [p]);

  if (!isAuthenticated) return <div className="text-sm text-ink-600">Redirection…</div>;

  if (!allow) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Dossier patient</h2>
            <p className="text-xs text-ink-600">Consultation des informations</p>
          </div>
          <div className="text-sm">
            <Link href="/reception/patients" className="text-congo-green hover:underline">← Retour</Link>
          </div>
        </div>
        <p className="rounded-lg border border-congo-red/30 bg-[color:var(--color-congo-red)]/10 p-3 text-congo-red text-sm">
          Erreur 403 — Accès refusé : vous n’avez pas la permission de consulter ce patient.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Dossier patient</h2>
          <p className="text-xs text-ink-600">Consultation des informations</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/reception/patients" className="text-congo-green hover:underline">← Retour</Link>
          {(hasRole?.("admin") || hasRole?.("dg") || can("*") || can("patients.*") || can("patients.update") || can("patients.write")) && (
            <Link
              href={`/reception/patients/${params.id}/edit`}
              className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 hover:bg-ink-50"
            >
              Modifier
            </Link>
          )}
        </div>
      </div>

      {loading && !p && !err && <p className="text-sm text-ink-600">Chargement…</p>}
      {err && <p className="text-sm text-congo-red">{err}</p>}

      {p && (
        <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm text-sm">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {/* Identité */}
            <Row label="N° dossier" value={p.numero_dossier} />
            <Row label="Nom complet" value={`${p.nom ?? ""} ${p.prenom ?? ""}`.trim()} />
            <Row label="Sexe" value={fmtSexe(p.sexe)} />
            <Row label="Âge" value={age} />
            <Row label="Date de naissance" value={p.date_naissance} />
            <Row label="Lieu de naissance" value={p.lieu_naissance} />
            <Row label="Âge reporté" value={p.age_reporte} />
            <Row label="Nationalité" value={p.nationalite} />
            <Row label="Profession" value={p.profession} />

            {/* Contact / Adresse */}
            <Row label="Téléphone" value={p.telephone} />
            <Row label="Adresse" value={p.adresse} />
            <Row label="Quartier" value={p.quartier} />
            <Row label="Statut matrimonial" value={fmtStatut(p.statut_matrimonial)} />

            {/* Proche */}
            <Row label="Nom du proche" value={p.proche_nom} />
            <Row label="Téléphone du proche" value={p.proche_tel} />

            {/* Médical */}
            <Row label="Groupe sanguin" value={p.groupe_sanguin} />
            <Row label="Allergies" value={p.allergies} />

            {/* Assurance */}
            <Row label="Assurance (ID)" value={p.assurance_id} />
            <Row label="Numéro assuré" value={p.numero_assure} />

            {/* Statut */}
            <div>
              <dt className="text-ink-500">Statut</dt>
              <dd>
                <span className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? "bg-congo-greenL text-congo-green":"bg-ink-200 text-ink-700"}`}>
                  {p.is_active ? "Actif" : "Inactif"}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

/* ---------------- Helpers rendu ---------------- */

function Row({ label, value }: { label: string; value: any }) {
  const v = display(value);
  return (
    <div>
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function display(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.trim() === "" ? "—" : v;
  if (typeof v === "number") return isFinite(v) ? String(v) : "—";
  return String(v) || "—";
}

function fmtSexe(v?: string | null) {
  if (!v) return "—";
  const up = v.toUpperCase();
  if (up === "M") return "M";
  if (up === "F") return "F";
  if (up === "X") return "X";
  return v;
}

function fmtStatut(v?: string | null) {
  switch (v) {
    case "celibataire": return "Célibataire";
    case "marie": return "Marié(e)";
    case "veuf": return "Veuf/Veuve";
    case "divorce": return "Divorcé(e)";
    case "": return "—";
    default: return v || "—";
  }
}

/** Normalisation minimale des champs pour éviter les `undefined` */
function normalizePatient(raw: any): Patient {
  const it = raw ?? {};
  return {
    id: String(it.id ?? ""),
    nom: it.nom ?? "",
    prenom: it.prenom ?? "",
    date_naissance: it.date_naissance ?? "",
    lieu_naissance: it.lieu_naissance ?? "",
    age_reporte: it.age_reporte ?? "",
    sexe: (it.sexe ?? "X") as "M" | "F" | "X",
    nationalite: it.nationalite ?? "",
    profession: it.profession ?? "",
    adresse: it.adresse ?? "",
    quartier: it.quartier ?? "",
    telephone: it.telephone ?? "",
    statut_matrimonial: (it.statut_matrimonial ?? "") as Patient["statut_matrimonial"],
    proche_nom: it.proche_nom ?? "",
    proche_tel: it.proche_tel ?? "",
    groupe_sanguin: (it.groupe_sanguin ?? "") as Patient["groupe_sanguin"],
    allergies: it.allergies ?? "",
    assurance_id: it.assurance_id ?? null,
    numero_assure: it.numero_assure ?? null,
    numero_dossier: it.numero_dossier ?? null,
    is_active: Boolean(it.is_active),
  };
}
