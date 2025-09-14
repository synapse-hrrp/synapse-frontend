"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { listLaboratoiresPaginated, deleteLaboratoire } from "@/lib/api";
import { Search, Plus, Eye, Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

type Row = {
  id: string; test_code: string; test_name: string; specimen?: string|null;
  status?: "pending"|"in_progress"|"validated"|"canceled";
  patient?: { nom: string; prenom: string; numero_dossier?: string } | null;
  requested_at?: string|null; validated_at?: string|null;
};

const PAGE_SIZE = 15;
export default function LaboList() {
  const sp = useSearchParams(); const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lastPage = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    if (sp?.get("flash") === "created") {
      setTimeout(() => router.replace("/laboratoire"), 100); // nettoie l’URL
    }
  }, [sp, router]);

  async function load() {
    setBusy(true); setErr(null);
    try {
      const res: any = await listLaboratoiresPaginated({ page, per_page: PAGE_SIZE, q, status });
      const data = Array.isArray(res) ? res : (res.data ?? []);
      setRows(data);
      setTotal(res?.total ?? res?.meta?.total ?? data.length);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
      setRows([]); setTotal(0);
    } finally { setBusy(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  function resetAndSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); load(); }

  async function onDelete(id: string) {
    if (!confirm("Supprimer cet examen ?")) return;
    try {
      setBusy(true);
      await deleteLaboratoire(id);
      if (rows.length === 1 && page > 1) setPage(p => p - 1);
      else load();
    } catch (e: any) {
      alert("Suppression impossible : " + (e?.message || "inconnue"));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Laboratoire" subtitle="Prescriptions, suivis et validations" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Fil d’Ariane + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2"><li>Portail</li><li aria-hidden>/</li><li className="font-medium text-ink-900">Laboratoire</li></ol>
          </nav>
          <Link href="/laboratoire/new" className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
            <Plus className="h-4 w-4" /> Nouvel examen
          </Link>
        </div>

        {/* Flash */}
        {sp?.get("flash") === "created" && (
          <div className="rounded-lg border border-congo-green/30 bg-congo-greenL px-3 py-2 text-sm text-congo-green">
            Examen créé avec succès.
          </div>
        )}

        {/* Filtres */}
        <form onSubmit={resetAndSearch} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Code/nom test, patient, N° dossier…"
                     className="w-full rounded-lg border border-ink-100 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20" />
            </div>
            <select value={status} onChange={(e)=>setStatus(e.target.value)}
              className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm">
              <option value="">Tous statuts</option>
              <option value="pending">En attente</option>
              <option value="in_progress">En cours</option>
              <option value="validated">Validé</option>
              <option value="canceled">Annulé</option>
            </select>
            <button type="submit" disabled={busy}
              className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm hover:bg-ink-50 disabled:opacity-60">
              Rechercher
            </button>
          </div>
        </form>

        {/* Tableau */}
        <div className="overflow-auto rounded-xl border border-ink-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-700">
              <tr>
                <Th>Test</Th><Th>Patient</Th><Th>Specimen</Th><Th>Statut</Th><Th>Demandé</Th><Th className="text-right pr-3">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !busy && <tr><td colSpan={6} className="p-6 text-center text-ink-500">Aucun résultat</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/40">
                  <Td className="font-medium">{r.test_name} <span className="text-ink-500">({r.test_code})</span></Td>
                  <Td>{r.patient ? `${r.patient.nom} ${r.patient.prenom}` : "—"}</Td>
                  <Td>{r.specimen || "—"}</Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      r.status === "validated" ? "bg-congo-greenL text-congo-green"
                      : r.status === "canceled" ? "bg-ink-200 text-ink-700"
                      : r.status === "pending" ? "bg-ink-100 text-ink-700"
                      : "bg-[color:var(--color-congo-yellow)]/15 text-congo-yellow"
                    }`}>{r.status || "pending"}</span>
                  </Td>
                  <Td>{r.requested_at ? new Date(r.requested_at).toLocaleString() : "—"}</Td>
                  <Td className="text-right pr-3">
                    <div className="inline-flex items-center gap-1">
                      <Link href={`/laboratoire/${r.id}`} className="icon-btn" aria-label="Détail"><Eye className="h-4 w-4" /></Link>
                      <Link href={`/laboratoire/${r.id}/edit`} className="icon-btn" aria-label="Modifier"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => onDelete(r.id)} className="icon-btn text-congo-red" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
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
        .icon-btn { display:inline-flex; align-items:center; justify-content:center; padding:6px; border-radius:8px; color:#111827; }
        .icon-btn:hover { background: #f3f4f6; }
      `}</style>
    </div>
  );
}
function Th({ children, className="" }: any) { return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>; }
function Td({ children, className="" }: any) { return <td className={`px-3 py-2 ${className}`}>{children}</td>; }
function PageBtn({ children, disabled, onClick }: any) {
  return <button disabled={disabled} onClick={onClick} className="rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 hover:bg-ink-50 disabled:opacity-40">{children}</button>;
}
