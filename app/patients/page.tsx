"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Search, Plus, Pencil, Trash2, Eye, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

type PatientRow = {
  id: string;
  numero_dossier: string;
  nom: string;
  prenom: string;
  sexe: "M" | "F";
  age?: number | null;
  telephone?: string | null;
  groupe_sanguin?: string | null;
  is_active: boolean;
};

type ApiList<T> = {
  data: T[];
  meta?: { current_page?: number; per_page?: number; total?: number; last_page?: number };
};

const PAGE_SIZE = 15;

export default function PatientsListPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lastPage = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function load() {
    setBusy(true); setErr(null);
    try {
      const url = new URL((process.env.NEXT_PUBLIC_API_BASE || "") + "/patients");
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", String(PAGE_SIZE));
      if (q.trim()) url.searchParams.set("search", q.trim()); // ton backend peut lire ?search=
      const r = await fetch(url.toString(), { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      const json: ApiList<PatientRow> = await r.json();
      setRows(json.data || []);
      setTotal(json.meta?.total ?? (json.data?.length || 0)); // fallback si pas de meta
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
      setRows([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  function resetAndSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer ce patient ? L’opération est définitive.")) return;
    try {
      setBusy(true);
      const r = await fetch((process.env.NEXT_PUBLIC_API_BASE || "") + `/patients/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());
      // Recharger la page actuelle (si elle devient vide, revenir à la précédente)
      if (rows.length === 1 && page > 1) setPage(p => p - 1);
      else load();
    } catch (e: any) {
      alert("Suppression impossible : " + (e?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Patients"
        subtitle="Rechercher, consulter et gérer les dossiers"
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Fil d’Ariane + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li>Portail</li><li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Patients</li>
            </ol>
          </nav>

          <Link
            href="/patients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-congo-green/30"
          >
            <Plus className="h-4 w-4" /> Nouveau patient
          </Link>
        </div>

        {/* Barre de recherche / filtres */}
        <form onSubmit={resetAndSearch} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
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
                  <Td className="font-medium">{p.nom} {p.prenom}</Td>
                  <Td>{p.sexe}</Td>
                  <Td>{p.age ?? "—"}</Td>
                  <Td>{p.telephone || "—"}</Td>
                  <Td>{p.groupe_sanguin || "—"}</Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? "bg-congo-greenL text-congo-green" : "bg-ink-200 text-ink-700"}`}>
                      {p.is_active ? "Actif" : "Inactif"}
                    </span>
                  </Td>
                  <Td className="text-right pr-3">
                    <div className="inline-flex items-center gap-1">
                      <Link href={`/patients/${p.id}`} className="icon-btn" aria-label="Détail"><Eye className="h-4 w-4" /></Link>
                      <Link href={`/patients/${p.id}/edit`} className="icon-btn" aria-label="Modifier"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => onDelete(p.id)} className="icon-btn text-congo-red" aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
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
      </main>

      <SiteFooter />

      <style jsx global>{`
        .icon-btn {
          display:inline-flex; align-items:center; justify-content:center;
          padding:6px; border-radius:8px; color:#111827;
        }
        .icon-btn:hover { background: #f3f4f6; }
      `}</style>
    </div>
  );
}

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
      className={`rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 hover:bg-ink-50 disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
