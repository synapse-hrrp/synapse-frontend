"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { listPansementsPaginated, deletePansement, getToken, me, PansementDTO } from "@/lib/api";
import { Search, Plus, Eye, Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

const PAGE_SIZE = 15;

export default function PansementsListPage() {
  // garde
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login?next=/pansements"); return; }
    me().catch(() => window.location.replace("/login?next=/pansements"));
  }, []);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PansementDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lastPage = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function load() {
    setBusy(true); setErr(null);
    try {
      const res: any = await listPansementsPaginated({ page, per_page: PAGE_SIZE, q, status });
      const data: PansementDTO[] = res?.data ?? res ?? [];
      setRows(data);
      const metaTotal = res?.total ?? res?.meta?.total ?? data.length;
      setTotal(metaTotal);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
      setRows([]); setTotal(0);
    } finally { setBusy(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  function resetAndSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function onDelete(id: string | number) {
    if (!confirm("Supprimer ce pansement ?")) return;
    try {
      setBusy(true);
      await deletePansement(id);
      if (rows.length === 1 && page > 1) setPage(p => p - 1);
      else load();
    } catch (e: any) {
      alert("Suppression impossible : " + (e?.message || "inconnue"));
    } finally { setBusy(false); }
  }

  // flash message
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const flash = params?.get("flash");

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Pansements" subtitle="Enregistrements de soins" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {flash === "created" && <Flash msg="Pansement enregistré avec succès." />}
        {flash === "updated" && <Flash msg="Pansement mis à jour." />}
        {flash === "deleted" && <Flash msg="Pansement supprimé." />}

        {/* Barre recherche / filtres */}
        <form onSubmit={resetAndSearch} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type, observation, produits…"
                className="w-full rounded-lg border border-ink-100 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
              />
            </div>
            <select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm">
                <option value="">Tous statuts</option>
                <option value="planifie">Planifié</option>
                <option value="en_cours">En cours</option>
                <option value="clos">Clos</option>
                <option value="annule">Annulé</option>
            </select>

            <button type="submit" disabled={busy} className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm hover:bg-ink-50">
              Rechercher
            </button>
            <Link href="/pansements/new" className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
              <Plus className="h-4 w-4" /> Nouveau
            </Link>
          </div>
        </form>

        {/* Tableau */}
        <div className="overflow-auto rounded-xl border border-ink-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-700">
              <tr>
                <Th>Date/heure</Th>
                <Th>Patient</Th>
                <Th>Type</Th>
                <Th>Statut</Th>
                <Th>Soignant</Th>
                <Th className="text-right pr-3">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !busy && (
                <tr><td colSpan={6} className="p-6 text-center text-ink-500">Aucun résultat</td></tr>
              )}
              {rows.map((r) => (
                <tr key={String(r.id)} className="border-t border-ink-100 hover:bg-ink-50/40">
                  <Td>{r.date_soin ? new Date(r.date_soin).toLocaleString() : "—"}</Td>
                  <Td className="font-medium">
                    {r.patient ? `${r.patient.nom} ${r.patient.prenom}` : "—"}
                    <div className="text-xs text-ink-500">{r.patient?.numero_dossier || ""}</div>
                  </Td>
                  <Td>{r.type || "—"}</Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      r.status === "clos" ? "bg-congo-greenL text-congo-green" :
                      r.status === "annule" ? "bg-ink-200 text-ink-700" :
                      r.status === "planifie" ? "bg-ink-100 text-ink-700" :
                      "bg-[color:var(--color-congo-yellow)]/15 text-congo-yellow"
                    }`}>
                      {r.status || "en_cours"}
                    </span>

                  </Td>
                  <Td>{r.soignant?.name || "—"}</Td>
                  <Td className="text-right pr-3">
                    <div className="inline-flex items-center gap-1">
                      <Link href={`/pansements/${r.id}`} className="icon-btn" aria-label="Détail"><Eye className="h-4 w-4" /></Link>
                      <Link href={`/pansements/${r.id}/edit`} className="icon-btn" aria-label="Modifier"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => onDelete(r.id)} className="icon-btn text-congo-red" aria-label="Supprimer">
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
        .icon-btn { display:inline-flex; align-items:center; justify-content:center; padding:6px; border-radius:8px; color:#111827; }
        .icon-btn:hover { background: #f3f4f6; }
      `}</style>
    </div>
  );
}

function Flash({ msg }: { msg: string }) {
  return <div className="rounded-lg border border-congo-green/30 bg-congo-greenL px-3 py-2 text-sm text-congo-green">{msg}</div>;
}
function Th({ children, className="" }: any) { return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>; }
function Td({ children, className="" }: any) { return <td className={`px-3 py-2 ${className}`}>{children}</td>; }
function PageBtn({ children, disabled, onClick }: any) {
  return <button disabled={disabled} onClick={onClick} className="rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 hover:bg-ink-50 disabled:opacity-40">{children}</button>;
}
