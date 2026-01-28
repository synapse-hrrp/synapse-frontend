"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cashPayments, cashAuditList, cashTopCashiers } from "@/lib/api/caisse";
import { factureTrashSoftDelete } from "@/lib/api/factures";

type PaymentUI = {
  id: string;
  facture_id?: string | null;
  created_at: string;
  montant: number;
  mode: string;
  reference?: string | null;
  devise: string;
  workstation?: string | null;
  cashier?: { id?: any; name?: string | null };
  facture?: { id?: string | null; numero?: string | null };
};

type Pagination = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

type KPIS = {
  total_amount: number;
  payments: number;
  avg_ticket: number;
  date_from?: string;
  date_to?: string;
};

type PaymentsResUI = {
  data: PaymentUI[];
  meta?: { pagination?: Pagination; kpis?: KPIS };
};

type AuditRow = {
  id: number | string;
  created_at: string;
  event: string;
  workstation: string | null;
  ip: string | null;
  payload?: any;
};

type CashierOpt = { id: string; label: string };

function n(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

// ✅ Convertit "2026-01-27 10:20:30" en ISO pour Date()
function toIso(dt: any) {
  const s = String(dt ?? "").trim();
  if (!s) return "";
  if (s.includes("T")) return s;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) return s.replace(" ", "T");
  return s;
}

function normalizeOnePayment(raw: any): PaymentUI {
  const id = String(raw?.id ?? raw?.uuid ?? raw?.reglement_id ?? "");

  const created_at = toIso(
    raw?.created_at ??
      raw?.createdAt ??
      raw?.date ??
      raw?.paid_at ??
      raw?.updated_at ??
      ""
  );

  const montant = n(
    raw?.montant ??
      raw?.amount ??
      raw?.total_amount ??
      raw?.total ??
      raw?.montant_total ??
      0
  );

  const devise =
    raw?.devise ??
    raw?.currency ??
    raw?.monnaie ??
    raw?.currency_code ??
    "XAF";

  const mode = String(raw?.mode ?? raw?.payment_mode ?? raw?.method ?? "");

  const reference = raw?.reference ?? raw?.ref ?? raw?.transaction_ref ?? null;

  const workstation =
    raw?.workstation ??
    raw?.workstation_name ??
    raw?.poste ??
    raw?.pos ??
    null;

  const cashierIdRaw =
    raw?.cashier_id ??
    raw?.cashier?.id ??
    raw?.user_id ??
    raw?.user?.id ??
    raw?.agent?.id ??
    null;

  const cashierName =
    raw?.cashier?.name ??
    (raw?.cashier?.first_name || raw?.cashier?.last_name
      ? `${raw?.cashier?.first_name ?? ""} ${raw?.cashier?.last_name ?? ""}`.trim()
      : null) ??
    raw?.caissier?.name ??
    raw?.user?.name ??
    raw?.agent?.name ??
    null;

  const factureNumero =
    raw?.facture?.numero ??
    raw?.invoice?.numero ??
    raw?.invoice_no ??
    raw?.facture_numero ??
    null;

  const factureIdRaw =
    raw?.facture_id ??
    raw?.invoice_id ??
    raw?.facture?.id ??
    raw?.invoice?.id ??
    null;

  const facture_id = factureIdRaw ? String(factureIdRaw) : null;

  return {
    id,
    facture_id,
    created_at,
    montant,
    devise,
    mode,
    reference,
    workstation,
    cashier: {
      id: cashierIdRaw != null ? String(cashierIdRaw) : undefined,
      name: cashierName ?? undefined,
    },
    facture: { id: facture_id ?? undefined, numero: factureNumero ?? undefined },
  };
}

