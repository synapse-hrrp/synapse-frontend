// app/caisse/rapport/page.tsx
"use client";
import { useEffect, useState } from "react";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { AbilityGuard } from "@/lib/authz";
import { listAllServices } from "@/lib/api";
import {
  cashPayments,
  cashPaymentsExportCsv,
  cashSummary,
  cashTopOverview,
} from "@/lib/api/caisse";

export default function CaisseRapportPage() {
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    service_id: "",
    cashier_id: "",
    mode: "",
    workstation: "",
  });
  const [rows, setRows] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [tops, setTops] = useState<any>({});
  const [services, setServices] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const p = await cashPayments(filters);
      setRows(p?.data ?? []);
      setKpis(p?.meta?.kpis ?? {});
      const t = await cashTopOverview({ period: "day" });
      setTops(t?.data ?? {});
      const svc = await listAllServices();
      setServices(Array.isArray(svc) ? svc : svc?.data ?? []);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onExport() {
    try {
      const csv = await cashPaymentsExportCsv(filters);
      const blob = new Blob([csv as any], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cash_payments.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Export impossible: " + (e?.message || ""));
    }
  }

  return (
    <AbilityGuard anyOf={["caisse.report.view"]}>
      <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white">
        <TopIdentityBar />
        <SiteHeader title="Rapport Caisse" subtitle="Lecture transversale & exports" />
        <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
          {/* Filtres */}
          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-sm">
              <F label="Du">
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="rounded-lg border px-3 py-2 w-full"
                />
              </F>
              <F label="Au">
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="rounded-lg border px-3 py-2 w-full"
                />
              </F>
              <F label="Service">
                <select
                  value={filters.service_id}
                  onChange={(e) => setFilters({ ...filters, service_id: e.target.value })}
                  className="rounded-lg border px-3 py-2 w-full"
                >
                  <option value="">— Tous —</option>
                  {services.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </F>
              <F label="Mode">
                <select
                  value={filters.mode}
                  onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
                  className="rounded-lg border px-3 py-2 w-full"
                >
                  <option value="">— Tous —</option>
                  <option value="CASH">ESPECES</option>
                  <option value="MOBILE">MOBILE</option>
                  <option value="CARD">CARTE</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="VIREMENT">VIREMENT</option>
                </select>
              </F>
              <F label="Poste">
                <input
                  value={filters.workstation}
                  onChange={(e) => setFilters({ ...filters, workstation: e.target.value })}
                  className="rounded-lg border px-3 py-2 w-full"
                  placeholder="POS-01"
                />
              </F>
              <div className="flex items-end gap-2">
                <button onClick={load} className="rounded-lg border px-3 py-2">
                  Filtrer
                </button>
                <button
                  onClick={onExport}
                  className="rounded-lg bg-ink-900 text-white px-3 py-2"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </section>

          {/* KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <K k="Total encaissé" v={Number(kpis.total_amount || 0).toLocaleString()} />
            <K k="# paiements" v={kpis.payments ?? 0} />
            <K k="Panier moyen" v={Number(kpis.avg_ticket || 0).toLocaleString()} />
          </section>

          {/* Table */}
          <section className="rounded-xl border bg-white p-4 shadow-sm overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr>
                  <Th>Date</Th>
                  <Th>Facture</Th>
                  <Th>Montant</Th>
                  <Th>Mode</Th>
                  <Th>Référence</Th>
                  <Th>Caissier</Th>
                  <Th>Poste</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-ink-500">
                      {busy ? "Chargement…" : "Aucun paiement"}
                    </td>
                  </tr>
                )}
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <Td>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </Td>
                    <Td>{r.facture?.numero || "—"}</Td>
                    <Td>
                      {Number(r.montant || 0).toLocaleString()}{" "}
                      {r.devise || r.facture?.devise || ""}
                    </Td>
                    <Td>{r.mode}</Td>
                    <Td>{r.reference || "—"}</Td>
                    <Td>{r.cashier?.name || "—"}</Td>
                    <Td>{r.workstation || r.cashSession?.workstation || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Tops */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card title="Top Services">
              <ul className="text-sm divide-y">
                {(tops?.services ?? []).map((s: any) => (
                  <li key={s.id} className="py-2 flex justify-between">
                    <span>{s.label}</span>
                    <b>{Number(s.total_amount).toLocaleString()}</b>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Top Caissiers">
              <ul className="text-sm divide-y">
                {(tops?.cashiers ?? []).map((c: any) => (
                  <li key={c.id} className="py-2 flex justify-between">
                    <span>{c.label}</span>
                    <b>{Number(c.total_amount).toLocaleString()}</b>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </main>
        <SiteFooter />
      </div>
    </AbilityGuard>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <div className="text-ink-700">{label}</div>
      <div className="mt-1">{children}</div>
    </label>
  );
}
function K({ k, v }: { k: string; v: any }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-ink-600">{k}</div>
      <div className="mt-1 text-lg font-semibold">{v}</div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {children}
    </section>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2 font-semibold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}
