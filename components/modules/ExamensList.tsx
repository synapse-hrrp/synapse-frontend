"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Search, Plus, Pencil, Trash2, Eye,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
} from "lucide-react";
import { listExamensPaginated, deleteExamen } from "@/lib/api";
import { useAuthz } from "@/lib/authz";

// shadcn/ui
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/datepicker";

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

/* Helpers */
function labelPatient(r: Row) {
  const n = r.patient?.nom ?? "";
  const p = r.patient?.prenom ?? "";
  const label = `${n} ${p}`.trim();
  return label || r.patient_id || "";
}

export default function ExamensList({
  contextLabel = "Laboratoire",
  basePath = "/laboratoire/examens",
}:{
  contextLabel?: string;
  basePath?: string;
}) {
  const { canAny } = useAuthz();
  const isAdmin = canAny(["*"]);
  const allow = {
    list:   canAny(["examen.view"]),
    create: canAny(["examen.request.create"]),
    view:   canAny(["examen.view"]),
    edit:   canAny(["examen.result.write"]),
    del:    isAdmin,
  };

  // Recherche (debounce côté saisie uniquement)
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  // ✅ 3 filtres
  const [statut, setStatut]           = useState<Row["statut"] | undefined>(undefined);
  const [serviceSlug, setServiceSlug] = useState<string | undefined>(undefined);
  const [dateDemande, setDateDemande] = useState<Date | null>(null);

  // Datas
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string|null>(null);
  const lastPage = useMemo(()=>Math.max(1,Math.ceil(total/PAGE_SIZE)),[total]);

  // ==== CHARGEUR UNIFIÉ ====
  async function load(opts?: Partial<{
    page: number;
    q: string;
    statut: Row["statut"] | undefined;
    serviceSlug: string | undefined;
    dateDemande: Date | null;
  }>) {
    if (!allow.list) { setRows([]); setTotal(0); return; }

    const eff = {
      page: opts?.page ?? page,
      q: opts?.q ?? q,
      statut: opts?.statut ?? statut,
      serviceSlug: opts?.serviceSlug ?? serviceSlug,
      dateDemande: opts?.dateDemande ?? dateDemande,
    };

    const params: any = {
      page: eff.page,
      per_page: PAGE_SIZE,
      search: eff.q || undefined,

      // ✅ Compat: on envoie plusieurs clés courantes pour maximiser les chances côté backend
      statut: eff.statut || undefined,
      service: eff.serviceSlug || undefined,
      service_slug: eff.serviceSlug || undefined,
    };

    if (eff.dateDemande) {
      const d = format(eff.dateDemande, "yyyy-MM-dd");
      params.date_demande = d;
      params.date = d;
    }

    // Debug (optionnel) — commente si tu ne veux pas de logs
    // eslint-disable-next-line no-console
    console.log("[ExamensList] load params =>", params);

    setBusy(true); setErr(null);
    try {
      const payload:any = await listExamensPaginated(params);
      const data:Row[]  = Array.isArray(payload) ? payload : (payload.data ?? []);
      const meta        = payload.meta || {};
      setRows(data); setTotal(meta.total ?? data.length);
    } catch (e:any) {
      setErr(e?.message || "Erreur de chargement");
      setRows([]); setTotal(0);
    } finally { setBusy(false); }
  }

  // Recherche: debounce qInput -> q, puis recharge
  useEffect(()=>{
    const t = setTimeout(()=>{
      const nextQ = qInput;
      setQ(nextQ);
      setPage(1);
      load({ q: nextQ, page: 1 });
    }, 300);
    return ()=>clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  // Initial load
  useEffect(()=>{ load(); /* eslint-disable-next-line */},[]);

  // ✅ Watchdog: si un filtre change et, pour une raison quelconque,
  // le handler n'a pas suffi, on recharge "au cas où"
  useEffect(()=>{
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut, serviceSlug, dateDemande]);

  async function onDelete(id:string) {
    if(!allow.del) return;
    if(!confirm("Supprimer cet examen ?")) return;
    setBusy(true);
    try{
      await deleteExamen(id);
      if (rows.length===1 && page>1) {
        const newPage = page-1;
        setPage(newPage);
        await load({ page: newPage });
      } else {
        await load();
      }
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

      {/* Recherche & Filtres */}
      {allow.list && (
        <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Recherche texte (debouncée) */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <Input
                value={qInput}
                onChange={(e)=> setQInput(e.target.value)}
                placeholder="Code, nom examen, patient, n° dossier…"
                className="pl-9"
              />
            </div>

            {/* Statut — immédiat */}
            <Select
              value={statut ?? "all"}
              onValueChange={(v)=>{
                const next = v==="all" ? undefined : (v as Row["statut"]);
                setStatut(next);
                setPage(1);
                load({ statut: next, page: 1 });
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
                <SelectItem value="valide">Validé</SelectItem>
              </SelectContent>
            </Select>

            {/* Service — immédiat */}
            <Select
              value={serviceSlug ?? "all"}
              onValueChange={(v)=>{
                const next = v==="all" ? undefined : v;
                setServiceSlug(next);
                setPage(1);
                load({ serviceSlug: next, page: 1 });
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="biochimie">Biochimie</SelectItem>
                <SelectItem value="hematologie">Hématologie</SelectItem>
                <SelectItem value="immunologie">Immunologie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date unique (date_demande) — immédiate */}
          <div className="flex items-center gap-3">
            <DatePicker
              date={dateDemande}
              onChange={(d)=>{
                setDateDemande(d);
                setPage(1);
                load({ dateDemande: d, page: 1 });
              }}
              placeholder="Date (date demande)"
            />
            <Button
              onClick={()=>{
                setQInput(""); setQ("");
                setStatut(undefined);
                setServiceSlug(undefined);
                setDateDemande(null);
                setPage(1);
                load({ q:"", statut: undefined, serviceSlug: undefined, dateDemande: null, page: 1 });
              }}
              variant="outline"
              size="sm"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
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
                      const label = labelPatient(r);
                      return label ? (
                        <>
                          {label}
                          {r.patient?.numero_dossier ? (
                            <span className="ml-2 text-ink-500">({r.patient.numero_dossier})</span>
                          ) : null}
                        </>
                      ) : "—";
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
          <PageBtn onClick={async ()=>{ setPage(1); await load({ page: 1 }); }} disabled={page===1}><ChevronsLeft className="h-4 w-4" /></PageBtn>
          <PageBtn onClick={async ()=>{ const p=Math.max(1,page-1); setPage(p); await load({ page: p }); }} disabled={page===1}><ChevronLeft className="h-4 w-4" /></PageBtn>
          <PageBtn onClick={async ()=>{ const p=Math.min(lastPage,page+1); setPage(p); await load({ page: p }); }} disabled={page===lastPage}><ChevronRight className="h-4 w-4" /></PageBtn>
          <PageBtn onClick={async ()=>{ setPage(lastPage); await load({ page: lastPage }); }} disabled={page===lastPage}><ChevronsRight className="h-4 w-4" /></PageBtn>
        </div>
      </div>

      <style jsx global>{`
        .icon-btn { display:inline-flex; align-items:center; justify-content:center; padding:6px; border-radius:8px; color:#111827; }
        .icon-btn:hover { background:#f3f4f6; }
      `}</style>
    </div>
  );
}

/* UI helpers */
function Th({ children, className="" }: any) { return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>; }
function Td({ children, className="" }: any) { return <td className={`px-3 py-2 ${className}`}>{children}</td>; }
function PageBtn({ children, disabled, onClick }: any) {
  return <button disabled={disabled} onClick={onClick} className="rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 hover:bg-ink-50 disabled:opacity-40">{children}</button>;
}
