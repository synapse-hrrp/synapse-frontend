// app/visites/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, listVisitesPaginated, deleteVisite } from "@/lib/api";
import { Search, Plus, Pencil, Trash2, Eye, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, CheckCircle2, X } from "lucide-react";

type Row = {
  id: string|number;
  patient?: { nom: string; prenom: string; numero_dossier?: string } | null;
  service?: { name: string } | null;
  patient_id: string;
  service_id: number;
  plaintes_motif: string;
  created_at?: string;
};

const PAGE_SIZE = 15;

export default function VisitesListPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });

  const lastPage = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // Garde
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login?next=/visites"); return; }
    me().catch(() => window.location.replace("/login?next=/visites"));
  }, []);

  // Flash
  useEffect(() => {
    const f = sp?.get("flash");
    if (f === "created") setToast({ show: true, text: "Visite enregistrée." });
    if (f === "deleted") setToast({ show: true, text: "Visite supprimée." });
    if (f) {
      router.replace("/visites", { scroll: false });
      const tid = setTimeout(() => setToast({ show: false, text: "" }), 3500);
      return () => clearTimeout(tid);
    }
  }, [sp, router]);

  async function load() {
    setBusy(true); setErr(null);
    try {
      const payload: any = await listVisitesPaginated({ page, per_page: PAGE_SIZE, search: q });
      const data: Row[] = Array.isArray(payload) ? payload : (payload.data ?? []);
      const meta = payload.meta || {};
      setRows(data);
      setTotal(meta.total ?? data.length);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
      setRows([]); setTotal(0);
    } finally { setBusy(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  function resetAndSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); load(); }

  async function onDelete(id: string|number) {
    if (!confirm("Supprimer cette visite ?")) return;
    try {
      setBusy(true);
      await deleteVisite(id);
      if (rows.length === 1 && page > 1) setPage(p => p - 1);
      else load();
      setToast({ show: true, text: "Visite supprimée." });
      setTimeout(() => setToast({ show: false, text: "" }), 3000);
    } catch (e: any) {
      alert("Suppression impossible : " + (e?.message || "inconnue"));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Visites"
        subtitle="Suivi des passages et motifs"
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Fil d’Ariane + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li>Portail</li><li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Visites</li>
            </ol>
          </nav>

          <Link
            href="/visites/new"
            className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-congo-green/30"
          >
            <Plus className="h-4 w-4" /> Nouvelle visite
          </Link>
        </div>

        {/* Recherche */}
        <form onSubmit={resetAndSearch} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
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
              {rows.length === 0 && !busy && (
                <tr><td colSpan={5} className="p-6 text-center text-ink-500">Aucun résultat</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/40">
                  <Td>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</Td>
                  <Td className="font-medium">
                    {r.patient ? `${r.patient.nom} ${r.patient.prenom}` : r.patient_id}
                    {r.patient?.numero_dossier ? <span className="ml-2 text-ink-500">({r.patient.numero_dossier})</span> : null}
                  </Td>
                  <Td>{r.service?.name || r.service_id}</Td>
                  <Td className="max-w-[360px] truncate">{r.plaintes_motif}</Td>
                  <Td className="text-right pr-3">
                    <div className="inline-flex items-center gap-1">
                      <Link href={`/visites/${r.id}`} className="icon-btn" aria-label="Détail"><Eye className="h-4 w-4" /></Link>
                      <Link href={`/visites/${r.id}/edit`} className="icon-btn" aria-label="Modifier"><Pencil className="h-4 w-4" /></Link>
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

      {/* Toast */}
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

function Th({ children, className="" }: any) { return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>; }
function Td({ children, className="" }: any) { return <td className={`px-3 py-2 ${className}`}>{children}</td>; }
function PageBtn({ children, disabled, onClick }: any) {
  return <button disabled={disabled} onClick={onClick} className="rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 hover:bg-ink-50 disabled:opacity-40">{children}</button>;
}
function Toast({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div aria-live="polite" role="status" className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${show ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"}`}>
      <div className="flex items-center gap-2 rounded-xl border border-congo-green/30 bg-congo-greenL px-3 py-2 shadow-lg ring-1 ring-congo-green/20 text-congo-green">
        {children}
        <button onClick={onClose} aria-label="Fermer" className="ml-1 rounded-md p-1 hover:bg-ink-100 text-ink-600"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