function normalizePaymentsResponse(raw: any): PaymentsResUI {
  if (raw?.data && Array.isArray(raw.data) && raw?.meta?.current_page) {
    return {
      data: raw.data.map(normalizeOnePayment),
      meta: {
        pagination: {
          current_page: Number(raw.meta.current_page ?? 1),
          per_page: Number(raw.meta.per_page ?? 20),
          total: Number(raw.meta.total ?? raw.data.length),
          last_page: Number(raw.meta.last_page ?? 1),
        },
        kpis: raw.meta?.kpis,
      },
    };
  }

  if (Array.isArray(raw?.data)) {
    return { data: raw.data.map(normalizeOnePayment), meta: raw.meta };
  }

  if (raw?.data && typeof raw.data === "object" && Array.isArray(raw.data.data)) {
    return {
      data: raw.data.data.map(normalizeOnePayment),
      meta: raw.data.meta ?? raw.meta,
    };
  }

  if (Array.isArray(raw)) return { data: raw.map(normalizeOnePayment) };

  return { data: [], meta: raw?.meta };
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PaymentsPanel() {
  const today = useMemo(() => new Date(), []);
  const [dateTo, setDateTo] = useState(today.toISOString().slice(0, 10));

  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);
  const [dateFrom, setDateFrom] = useState(weekAgo);

  const [mode, setMode] = useState("");
  const [workstation, setWorkstation] = useState("");
  const [search, setSearch] = useState("");

  // ✅ filtre caissier
  const [cashierId, setCashierId] = useState<string>("");
  const [cashiers, setCashiers] = useState<CashierOpt[]>([]);
  const [cashiersLoading, setCashiersLoading] = useState(false);

  const [page, setPage] = useState(1);
  const perPage = 20;

  const [res, setRes] = useState<PaymentsResUI | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditTitle, setAuditTitle] = useState<string>("");

  // ✅ modal suppression facture
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFactureId, setDeleteFactureId] = useState<string>("");
  const [deleteComment, setDeleteComment] = useState<string>("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string>("");

  // ✅ charge options caissiers (en regardant 90 jours)
  useEffect(() => {
    let alive = true;
    setCashiersLoading(true);

    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 90);

    cashTopCashiers({ period: "range", date_from: ymd(from), date_to: ymd(now) } as any)
      .then((r: any) => {
        if (!alive) return;

        const arr =
          Array.isArray(r?.data) ? r.data :
          Array.isArray(r?.data?.data) ? r.data.data :
          Array.isArray(r?.data?.cashiers) ? r.data.cashiers :
          Array.isArray(r?.cashiers) ? r.cashiers :
          [];

        const opts: CashierOpt[] = arr
          .map((x: any) => ({
            id: String(x?.id ?? x?.cashier_id ?? ""),
            label: String(x?.label ?? x?.name ?? "—"),
          }))
          .filter((x: CashierOpt) => x.id && x.label);

        // unique
        const seen = new Set<string>();
        const uniq = opts.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));

        setCashiers(uniq);
      })
      .catch(() => {
        if (!alive) return;
        setCashiers([]);
      })
      .finally(() => alive && setCashiersLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  async function load(p: number) {
    setLoading(true);
    setErrMsg("");
    try {
      const raw: any = await cashPayments({
        page: p,
        per_page: perPage,
        date_from: dateFrom,
        date_to: dateTo,
        mode: mode || undefined,
        workstation: workstation || undefined,
        search: search || undefined,

        // ✅ NEW: cashier_id
        cashier_id: cashierId || undefined,

        sort: "date_desc",
      });

      const normalized = normalizePaymentsResponse(raw);
      setRes(normalized);
    } catch (e: any) {
      const status = e?.status ? `HTTP ${e.status}` : "";
      const payload =
        e?.payload != null
          ? typeof e.payload === "string"
            ? e.payload
            : JSON.stringify(e.payload, null, 2)
          : e?.message ?? String(e);

      setErrMsg([status, payload].filter(Boolean).join(" — "));
      setRes({ data: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load(page);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, dateFrom, dateTo, mode, workstation, search, cashierId]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  async function openAuditForPayment(p: PaymentUI) {
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditRows([]);
    setAuditTitle(`Traçabilité — Paiement ${p.id}`);

    try {
      const day = (p.created_at || "").slice(0, 10) || dateFrom;

      const r: any = await cashAuditList({
        date_from: day,
        date_to: day,
        reglement_id: p.id,
        per_page: 50,
        sort: "date_desc",
      });

      const rows: AuditRow[] =
        Array.isArray(r?.data) ? r.data :
        Array.isArray(r?.data?.data) ? r.data.data :
        Array.isArray(r?.data?.items) ? r.data.items : [];

      setAuditRows(rows);

      if (!rows.length) {
        const r2: any = await cashAuditList({
          date_from: day,
          date_to: day,
          per_page: 50,
          sort: "date_desc",
        });

        const rows2: AuditRow[] =
          Array.isArray(r2?.data) ? r2.data :
          Array.isArray(r2?.data?.data) ? r2.data.data :
          [];

        setAuditRows(rows2);
      }
    } catch {
      setAuditRows([]);
    } finally {
      setAuditLoading(false);
    }
  }

  function exportCsv() {
    const params = new URLSearchParams();
    params.set("date_from", dateFrom);
    params.set("date_to", dateTo);
    if (mode) params.set("mode", mode);
    if (workstation) params.set("workstation", workstation);
    if (search) params.set("search", search);
    if (cashierId) params.set("cashier_id", cashierId);

    window.open(`/api/v1/caisse/payments/export?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  function openTicket(paymentId: string) {
    window.open(`/api/v1/caisse/payments/${paymentId}/ticket`, "_blank", "noopener,noreferrer");
  }

  function openDeleteFactureModal(factureId: string) {
    setDeleteErr("");
    setDeleteComment("");
    setDeleteFactureId(factureId);
    setDeleteOpen(true);
  }

  async function confirmDeleteFacture() {
    if (!deleteFactureId) return;

    const commentaire = deleteComment.trim();
    if (!commentaire) {
      setDeleteErr("Le commentaire est obligatoire.");
      return;
    }

    setDeleteLoading(true);
    setDeleteErr("");
    try {
      await factureTrashSoftDelete(deleteFactureId, commentaire);
      setDeleteOpen(false);
      await load(page);
    } catch (e: any) {
      const status = e?.status ? `HTTP ${e.status}` : "";
      const payload =
        e?.payload != null
          ? typeof e.payload === "string"
            ? e.payload
            : JSON.stringify(e.payload, null, 2)
          : e?.message ?? String(e);

      setDeleteErr([status, payload].filter(Boolean).join(" — "));
    } finally {
      setDeleteLoading(false);
    }
  }

  const rows = res?.data ?? [];
  const pagination = res?.meta?.pagination;
  const kpis = res?.meta?.kpis;

  return (
    <div className="space-y-4">
      <form onSubmit={applyFilters} className="rounded-xl bg-white border shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
          <Field label="Du">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Au">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Mode">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Tous</option>
              <option value="CASH">ESPECES</option>
              <option value="MOBILE">MOBILE_MONEY</option>
              <option value="CARD">CARTE</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="VIREMENT">VIREMENT</option>
            </select>
          </Field>

          {/* ✅ NEW: filtre caissier */}
          <Field label="Caissier">
            <select
              value={cashierId}
              onChange={(e) => setCashierId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">{cashiersLoading ? "Chargement..." : "Tous"}</option>
              {cashiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Poste (workstation)">
            <input
              value={workstation}
              onChange={(e) => setWorkstation(e.target.value)}
              placeholder="POS-01"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Recherche">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="N° facture ou référence"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </Field>

          <div className="flex gap-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold"
            >
              Filtrer
            </button>
          </div>
        </div>

        {kpis && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MiniKpi label="Total encaissé" value={`${n(kpis.total_amount).toLocaleString()} XAF`} />
            <MiniKpi label="Paiements" value={n(kpis.payments)} />
            <MiniKpi label="Ticket moyen" value={`${n(kpis.avg_ticket).toLocaleString()} XAF`} />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
          >
            ⬇️ Export CSV
          </button>

          <Link
            href="/caisse/factures/corbeille"
            className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
          >
            🗑️ Corbeille factures
          </Link>
        </div>

        {errMsg && (
          <div className="mt-3 rounded-lg border bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">
            {errMsg}
          </div>
        )}
      </form>

      <div className="overflow-auto rounded-xl bg-white border shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <Th>Date</Th>
              <Th>Facture</Th>
              <Th>Caissier</Th>
              <Th>Mode</Th>
              <Th>Montant</Th>
              <Th>Poste</Th>
              <Th>Actions</Th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Chargement…
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && !errMsg && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Aucune transaction
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((p) => (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <Td>{p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</Td>
                  <Td>{p.facture?.numero ?? "—"}</Td>
                  <Td>{p.cashier?.name ?? "—"}</Td>
                  <Td>{p.mode || "—"}</Td>
                  <Td>
                    {n(p.montant).toLocaleString()} {p.devise || "XAF"}
                  </Td>
                  <Td>{p.workstation ?? "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openTicket(p.id)}
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        🎟️ Ticket
                      </button>

                      <button
                        type="button"
                        onClick={() => openAuditForPayment(p)}
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        🧾 Traçabilité (IP)
                      </button>

                      {p.facture_id && (
                        <button
                          type="button"
                          onClick={() => openDeleteFactureModal(p.facture_id!)}
                          className="rounded-lg border px-2 py-1 text-xs hover:bg-red-50"
                          title="Supprimer la facture (corbeille)"
                        >
                          🗑️ Supprimer facture
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-600">
            Page {pagination.current_page} / {pagination.last_page} • Total {pagination.total}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="rounded-md border px-2 py-1 disabled:opacity-40"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border px-2 py-1 disabled:opacity-40"
            >
              ‹
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
              disabled={page === pagination.last_page}
              className="rounded-md border px-2 py-1 disabled:opacity-40"
            >
              ›
            </button>
            <button
              onClick={() => setPage(pagination.last_page)}
              disabled={page === pagination.last_page}
              className="rounded-md border px-2 py-1 disabled:opacity-40"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL AUDIT ================= */}
      {auditOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">{auditTitle}</div>
              <button onClick={() => setAuditOpen(false)} className="rounded-lg border px-2 py-1 text-xs">
                Fermer
              </button>
            </div>

            <div className="p-4">
              {auditLoading ? (
                <div className="text-sm text-slate-600">Chargement audit…</div>
              ) : auditRows.length === 0 ? (
                <div className="text-sm text-slate-600">Aucun audit trouvé.</div>
              ) : (
                <div className="space-y-3">
                  {auditRows.map((a) => (
                    <div key={String(a.id)} className="rounded-lg border p-3">
                      <div className="text-xs text-slate-500">
                        {a.created_at ? new Date(toIso(a.created_at)).toLocaleString() : "—"} • {a.event}
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-slate-500">IP</div>
                          <div className="font-semibold">{a.ip ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Poste</div>
                          <div className="font-semibold">{a.workstation ?? "—"}</div>
                        </div>
                      </div>

                      {a.payload && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-slate-600">Voir détails (payload)</summary>
                          <pre className="mt-2 text-[11px] bg-slate-50 border rounded-lg p-2 overflow-auto">
{JSON.stringify(a.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL SUPPRESSION FACTURE ================= */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Supprimer la facture</div>
              <button onClick={() => setDeleteOpen(false)} className="rounded-lg border px-2 py-1 text-xs">
                Fermer
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-sm text-slate-700">Commentaire obligatoire (justification).</div>

              <textarea
                value={deleteComment}
                onChange={(e) => setDeleteComment(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                rows={4}
                placeholder="Ex: Facture doublon / erreur de saisie / annulation..."
              />

              {deleteErr && (
                <div className="rounded-lg border bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">
                  {deleteErr}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  disabled={deleteLoading}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteFacture}
                  className="rounded-lg bg-red-600 text-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <div className="text-xs text-slate-600">{label}</div>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function MiniKpi({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-semibold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}
