"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Plus, Pencil, Trash2, Eye,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from "lucide-react";
import { listPatientsPaginated, deletePatient } from "@/lib/api";
import { useAuthz } from "@/lib/authz";

type Row = {
  id: string;
  numero_dossier: string;
  nom: string;
  prenom: string;
  sexe?: "M" | "F" | "X" | null;
  /** ✅ on ajoute la date pour pouvoir calculer l'âge */
  date_naissance?: string | null;
  age_reporte?: number | null;
  telephone?: string | null;
  groupe_sanguin?: string | null;
  is_active: boolean;
};

const PAGE_SIZE = 15;

/** ✅ calcule l'âge depuis la date de naissance, sinon prend age_reporte */
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
  // si aucun DOB valide, on retombe sur l'âge saisi (age_reporte)
  return (typeof fallback === "number" ? fallback : "—");
}

export default function PatientsList({ contextLabel = "Réception" }:{ contextLabel?: string }) {
  const { canAny } = useAuthz();
  const allow = {
    list:   canAny(["patients.read","patients.view"]),
    view:   canAny(["patients.read","patients.view"]),
    create: canAny(["patients.create","patients.write"]),
    edit:   canAny(["patients.update","patients.write"]),
    del:    canAny(["patients.delete"]),
  };

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lastPage = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function load() {
    if (!allow.list) { setRows([]); setTotal(0); return; }
    setBusy(true); setErr(null);
    try {
      const payload: any = await listPatientsPaginated({ page, per_page: PAGE_SIZE, search: q });
      const data: Row[] = Array.isArray(payload) ? payload : (payload.data ?? []);
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

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, allow.list]);

  function onSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); load(); }

  async function onDelete(id: string) {
    if (!allow.del) return;
    if (!confirm("Supprimer ce patient ?")) return;
    setBusy(true);
    try {
      await deletePatient(id);
      if (rows.length === 1 && page > 1) setPage(p => p - 1); else load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Fil d’Ariane + action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>{contextLabel}</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Patients</li>
          </ol>
        </nav>
        {allow.create && (
          <Link
            href="./patients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            <Plus className="h-4 w-4" /> Nouveau patient
          </Link>
        )}
      </div>

      {/* Recherche */}
      {allow.list && (
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
            <button type="submit" disabled={busy} className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm hover:bg-ink-50 disabled:opacity-60">
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
              <tr><td colSpan={8} className="p-6 text-center text-ink-500">Aucun résultat</td></tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-ink-100 hover:bg-ink-50/40">
                <Td className="font-mono">{p.numero_dossier}</Td>
                <Td className="font-medium">{`${p.nom ?? ""} ${p.prenom ?? ""}`.trim() || "(sans nom)"}</Td>
                <Td>{p.sexe ?? "—"}</Td>
                {/* ✅ on affiche l'âge calculé */}
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
                    {allow.view && <Link href={`./patients/${p.id}`} className="icon-btn" aria-label="Détail"><Eye className="h-4 w-4" /></Link>}
                    {allow.edit && <Link href={`./patients/${p.id}/edit`} className="icon-btn" aria-label="Modifier"><Pencil className="h-4 w-4" /></Link>}
                    {allow.del  && <button onClick={() => onDelete(p.id)} className="icon-btn text-congo-red" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </Td>
              </tr>
            ))}
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

      {err && <p className="text-sm text-congo-red">{err}</p>}

      <style jsx global>{`
        .icon-btn { display:inline-flex; align-items:center; justify-content:center; padding:6px; border-radius:8px; color:#111827; }
        .icon-btn:hover { background:#f3f4f6; }
      `}</style>
    </div>
  );
}

function Th({ children, className="" }: any) { return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>; }
function Td({ children, className="" }: any) { return <td className={`px-3 py-2 ${className}`}>{children}</td>; }
function PageBtn({ children, disabled, onClick }: any) {
  return <button disabled={disabled} onClick={onClick} className="rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 hover:bg-ink-50 disabled:opacity-40">{children}</button>;
}
