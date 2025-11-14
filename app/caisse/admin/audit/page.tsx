// app/caisse/admin/audit/page.tsx
"use client";
import { useEffect, useState } from "react";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { AbilityGuard } from "@/lib/authz";
import { cashAuditList, cashAuditExportCsv } from "@/lib/api/caisse";

export default function CaisseAuditPage() {
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    event: "",
    workstation: "",
    ip: "",
    search: "",
  });
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const res = await cashAuditList(filters);
      setRows(res?.data ?? []);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onExport() {
    try {
      const csv = await cashAuditExportCsv(filters);
      const blob = new Blob([csv as any], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cash_audit.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Export impossible: " + (e?.message || ""));
    }
  }

  return (
    <AbilityGuard anyOf={["caisse.audit.view"]}>
      <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white">
        <TopIdentityBar />
        <SiteHeader title="Admin Caisse" subtitle="Journal d’audit & supervision" />
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
              <F label="Événement">
                <select
                  value={filters.event}
                  onChange={(e) => setFilters({ ...filters, event: e.target.value })}
                  className="rounded-lg border px-3 py-2 w-full"
                >
                  <option value="">— Tous —</option>
                  <option value="SESSION_OPENED">SESSION_OPENED</option>
                  <option value="PAYMENT_CREATED">PAYMENT_CREATED</option>
                  <option value="SESSION_CLOSED">SESSION_CLOSED</option>
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
              <F label="IP">
                <input
                  value={filters.ip}
                  onChange={(e) => setFilters({ ...filters, ip: e.target.value })}
                  className="rounded-lg border px-3 py-2 w-full"
                />
              </F>
              <F label="Recherche">
                <input
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="rounded-lg border px-3 py-2 w-full"
                  placeholder="payload, ip…"
                />
              </F>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={load} className="rounded-lg border px-3 py-2">
                Filtrer
              </button>
              <button onClick={onExport} className="rounded-lg bg-ink-900 text-white px-3 py-2">
                Export CSV
              </button>
            </div>
          </section>

          {/* Table */}
          <section className="rounded-xl border bg-white p-4 shadow-sm overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr>
                  <Th>Date</Th>
                  <Th>Événement</Th>
                  <Th>Poste</Th>
                  <Th>IP</Th>
                  <Th>User</Th>
                  <Th>Session</Th>
                  <Th>Facture</Th>
                  <Th>Règlement</Th>
                  <Th>Payload</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-ink-500">
                      {busy ? "Chargement…" : "Aucune ligne"}
                    </td>
                  </tr>
                )}
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <Td>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</Td>
                    <Td>{r.event}</Td>
                    <Td>{r.workstation || r.session?.workstation || "—"}</Td>
                    <Td>{r.ip || "—"}</Td>
                    <Td>{r.user?.name || `#${r.user_id}`}</Td>
                    <Td>#{r.session_id}</Td>
                    <Td>{r.facture?.numero || r.facture_id || "—"}</Td>
                    <Td>{r.reglement_id || "—"}</Td>
                    <Td>
                      <code className="text-xs break-all">
                        {r.payload ? JSON.stringify(r.payload) : "—"}
                      </code>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
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
function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2 font-semibold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-top">{children}</td>;
}
