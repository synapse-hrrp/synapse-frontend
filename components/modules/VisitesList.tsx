"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Plus, Pencil, Trash2, Eye,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from "lucide-react";
import { listVisitesPaginated, deleteVisite } from "@/lib/api";
import { useAuthz } from "@/lib/authz";

type Row = {
  id: string | number;

  // Relations (quand disponibles)
  patient?: { nom?: string; prenom?: string; numero_dossier?: string } | null;
  service?: { name?: string } | null;

  // ⚠️ Aligner avec Show: medecin?.nom peut exister
  medecin?: { nom?: string | null } | null;

  // Clés brutes
  patient_id: string;
  service_id: number;

  // Champs migration
  plaintes_motif?: string | null;
  statut?: "EN_ATTENTE" | "A_ENCAISSER" | "PAYEE" | "CLOTUREE";
  heure_arrivee?: string | null;
  medecin_id?: number | null;
  medecin_nom?: string | null; // snapshot du nom (comme Show)
  agent_id?: number | null;
  agent_nom?: string | null;

  // Montant via 'prix'
  prix?: {
    tarif_id?: string | null;
    tarif?: {
      code?: string | null;
      libelle?: string | null;
      montant?: number | string | null;
      devise?: string | null;
    } | null;
    montant_prevu?: number | string | null;
    montant_du?: number | string | null;
    devise?: string | null;
  } | null;

  // Facture
  facture_numero?: string | null;

  created_at?: string;
};

const PAGE_SIZE = 15;

