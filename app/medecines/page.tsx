// app/medecines/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { AdminGuard } from "@/lib/authz";
import {
  listMedecinesPaginated,
  deleteMedecine,
  listAllServices,
} from "@/lib/api";
import {
  Search, Plus, Pencil, Trash2, Eye,
  CheckCircle2, X, CalendarClock, Stethoscope
} from "lucide-react";

type Row = {
  id: string;
  patient_id?: string | null;
  visite_id?: string | null;
  service_id?: number | string | null;
  date_acte: string;
  motif?: string | null;
  diagnostic?: string | null;
  statut: string;
  soignant?: { id: number; first_name?: string | null; last_name?: string | null } | null;
  // relation patient renvoyée par l’API
  patient?: {
    id: string;
    nom?: string | null;
    prenom?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    numero_dossier?: string | null;
  } | null;
};

const PAGE_SIZE = 15;

export default function MedecinesListPage() {
  return (
    <AdminGuard>
      <MedecinesListInner />
    </AdminGuard>
  );
}

function MedecinesListInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });
  const [serviceMap, setServiceMap] = useState<Map<number | string, string>>(new Map());

  const lastPage = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // Flash notifications
  useEffect(() => {
    const f = sp?.get("flash");
    if (f === "created") setToast({ show: true, text: "Acte médical enregistré." });
    if (f === "updated") setToast({ show: true, text: "Acte médical mis à jour." });
    if (f === "deleted") setToast({ show: true, text: "Acte médical supprimé." });
    if (f) {
      router.replace("/medecines", { scroll: false });
      const tid = setTimeout(() => setToast({ show: false, text: "" }), 3500);
      return () => clearTimeout(tid);
    }
  }, [sp, router]);

  // Charger services pour libellés
  useEffect(() => {
    (async () => {
      try {
        const raw = await listAllServices();
        const arr: Array<{ id: number | string; name: string }> = Array.isArray(raw) ? raw : (raw?.data ?? raw ?? []);
        setServiceMap(new Map(arr.map(s => [s.id, s.name])));
      } catch {}
    })();
  }, []);

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const payload: any = await listMedecinesPaginated({
        page,
        per_page: PAGE_SIZE,
        q,
        statut,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort: "-date_acte",
      });
      const data: Row[] = Array.isArray(payload) ? payload : (payload.data ?? []);
      const meta = payload.meta || {};
      const add = payload.total ?? meta.total;
      setRows(data);
      setTotal(add ?? data.length);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
      setRows([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [page]);

  function resetAndSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer cet acte médical ?")) return;
    try {
      setBusy(true);
      await deleteMedecine(id);
      if (rows.length === 1 && page > 1) setPage(p => p - 1);
      else load();
      setToast({ show: true, text: "Acte médical supprimé." });
      setTimeout(() => setToast({ show: false, text: "" }), 3000);
    } catch (e: any) {
      alert("Suppression impossible : " + (e?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  // ✅ garantit toujours une string (évite les underline TS)
  function patientLabel(r: Row): string {
    const p = r.patient;
    if (p) {
      const nom = String(p.nom ?? p.last_name ?? "").trim();
      const prenom = String(p.prenom ?? p.first_name ?? "").trim();
      const base = (nom || prenom) ? `${nom} ${prenom}`.trim() : String(p.id);
      return p.numero_dossier ? `${base} (${p.numero_dossier})` : base;
    }
    return String(r.patient_id ?? "—");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Médecine" subtitle="Lister, rechercher et gérer les actes médicaux" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li>Portail</li><li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Médecine</li>
            </ol>
          </nav>

          <Link href="/medecines/new" className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-congo-green/30">
            <Plus className="h-4 w-4" /> Nouvel acte
          </Link>
        </div>

        <form onSubmit={resetAndSearch} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Motif, diagnostic, observation…"
                className="w-full rounded-lg border border-ink-100 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
              />
            </div>
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20">
              <option value="">— Statut —</option>
              <option value="en_cours">en_cours</option>
              <option value="clos">clos</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20" />
            <div className="flex gap-2">
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20" />
              <button type="submit" disabled={busy} className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm hover:bg-ink-50 focus:outline-none focus:ring-2 focus:ring-congo-green/20 disabled:opacity-60">
                Rechercher
              </button>
            </div>
          </div>
        </form>

        <div className="overflow-auto rounded-xl border border-ink-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-700">
              <tr>
                <Th>Date</Th>
                <Th>Patient</Th>
                <Th>Motif</Th>
                <Th>Diagnostic</Th>
                <Th>Soignant</Th>
                <Th>Service</Th>
                <Th>Statut</Th>
                <Th className="text-right pr-3">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !busy && (<tr><td colSpan={8} className="p-6 text-center text-ink-500">Aucun résultat</td></tr>)}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/40">
                  <Td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" /> {new Date(r.date_acte).toLocaleString()}
                    </span>
                  </Td>

                  {/* Patient */}
                  <Td className="max-w-[240px] truncate" title={patientLabel(r)}>
                    {r.patient?.id ? (
                      <Link href={`/patients/${r.patient.id}`} className="hover:underline">
                        {patientLabel(r)}
                      </Link>
                    ) : (
                      patientLabel(r)
                    )}
                  </Td>

                  <Td className="max-w-[220px] truncate" title={r.motif || ""}>
                    <span className="inline-flex items-center gap-1">
                      <Stethoscope className="h-3.5 w-3.5" /> {r.motif || "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[260px] truncate" title={r.diagnostic || ""}>{r.diagnostic || "—"}</Td>
                  <Td>{r.soignant ? `${r.soignant.first_name ?? ""} ${r.soignant.last_name ?? ""}`.trim() : "—"}</Td>

                  {/* ✅ cast de la clé lors du .get() */}
                  <Td>
                    {r.service_id != null && r.service_id !== ""
                      ? (serviceMap.get(r.service_id as number | string) ?? String(r.service_id))
                      : "—"}
                  </Td>

                  <Td>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${r.statut === "clos" ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                      {r.statut}
                    </span>
                  </Td>
                  <Td className="text-right pr-3">
                    <div className="inline-flex items-center gap-1">
                      <Link href={`/medecines/${r.id}`} className="icon-btn" aria-label="Détail"><Eye className="h-4 w-4" /></Link>
                      <Link href={`/medecines/${r.id}/edit`} className="icon-btn" aria-label="Modifier"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => onDelete(r.id)} className="icon-btn text-congo-red" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </Td>
                </tr>
              ))}
              {busy && (<tr><td colSpan={8} className="p-6 text-center text-ink-500">Chargement…</td></tr>)}
              {err && !busy && rows.length > 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-congo-red text-sm">{err}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination simple */}
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm hover:bg-ink-50 disabled:opacity-50">Précédent</button>
          <div className="text-sm opacity-70">Page {page} / {lastPage}</div>
          <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page >= lastPage} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm hover:bg-ink-50 disabled:opacity-50">Suivant</button>
        </div>
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
