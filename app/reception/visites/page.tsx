// app/reception/visites/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Plus, Pencil, Trash2, Eye,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from "lucide-react";

import { listVisitesPaginated, deleteVisite } from "@/lib/api";
import { useAuthz } from "@/lib/authz";

/** Type minimal pour la liste */
type Row = {
  id: string | number;
  created_at?: string | null;
  plaintes_motif?: string | null;

  patient?: {
    nom?: string | null;
    prenom?: string | null;
    numero_dossier?: string | null;
  } | null;

  patient_id?: string | number;
  service?: { name?: string | null } | null;
  service_id?: number | null;
};

const PAGE_SIZE = 15;

export default function ReceptionVisitesPage() {
  const { isAuthenticated, isAdmin, can } = useAuthz();

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lastPage = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // Garde ultra légère : si non connecté → login (le layout réception fait déjà le reste)
  useEffect(() => {
    if (!isAuthenticated) {
      const next = encodeURIComponent("/reception/visites");
      window.location.replace(`/login?next=${next}`);
    }
  }, [isAuthenticated]);

  async function load() {
    // Si pas le droit de lire, on n'appelle pas l'API (UI neutre)
    if (!isAdmin && !can("visites.read")) {
      setRows([]); setTotal(0); setErr(null);
      return;
    }
    setBusy(true); setErr(null);
    try {
      const payload: any = await listVisitesPaginated({ page, per_page: PAGE_SIZE, search: q });
      const data: Row[] = Array.isArray(payload) ? payload : (payload?.data ?? []);
      const meta = payload?.meta ?? {};
      setRows(data);
      setTotal(meta.total ?? data.length);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
      setRows([]); setTotal(0);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, isAdmin, can]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function onDelete(id: string | number) {
    // côté API, supprime seulement si tu as un DELETE pour visites ; sinon masque ce bouton
    if (!isAdmin && !can("visites.delete")) return;
    if (!confirm("Supprimer cette visite ?")) return;
    try {
      setBusy(true);
      await deleteVisite(String(id));
      if (rows.length === 1 && page > 1) setPage(p => p - 1);
      else load();
    } catch (e: any) {
      alert("Suppression impossible : " + (e?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  // Affichage
  const canRead   = isAdmin || can("visites.read");
  const canWrite  = isAdmin || can("visites.write");   // créer / modifier
  const canDelete = isAdmin || can("visites.delete");  // si tu as prévu ce droit côté back

  return (
    <div className="space-y-6">
      {/* Titre + actions (pas de header, le layout réception le gère) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Admissions (Visites)</h2>
          <p className="text-xs text-ink-600">Création et suivi des passages</p>
        </div>

        {canWrite && (
          <Link
            href="/reception/visites/new"
            className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-congo-green/30"
          >
            <Plus className="h-4 w-4" /> Nouvelle visite
          </Link>
        )}
      </div>

      {/* Barre de recherche */}
      {canRead && (
        <form onSubmit={onSearch} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nom patient, n° dossier, motif…"
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
              <Th>Date</Th>
              <Th>Patient</Th>
              <Th>Service</Th>
              <Th>Motif</Th>
              <Th className="text-right pr-3">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {canRead && rows.length === 0 && !busy && (
              <tr><td colSpan={5} className="p-6 text-center text-ink-500">Aucun résultat</td></tr>
            )}

            {!canRead && (
              <tr><td colSpan={5} className="p-6 text-center text-ink-500">Accès refusé.</td></tr>
            )}

            {canRead && rows.map((r) => (
              <tr key={String(r.id)} className="border-t border-ink-100 hover:bg-ink-50/40">
                <Td>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</Td>
                <Td className="font-medium">
                  {r.patient ? `${r.patient.nom ?? ""} ${r.patient.prenom ?? ""}`.trim() : r.patient_id}
                  {r.patient?.numero_dossier ? (
                    <span className="ml-2 text-ink-500">({r.patient.numero_dossier})</span>
                  ) : null}
                </Td>
                <Td>{r.service?.name || r.service_id || "—"}</Td>
                <Td className="max-w-[360px] truncate">{r.plaintes_motif || "—"}</Td>
                <Td className="text-right pr-3">
                  <div className="inline-flex items-center gap-1">
                    {canRead && (
                      <Link href={`/reception/visites/${r.id}`} className="icon-btn" aria-label="Détail"><Eye className="h-4 w-4" /></Link>
                    )}
                    {canWrite && (
                      <Link href={`/reception/visites/${r.id}/edit`} className="icon-btn" aria-label="Modifier"><Pencil className="h-4 w-4" /></Link>
                    )}
                    {canDelete && (
                      <button onClick={() => onDelete(r.id)} className="icon-btn text-congo-red" aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination + erreurs */}
      <Pager page={page} setPage={setPage} lastPage={lastPage} />
      {err && <p className="text-sm text-congo-red">{err}</p>}

      <style jsx global>{`
        .icon-btn { display:inline-flex; align-items:center; justify-content:center; padding:6px; border-radius:8px; color:#111827; }
        .icon-btn:hover { background:#f3f4f6; }
      `}</style>
    </div>
  );
}

/* ------- petits composants table/pager ------- */
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
function Pager({ page, setPage, lastPage }:{ page:number; setPage:(n:number|((p:number)=>number))=>void; lastPage:number; }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-ink-600">Page {page} / {lastPage}</div>
      <div className="flex items-center gap-1">
        <PageBtn onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft className="h-4 w-4" /></PageBtn>
        <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></PageBtn>
        <PageBtn onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}><ChevronRight className="h-4 w-4" /></PageBtn>
        <PageBtn onClick={() => setPage(lastPage)} disabled={page === lastPage}><ChevronsRight className="h-4 w-4" /></PageBtn>
      </div>
    </div>
  );
}
