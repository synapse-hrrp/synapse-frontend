"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Plus, Pencil, Trash2, Eye,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from "lucide-react";
import { listExamensPaginated, deleteExamen } from "@/lib/api";
import { useAuthz } from "@/lib/authz";

type Row = {
  id: string;
  patient?: { id:string; nom:string; prenom:string; numero_dossier?:string }|null;
  patient_id: string;
  service?: { slug:string; name:string }|null;
  service_slug?: string|null;
  code_examen?: string|null;
  nom_examen?: string|null;
  statut: "en_attente"|"en_cours"|"termine"|"valide";
  date_demande?: string|null;
  prix?: string|number|null;
  devise?: string|null;
  facture_id?: string|null;
  facture_numero?: string|null;
};

const PAGE_SIZE = 15;

export default function ExamensList({
  contextLabel = "Laboratoire",
  basePath = "/laboratoire/examens",
}:{
  contextLabel?: string;
  basePath?: string;
}) {
  const { canAny } = useAuthz();

  // ✅ Admin = token avec ability '*'
  const isAdmin = canAny(["*"]);

  const allow = {
    list:   canAny(["examen.view"]),
    create: canAny(["examen.request.create"]),
    view:   canAny(["examen.view"]),
    edit:   canAny(["examen.result.write"]),
    // ❗ Supprimer réservé aux admins uniquement
    del:    isAdmin,
  };

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string|null>(null);

  const lastPage = useMemo(()=>Math.max(1,Math.ceil(total/PAGE_SIZE)),[total]);

  async function load() {
    if (!allow.list) { setRows([]); setTotal(0); return; }
    setBusy(true); setErr(null);
    try {
      const payload:any = await listExamensPaginated({ page, per_page: PAGE_SIZE, search: q });
      const data:Row[]  = Array.isArray(payload) ? payload : (payload.data ?? []);
      const meta        = payload.meta || {};
      setRows(data); setTotal(meta.total ?? data.length);
    } catch (e:any) {
      setErr(e?.message || "Erreur de chargement");
      setRows([]); setTotal(0);
    } finally { setBusy(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[page, allow.list]);

  function onSearch(e:React.FormEvent){ e.preventDefault(); setPage(1); load(); }

  async function onDelete(id:string) {
    if(!allow.del) return;
    if(!confirm("Supprimer cet examen ?")) return;
    setBusy(true);
    try{
      await deleteExamen(id);
      if (rows.length===1 && page>1) setPage(p=>p-1); else load();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {/* Fil d’Ariane + action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>{contextLabel}</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Examens</li>
          </ol>
        </nav>
        {allow.create && (
          <Link
            href={`${basePath}/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            <Plus className="h-4 w-4" /> Nouvel examen
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
                value={q} onChange={(e)=>setQ(e.target.value)}
                placeholder="Code, nom examen, patient, n° dossier…"
                className="w-full rounded-lg border border-ink-100 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
              />
            </div>
            <button type="submit" disabled={busy}
              className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm hover:bg-ink-50 disabled:opacity-60">
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
              <Th>Code</Th>
              <Th>Examen</Th>
              <Th>Statut</Th>
              <Th>Prix</Th>
              <Th>Facture</Th>
              <Th className="text-right pr-3">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length===0 && !busy && (
              <tr><td colSpan={9} className="p-6 text-center text-ink-500">{err || "Aucun résultat"}</td></tr>
            )}
            {rows.map((r)=>(
              <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/40">
                <Td>{r.date_demande ? new Date(r.date_demande).toLocaleString() : "—"}</Td>
                <Td className="font-medium">
                  {(() => {
                    const n = r.patient?.nom ?? "";
                    const p = r.patient?.prenom ?? "";
                    const label = `${n} ${p}`.trim();
                    if (label) {
                      return (
                        <>
                          {label}
                          {r.patient?.numero_dossier ? (
                            <span className="ml-2 text-ink-500">({r.patient.numero_dossier})</span>
                          ) : null}
                        </>
                      );
                    }
                    return r.patient_id || "—";
                  })()}
                </Td>
                <Td>{r.service?.name ?? r.service_slug ?? "—"}</Td>
                <Td className="font-mono">{r.code_examen || "—"}</Td>
                <Td>{r.nom_examen || "—"}</Td>
                <Td>
                  <span className="rounded-full px-2 py-0.5 text-xs bg-ink-100">{r.statut}</span>
                </Td>
                <Td>{r.prix!=null ? `${r.prix} ${r.devise||""}` : "—"}</Td>
                <Td>
                  {r.facture_id && r.facture_numero ? (
                    <Link
                      href={`/factures/${r.facture_id}`}
                      className="underline underline-offset-2 hover:no-underline"
                      title={`Ouvrir la facture ${r.facture_numero}`}
                    >
                      {r.facture_numero}
                    </Link>
                  ) : (r.facture_numero || "—")}
                </Td>
                <Td className="text-right pr-3">
                  <div className="inline-flex items-center gap-1">
                    {allow.view && (
                      <Link href={`${basePath}/${r.id}`} className="icon-btn" aria-label="Détail">
                        <Eye className="h-4 w-4" />
                      </Link>
                    )}
                    {allow.edit && (
                      <Link href={`${basePath}/${r.id}/edit`} className="icon-btn" aria-label="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    )}
                    {/* 🛡️ Supprimer visible seulement si admin */}
                    {allow.del && (
                      <button onClick={()=>onDelete(r.id)} className="icon-btn text-congo-red" aria-label="Supprimer">
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

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-ink-600">Page {page} / {lastPage}</div>
        <div className="flex items-center gap-1">
          <PageBtn onClick={()=>setPage(1)} disabled={page===1}><ChevronsLeft className="h-4 w-4" /></PageBtn>
          <PageBtn onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}><ChevronLeft className="h-4 w-4" /></PageBtn>
          <PageBtn onClick={()=>setPage(p=>Math.min(lastPage,p+1))} disabled={page===lastPage}><ChevronRight className="h-4 w-4" /></PageBtn>
          <PageBtn onClick={()=>setPage(lastPage)} disabled={page===lastPage}><ChevronsRight className="h-4 w-4" /></PageBtn>
        </div>
      </div>

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
