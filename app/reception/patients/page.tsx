// app/reception/patient/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Plus, Pencil, Trash2, Eye,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  CheckCircle2, X
} from "lucide-react";

import { listPatientsPaginated, deletePatient } from "@/lib/api";
import { useAuthz } from "@/lib/authz";

type PatientRow = {
  id: string;                      // uuid
  numero_dossier: string;
  nom: string;
  prenom: string;
  date_naissance?: string | null;
  age_reporte?: number | null;
  sexe?: "M" | "F" | "X" | null;
  telephone?: string | null;
  groupe_sanguin?: "A+"|"A-"|"B+"|"B-"|"AB+"|"AB-"|"O+"|"O-" | null;
  is_active: boolean;
};

const PAGE_SIZE = 15;

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
  return fallback ?? "—";
}

export default function ReceptionPatientsPanel() {
  const { isAuthenticated, can } = useAuthz();

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });

  const lastPage = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // Garde minimale (le layout /reception a déjà sa propre garde)
  useEffect(() => {
    if (!isAuthenticated) {
      const next = encodeURIComponent("/reception/patients");
      window.location.replace(`/login?next=${next}`);
    }
  }, [isAuthenticated]);

  async function load() {
    if (!can("patients.read") && !can("patients.view")) {
      setRows([]); setTotal(0);
      setErr("Accès refusé : vous n’avez pas la permission de consulter les patients.");
      return;
    }
    setBusy(true); setErr(null);
    try {
      const payload: any = await listPatientsPaginated({ page, per_page: PAGE_SIZE, search: q });
      const data: PatientRow[] = Array.isArray(payload) ? payload : (payload.data ?? []);
      const meta = payload.meta || {};
      setRows(data);
      setTotal(meta.total ?? data.length);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
      setRows([]); setTotal(0);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, can]);

  function onSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); load(); }

  async function onDelete(id: string) {
    if (!can("patients.delete")) {
      alert("Vous n’avez pas la permission de supprimer un patient.");
      return;
    }
    if (!confirm("Supprimer ce patient ? L’opération est définitive.")) return;
    try {
      setBusy(true);
      await deletePatient(id);
      if (rows.length === 1 && page > 1) setPage(p => p - 1);
      else load();
      setToast({ show: true, text: "Patient supprimé." });
      setTimeout(() => setToast({ show: false, text: "" }), 3000);
    } catch (e: any) {
      alert("Suppression impossible : " + (e?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  // ——— UI: uniquement le “corps” (pas d’entête/pied) ———
  return (
    <div className="space-y-6">
      {/* Fil d’Ariane + actions (léger) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Patients</h2>
          <p className="text-xs text-ink-600">Recherche, listing et actions rapides</p>
        </div>

        {(can("patients.create") || can("patients.write")) && (
          <Link
            href="/reception/patients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-congo-green/30"
          >
            <Plus className="h-4 w-4" /> Nouveau patient
          </Link>
        )}
      </div>

      {/* Barre de recherche */}
      {(can("patients.read") || can("patients.view")) && (
        <form onSubmit={onSearch} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="N° dossier, nom, téléphone…"
                className="w-full rounded-lg border border-ink-100 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm hover:bg-ink-50 focus:outline-none focus:ring-2 focus:ring-congo-green/20 disabled:opacity-60"
            >
              Rechercher
            </button>
          </div>
        </form>
      )}

      {/* Tableau */}
      <div className="overflow-auto rounded-xl border border-ink-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-700">
            <tr>
              <Th>N° dossier</Th>
              <Th>Patient</Th>
              <Th>Sexe</Th>
              <Th>Âge</Th>
              <Th>Téléphone</Th>
              <Th>Groupe</Th>
              <Th>Statut</Th>
              <Th className="text-right pr-3">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !busy && (
              <tr><td colSpan={8} className="p-6 text-center text-ink-500">
                {err ? err : "Aucun résultat"}
              </td></tr>
            )}

            {rows.map((p) => {
              const fullName = `${p.nom ?? ""} ${p.prenom ?? ""}`.trim() || "(sans nom)";
              return (
                <tr key={p.id} className="border-t border-ink-100 hover:bg-ink-50/40">
                  <Td className="font-mono">{p.numero_dossier}</Td>
                  <Td className="font-medium">{fullName}</Td>
                  <Td>{p.sexe ?? "—"}</Td>
                  <Td>{ageFrom(p.date_naissance, p.age_reporte)}</Td>
                  <Td>{p.telephone || "—"}</Td>
                  <Td>{p.groupe_sanguin || "—"}</Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? "bg-congo-greenL text-congo-green" : "bg-ink-200 text-ink-700"}`}>
                      {p.is_active ? "Actif" : "Inactif"}
                    </span>
                  </Td>
                  <Td className="text-right pr-3">
                    <div className="inline-flex items-center gap-1">
                      {(can("patients.read") || can("patients.view")) && (
                        <Link href={`/reception/patients/${p.id}`} className="icon-btn" aria-label="Détail">
                          <Eye className="h-4 w-4" />
                        </Link>
                      )}
                      {(can("patients.write") || can("patients.update")) && (
                        <Link href={`/reception/patients/${p.id}/edit`} className="icon-btn" aria-label="Modifier">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      )}
                      {can("patients.delete") && (
                        <button onClick={() => onDelete(p.id)} className="icon-btn text-congo-red" aria-label="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-ink-600">Page {page} / {lastPage}</div>
        <div className="flex items-center gap-1">
          <PageBtn onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft className="h-4 w-4" /></PageBtn>
          <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></PageBtn>
          <PageBtn onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}><ChevronRight className="h-4 w-4" /></PageBtn>
          <PageBtn onClick={() => setPage(lastPage)} disabled={page === lastPage}><ChevronsRight className="h-4 w-4" /></PageBtn>
        </div>
      </div>

      {/* Toast succès */}
      <Toast show={toast.show} onClose={() => setToast({ show: false, text: "" })}>
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">{toast.text}</span>
      </Toast>

      <style jsx global>{`
        .icon-btn { display:inline-flex; align-items:center; justify-content:center; padding:6px; border-radius:8px; color:#111827; }
        .icon-btn:hover { background:#f3f4f6; }
      `}</style>
    </div>
  );
}

/* ---------- petits composants locaux ---------- */
function Th({ children, className="" }: any) {
  return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className="" }: any) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
function PageBtn({ children, disabled, onClick }: any) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 hover:bg-ink-50 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* --------- Toast --------- */
function Toast({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      aria-live="polite"
      role="status"
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        show ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
      }`}
    >
      <div className="flex items-center gap-2 rounded-xl border border-congo-green/30 bg-congo-greenL px-3 py-2 shadow-lg ring-1 ring-congo-green/20 text-congo-green">
        {children}
        <button
          onClick={onClose}
          aria-label="Fermer la notification"
          className="ml-1 rounded-md p-1 hover:bg-ink-100 text-ink-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
