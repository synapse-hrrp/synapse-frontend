"use client";

import { useEffect, useMemo, useState } from "react";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { AdminGuard } from "@/lib/authz";
import { cashReportSummary } from "@/lib/api";

type Row = { jour: string; mode: string; cashier_id: number|null; nb: number; total: number };

export default function RapportsPage() {
  return (
    <AdminGuard>
      <Inner />
    </AdminGuard>
  );
}

function Inner() {
  const today = new Date().toISOString().slice(0,10);
  const [from, setFrom] = useState<string>(today);
  const [to, setTo] = useState<string>(today);
  const [mode, setMode] = useState("");
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [tot, setTot]   = useState<{nb:number,total:number}>({nb:0,total:0});

  async function load(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    try {
      const r: any = await cashReportSummary({ from, to, user_id: userId || undefined, mode: mode || undefined });
      setRows(r?.summary || []); setTot(r?.totals || {nb:0,total:0});
    } finally { setBusy(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[]);

  const byMode = useMemo(()=> {
    const m = new Map<string,{nb:number,total:number}>();
    rows.forEach(r => {
      const k = (r.mode || "—").toUpperCase();
      if (!m.has(k)) m.set(k,{nb:0,total:0});
      const a = m.get(k)!; a.nb += Number(r.nb||0); a.total += Number(r.total||0);
    });
    return Array.from(m.entries()).map(([mode, agg]) => ({ mode, ...agg }));
  }, [rows]);

  const byCaissier = useMemo(()=> {
    const m = new Map<string,{nb:number,total:number}>();
    rows.forEach(r => {
      const k = String(r.cashier_id ?? "—");
      if (!m.has(k)) m.set(k,{nb:0,total:0});
      const a = m.get(k)!; a.nb += Number(r.nb||0); a.total += Number(r.total||0);
    });
    return Array.from(m.entries()).map(([cashier_id, agg]) => ({ cashier_id, ...agg }));
  }, [rows]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Rapports Caisse" subtitle="Totaux par jour, mode et caissier" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <form onSubmit={load} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-ink-600">Du</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600">Au</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600">Mode</label>
              <select value={mode} onChange={e=>setMode(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2">
                <option value="">Tous</option>
                <option value="cash">Espèces</option>
                <option value="momo">Mobile Money</option>
                <option value="card">Carte</option>
                <option value="cheque">Chèque</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600">Caissier (ID)</label>
              <input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="ex: 21" className="mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2" />
            </div>
            <div className="flex items-end">
              <button className="rounded-lg border border-ink-100 bg-white px-3 py-2 hover:bg-ink-50 w-full">{busy ? "…" : "Filtrer"}</button>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card label="Nb encaissements" value={String(tot.nb)} />
          <Card label="Total encaissé" value={Number(tot.total).toLocaleString()} />
          <Card label="Période" value={`${from} → ${to}`} />
        </div>

        <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-2">Par mode</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {byMode.map(m => <Card key={m.mode} label={m.mode} value={`${m.nb} · ${m.total.toLocaleString()}`} />)}
            {!byMode.length && <div className="text-sm text-ink-500">Aucune donnée</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-2">Par caissier</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {byCaissier.map(c => <Card key={c.cashier_id} label={`#${c.cashier_id}`} value={`${c.nb} · ${c.total.toLocaleString()}`} />)}
            {!byCaissier.length && <div className="text-sm text-ink-500">Aucune donnée</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-700"><tr><Th>Jour</Th><Th>Mode</Th><Th>Caissier</Th><Th>Nb</Th><Th>Total</Th></tr></thead>
            <tbody>
              {rows.map((r, i)=>(
                <tr key={i} className="border-t border-ink-100">
                  <Td>{r.jour}</Td><Td>{r.mode}</Td><Td>{r.cashier_id ?? "—"}</Td><Td>{r.nb}</Td><Td>{Number(r.total).toLocaleString()}</Td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="p-4 text-center text-ink-500">Aucune donnée</td></tr>}
            </tbody>
          </table>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Card({label,value}:{label:string;value:string}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
      <div className="text-xs text-ink-600">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
function Th({ children, className="" }: any) { return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>; }
function Td({ children, className="" }: any) { return <td className={`px-3 py-2 ${className}`}>{children}</td>; }