export default function VisitesList({ contextLabel = "Réception" }:{ contextLabel?: string }) {
  const { canAny } = useAuthz();
  const allow = {
    list:   canAny(["visites.read"]),
    view:   canAny(["visites.read"]),
    create: canAny(["visites.write"]),
    edit:   canAny(["visites.write"]),
    del:    canAny(["visites.write"]),
  };

  const [q,setQ]=useState("");
  const [page,setPage]=useState(1);
  const [rows,setRows]=useState<Row[]>([]);
  const [total,setTotal]=useState(0);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState<string|null>(null);

  const lastPage = useMemo(()=>Math.max(1,Math.ceil(total/PAGE_SIZE)),[total]);

  async function load(){
    if(!allow.list){ setRows([]); setTotal(0); return; }
    setBusy(true); setErr(null);
    try{
      const payload:any = await listVisitesPaginated({ page, per_page: PAGE_SIZE });
      const data:Row[] = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
      const meta = payload ?? {};
      setRows(data);
      setTotal(meta.total ?? data.length);
    }catch(e:any){
      setErr(e?.message||"Erreur de chargement"); setRows([]); setTotal(0);
    } finally { setBusy(false); }
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[page, allow.list]);

  function onSearch(e:React.FormEvent){
    e.preventDefault();
    setPage(1);
  }

  const filteredRows = useMemo(()=>{
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r=>{
      const p = `${r.patient?.nom ?? ""} ${r.patient?.prenom ?? ""} ${r.patient?.numero_dossier ?? ""}`.toLowerCase();
      const motif = (r.plaintes_motif ?? "").toLowerCase();
      const service = (r.service?.name ?? "").toLowerCase();
      const facture = (r.facture_numero ?? "").toLowerCase();
      return p.includes(term) || motif.includes(term) || service.includes(term) || facture.includes(term);
    });
  },[rows,q]);

  async function onDelete(id:string|number){
    if(!allow.del) return;
    if(!confirm("Supprimer cette visite ?")) return;
    setBusy(true);
    try{
      await deleteVisite(id);
      if(rows.length===1 && page>1) setPage(p=>p-1); else load();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {/* Fil d’Ariane + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>{contextLabel}</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Admissions</li>
          </ol>
        </nav>
        {allow.create && (
          <Link href="./visites/new" className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
            <Plus className="h-4 w-4" /> Nouvelle visite
          </Link>
        )}
      </div>

      {/* Recherche (client-side) */}
      {allow.list && (
        <form onSubmit={onSearch} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                value={q} onChange={(e)=>setQ(e.target.value)}
                placeholder="Nom patient, n° dossier, motif, facture…"
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
              <Th>Date</Th>
              <Th>Patient</Th>
              <Th>Service</Th>
              <Th>Statut</Th>
              <Th>Arrivée</Th>
              <Th>Médecin</Th>
              <Th>Montant</Th>
              <Th>Facture #</Th>
              <Th className="text-right pr-3">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length===0 && !busy && (
              <tr><td colSpan={9} className="p-6 text-center text-ink-500">Aucun résultat</td></tr>
            )}
            {filteredRows.map((r)=>(
              <tr key={String(r.id)} className="border-t border-ink-100 hover:bg-ink-50/40">
                {/* Date de création */}
                <Td>{r.created_at ? formatDateTime(r.created_at) : "—"}</Td>

                {/* Patient + n° dossier */}
                <Td className="font-medium" title={r.plaintes_motif || ""}>
                  {displayPatient(r)}
                  {r.patient?.numero_dossier ? (
                    <span className="ml-2 text-ink-500">({r.patient.numero_dossier})</span>
                  ) : null}
                </Td>

                {/* Service */}
                <Td>{r.service?.name || r.service_id}</Td>

                {/* Statut */}
                <Td><StatutBadge statut={r.statut} /></Td>

                {/* Heure d'arrivée */}
                <Td>{r.heure_arrivee ? formatDateTime(r.heure_arrivee) : "—"}</Td>

                {/* ✅ Médecin — même logique que le Show */}
                <Td>{displayMedecin(r)}</Td>

                {/* Montant via resource.prix */}
                <Td>{
                  (() => {
                    const m = r.prix?.montant_prevu ?? r.prix?.tarif?.montant ?? null;
                    const d = r.prix?.devise ?? r.prix?.tarif?.devise ?? null;
                    return formatMontant(m, d);
                  })()
                }</Td>

                {/* Facture # */}
                <Td>{r.facture_numero ?? "—"}</Td>

                {/* Actions */}
                <Td className="text-right pr-3">
                  <div className="inline-flex items-center gap-1">
                    {allow.view && (
                      <Link href={`/reception/visites/${r.id}`} className="icon-btn" aria-label="Détail">
                        <Eye className="h-4 w-4" />
                      </Link>
                    )}
                    {allow.edit && (
                      <Link href={`/reception/visites/${r.id}/edit`} className="icon-btn" aria-label="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    )}
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

      {err && <p className="text-sm text-congo-red">{err}</p>}

      <style jsx global>{`
        .icon-btn { display:inline-flex; align-items:center; justify-content:center; padding:6px; border-radius:8px; color:#111827; }
        .icon-btn:hover { background:#f3f4f6; }
      `}</style>
    </div>
  );
}

/* ===================== Helpers UI ===================== */

function Th({ children, className="" }: any) {
  return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className="" }: any) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}
function PageBtn({ children, disabled, onClick }: any) {
  return <button disabled={disabled} onClick={onClick} className="rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 hover:bg-ink-50 disabled:opacity-40">{children}</button>;
}

function displayPatient(r: Row){
  const nom = r.patient?.nom?.trim();
  const prenom = r.patient?.prenom?.trim();
  if (nom || prenom) return `${nom ?? ""} ${prenom ?? ""}`.trim();
  return r.patient_id;
}

/** ✅ EXACTEMENT comme Show: medecin_nom → medecin?.nom → #id → — */
function displayMedecin(r: Row){
  if (r.medecin_nom && r.medecin_nom.trim()) return r.medecin_nom.trim();
  const nomRel = r.medecin?.nom?.trim();
  if (nomRel) return nomRel;
  return r.medecin_id ? `#${r.medecin_id}` : "—";
}

function formatDateTime(v?: string | null){
  if(!v) return "—";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleString();
  } catch { return v; }
}

function formatMontant(m?: string | number | null, devise?: string | null){
  if (m === null || m === undefined || m === "") return "—";
  const n = typeof m === "string" ? Number(m) : m;
  if (Number.isNaN(n)) return `${m} ${devise ?? ""}`.trim();
  const out = new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  return devise ? `${out} ${devise}` : out;
}

function StatutBadge({ statut }: { statut?: Row["statut"] }) {
  const map: Record<NonNullable<Row["statut"]>, { label: string; className: string }> = {
    EN_ATTENTE:  { label: "En attente",  className: "bg-amber-50 text-amber-700 border border-amber-200" },
    A_ENCAISSER: { label: "À encaisser", className: "bg-sky-50 text-sky-700 border border-sky-200" },
    PAYEE:       { label: "Payée",       className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    CLOTUREE:    { label: "Clôturée",    className: "bg-gray-100 text-gray-700 border border-gray-200" },
  };
  if (!statut) return <span className="text-ink-400">—</span>;
  const { label, className } = map[statut] ?? { label: statut, className: "bg-ink-100 text-ink-700 border border-ink-200" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}
