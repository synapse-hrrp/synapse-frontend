"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Search, Plus, Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

type ReagentRow = { id:number; name:string; sku:string; uom:string; reorder_point:number|null };

const PAGE_SIZE = 20;
// Si tes routes PATCH/DELETE ne sont pas encore publiées, mets à false :
const CAN_EDIT = true;
const CAN_DELETE = true;

export default function ReactifsListPage() {
  return <Inner />;
}

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReagentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const lastPage = useMemo(()=>Math.max(1, Math.ceil(total / PAGE_SIZE)),[total]);

  useEffect(()=>{ if (sp?.get("flash")) router.replace("/stock-reactifs/reactifs",{scroll:false}); },[sp,router]);

  async function load(){
    setBusy(true);
    try {
      const qs = new URLSearchParams({ page:String(page) });
      if (q.trim()) qs.set("search", q.trim());
      const res:any = await apiFetch(`/inventory/reagents?${qs.toString()}`, { method:"GET" });
      const data:ReagentRow[] = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const meta = res?.meta || {};
      setRows(data);
      setTotal(Number(meta.total ?? data.length));
    } finally { setBusy(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[page]);

  function onSearch(e:React.FormEvent){ e.preventDefault(); setPage(1); load(); }

  async function onDelete(id:number){
    if (!CAN_DELETE) return;
    if (!confirm("Supprimer ce réactif ?")) return;
    setBusy(true);
    try {
      await apiFetch(`/inventory/reagents/${id}`, { method:"DELETE" });
      if (rows.length===1 && page>1) setPage(p=>p-1); else await load();
      router.replace("/stock-reactifs/reactifs?flash=deleted");
    } catch(e:any){ alert("Suppression impossible : " + (e?.message || "inconnue")); }
    finally{ setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2"><li>Portail</li><li aria-hidden>/</li><li className="font-medium text-ink-900">Réactifs</li></ol>
        </nav>
        <Link href="/stock-reactifs/reactifs/new" className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
          <Plus className="h-4 w-4" /> Nouveau
        </Link>
      </div>

      <form onSubmit={onSearch} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Nom ou SKU…" className="w-full rounded-lg border border-ink-100 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"/>
          </div>
          <button className="rounded-lg border px-3 py-2.5 text-sm">Rechercher</button>
        </div>
      </form>

      <div className="overflow-auto rounded-xl border border-ink-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-700"><tr><Th>Nom</Th><Th>SKU</Th><Th>UoM</Th><Th>Seuil réappro</Th><Th className="text-right pr-3">Actions</Th></tr></thead>
          <tbody>
            {rows.length===0 && !busy && (<tr><td colSpan={5} className="p-6 text-center text-ink-500">Aucun résultat</td></tr>)}
            {rows.map(r=>(
              <tr key={r.id} className="border-t hover:bg-ink-50/40">
                <Td className="font-medium">{r.name}</Td>
                <Td className="font-mono">{r.sku}</Td>
                <Td>{r.uom}</Td>
                <Td>{r.reorder_point ?? 0}</Td>
                <Td className="text-right pr-3">
                  <div className="inline-flex items-center gap-1">
                    {CAN_EDIT && <Link href={`/stock-reactifs/reactifs/${r.id}/edit`} className="icon-btn" aria-label="Modifier"><Pencil className="h-4 w-4"/></Link>}
                    {CAN_DELETE && <button onClick={()=>onDelete(r.id)} className="icon-btn text-congo-red" aria-label="Supprimer"><Trash2 className="h-4 w-4"/></button>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} lastPage={lastPage} onPage={setPage} busy={busy}/>
      <style jsx global>{`.icon-btn{display:inline-flex;align-items:center;justify-content:center;padding:6px;border-radius:8px;color:#111827}.icon-btn:hover{background:#f3f4f6}`}</style>
    </main>
  );
}

function Pagination({ page, lastPage, onPage, busy }:{page:number;lastPage:number;onPage:(p:number)=>void;busy?:boolean}){
  const disPrev = busy || page<=1; const disNext = busy || page>=lastPage;
  return (
    <div className="flex items-center justify-center gap-1">
      <IconBtn disabled={disPrev} onClick={()=>onPage(1)} ariaLabel="Première"><ChevronsLeft className="h-4 w-4"/></IconBtn>
      <IconBtn disabled={disPrev} onClick={()=>onPage(page-1)} ariaLabel="Précédente"><ChevronLeft className="h-4 w-4"/></IconBtn>
      <span className="px-2 text-sm text-ink-600">Page {page} / {lastPage}</span>
      <IconBtn disabled={disNext} onClick={()=>onPage(page+1)} ariaLabel="Suivante"><ChevronRight className="h-4 w-4"/></IconBtn>
      <IconBtn disabled={disNext} onClick={()=>onPage(lastPage)} ariaLabel="Dernière"><ChevronsRight className="h-4 w-4"/></IconBtn>
    </div>
  );
}
function IconBtn({children,onClick,disabled,ariaLabel}:{children:React.ReactNode;onClick:()=>void;disabled?:boolean;ariaLabel?:string}){
  return <button type="button" aria-label={ariaLabel} disabled={disabled} onClick={onClick} className="inline-flex items-center justify-center rounded-md p-2 text-ink-700 hover:bg-ink-50 disabled:opacity-50">{children}</button>;
}
function Th({children,className=""}:any){return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>;}
function Td({children,className=""}:any){return <td className={`px-3 py-2 ${className}`}>{children}</td>;}
