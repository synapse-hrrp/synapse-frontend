"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Search, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";

/* ========= Types ========= */
type ReagentRow = {
  id: number;
  name: string;
  sku: string;
  uom: string;
  current_stock?: number;
  reorder_point?: number;
};
type LocationMini = { id: number; name: string };
type LotMini = { id: number; lot_code: string; current_qty: number };
type MovementRow = {
  id: number;
  type: "OPENING" | "IN" | "OUT" | "ADJUST" | "TRANSFER" | "DISPOSAL" | "RETURN";
  quantity: number;
  moved_at: string;
  reference?: string | null;
  unit_cost?: number | null;
  notes?: string | null;
  lot?: { id: number; lot_code: string } | null;
  location?: { id: number; name: string } | null;
};

const REAGENTS_PAGE_SIZE = 20;
const MOVES_PAGE_SIZE = 100;

export default function OperationsPage() {
  const sp = useSearchParams();
  const router = useRouter();

  /* ---- Réactifs en stock ---- */
  const [rq, setRq] = useState("");
  const [reagents, setReagents] = useState<ReagentRow[]>([]);
  const [rPage, setRPage] = useState(1);
  const [rLast, setRLast] = useState(1);
  const [rTotal, setRTotal] = useState(0);

  /* ---- Sélection ---- */
  const [reagent, setReagent] = useState<ReagentRow | null>(null);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [lots, setLots] = useState<LotMini[]>([]);
  const [locations, setLocations] = useState<LocationMini[]>([]);

  /* ---- Historique ---- */
  const [movs, setMovs] = useState<MovementRow[]>([]);
  const [movPage, setMovPage] = useState(1);
  const [movLast, setMovLast] = useState(1);
  const [movTotal, setMovTotal] = useState(0);
  const [movType, setMovType] = useState<"" | MovementRow["type"]>("");

  /* ---- Actions ---- */
  const [consume, setConsume] = useState({ quantity: "", reference: "", notes: "" });
  const [transfer, setTransfer] = useState({ lot_id: 0, to_location_id: 0, quantity: "" });

  /* ---- UI ---- */
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; text: string; tone: "ok" | "err" }>({
    show: false,
    text: "",
    tone: "ok",
  });

  function showToast(text: string, tone: "ok" | "err" = "ok") {
    setToast({ show: true, text, tone });
    setTimeout(() => setToast({ show: false, text: "", tone: "ok" }), 2600);
  }

  const reagentsPagerLabel = useMemo(() => {
    if (!rTotal) return "0";
    const start = (rPage - 1) * REAGENTS_PAGE_SIZE + 1;
    const end = Math.min(rPage * REAGENTS_PAGE_SIZE, rTotal);
    return `${start}–${end} / ${rTotal}`;
  }, [rPage, rTotal]);

  const movesPagerLabel = useMemo(() => {
    if (!movTotal) return "0";
    const start = (movPage - 1) * MOVES_PAGE_SIZE + 1;
    const end = Math.min(movPage * MOVES_PAGE_SIZE, movTotal);
    return `${start}–${end} / ${movTotal}`;
  }, [movPage, movTotal]);

  /* ---- Boot ---- */
  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiFetch(`/inventory/locations`, { method: "GET" });
        const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setLocations(arr);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    void loadReagents(1);
    const rid = Number(sp?.get("reagent") || 0);
    if (rid) void selectReagentById(rid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Loaders ---- */
  async function loadReagents(page = 1) {
    setErr(null);
    try {
      const qp = new URLSearchParams({ page: String(page), per_page: String(REAGENTS_PAGE_SIZE) });
      if (rq.trim()) qp.set("search", rq.trim());

      const res: any = await apiFetch(`/inventory/reagents?${qp.toString()}`, { method: "GET" });
      const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const filtered = data.filter((r: any) => Number(r.current_stock ?? 0) > 0);

      setReagents(
        filtered.map((r: any) => ({
          id: Number(r.id),
          name: String(r.name),
          sku: String(r.sku),
          uom: String(r.uom ?? "unit"),
          current_stock: Number(r.current_stock ?? 0),
          reorder_point: r.reorder_point != null ? Number(r.reorder_point) : undefined,
        }))
      );

      const meta = res?.meta || {};
      setRPage(Number(meta.current_page ?? page));
      setRLast(Number(meta.last_page ?? 1));
      setRTotal(Number(meta.total ?? filtered.length));
    } catch (e: any) {
      setErr(e?.message || "Échec chargement des réactifs");
      setReagents([]); setRPage(1); setRLast(1); setRTotal(0);
    }
  }

  async function selectReagentById(id: number) {
    try {
      const r: any = await apiFetch(`/inventory/reagents/${id}`, { method: "GET" });
      const mini: ReagentRow = {
        id: Number(r.id),
        name: String(r.name),
        sku: String(r.sku),
        uom: String(r.uom ?? "unit"),
        current_stock: Number(r.current_stock ?? 0),
        reorder_point: r.reorder_point != null ? Number(r.reorder_point) : undefined,
      };
      await chooseReagent(mini, true);
    } catch (e: any) {
      setErr(e?.message || "Réactif introuvable");
    }
  }

  async function chooseReagent(r: ReagentRow, resetMovPage = false) {
    setReagent(r); setErr(null); setBusy(true);
    if (resetMovPage) setMovPage(1);
    try {
      try {
        const s: any = await apiFetch(`/inventory/reagents/${r.id}/stock`, { method: "GET" });
        setCurrentStock(Number(s?.current_stock ?? 0));
      } catch { setCurrentStock(Number(r.current_stock ?? 0)); }

      try {
        const l: any = await apiFetch(`/inventory/reagents/${r.id}/lots`, { method: "GET" });
        const arr = Array.isArray(l?.data) ? l.data : Array.isArray(l) ? l : [];
        setLots(arr.map((x: any) => ({ id: Number(x.id), lot_code: String(x.lot_code), current_qty: Number(x.current_qty ?? 0) })));
      } catch { setLots([]); }

      await loadMovements(r.id, resetMovPage ? 1 : movPage, movType);
      router.replace(`/stock-reactifs/operations?reagent=${r.id}`, { scroll: false });
    } catch (e: any) {
      setErr(e?.message || "Erreur sélection réactif");
      setLots([]); setMovs([]); setMovTotal(0); setMovLast(1);
    } finally { setBusy(false); }
  }

  async function loadMovements(reagentId: number, page = 1, type: "" | MovementRow["type"] = "") {
    const qp = new URLSearchParams({ page: String(page), per_page: String(MOVES_PAGE_SIZE) });
    if (type) qp.set("type", type);
    const m: any = await apiFetch(`/inventory/reagents/${reagentId}/movements?${qp.toString()}`, { method: "GET" });
    const data = Array.isArray(m?.data) ? m.data : Array.isArray(m) ? m : [];
    setMovs(data);
    const meta = m?.meta || {};
    setMovPage(Number(meta.current_page ?? page));
    setMovLast(Number(meta.last_page ?? 1));
    setMovTotal(Number(meta.total ?? data.length));
  }

  /* ---- Actions ---- */
  async function doConsume() {
    if (!reagent || !consume.quantity) return;
    setBusy(true); setErr(null);
    try {
      await apiFetch(`/inventory/reagents/${reagent.id}/consume-fefo`, {
        method: "POST",
        body: {
          quantity: Number(consume.quantity),
          reference: consume.reference || undefined,
          notes: consume.notes || undefined,
        },
      });
      showToast("Sortie FEFO enregistrée.", "ok");
      await chooseReagent(reagent, true);
      setConsume({ quantity: "", reference: "", notes: "" });
      await loadReagents(rPage);
    } catch (e: any) {
      setErr(e?.message || "Échec de la sortie FEFO");
      showToast("Échec sortie FEFO", "err");
    } finally { setBusy(false); }
  }

  async function doTransfer() {
    if (!reagent || !transfer.lot_id || !transfer.to_location_id || !transfer.quantity) return;
    setBusy(true); setErr(null);
    try {
      await apiFetch(`/inventory/reagents/${reagent.id}/transfer`, {
        method: "POST",
        body: {
          lot_id: transfer.lot_id,
          to_location_id: transfer.to_location_id,
          quantity: Number(transfer.quantity),
        },
      });
      showToast("Transfert effectué.", "ok");
      await chooseReagent(reagent, false);
      setTransfer({ lot_id: 0, to_location_id: 0, quantity: "" });
      await loadReagents(rPage);
    } catch (e: any) {
      setErr(e?.message || "Échec du transfert");
      showToast("Échec transfert", "err");
    } finally { setBusy(false); }
  }

  /* ========= UI ========= */
  return (
    <div className="space-y-6">
      {/* Alertes */}
      {err && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">
          <AlertTriangle className="h-4 w-4" /><span>{err}</span>
        </div>
      )}
      {toast.show && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            toast.tone === "ok"
              ? "border-congo-green/30 bg-congo-greenL text-congo-green"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.tone === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche — Réactifs en stock */}
        <section className="rounded-xl border bg-white p-4 shadow-sm lg:col-span-1">
          <h2 className="text-lg font-semibold">Réactifs en stock</h2>
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                value={rq}
                onChange={(e) => setRq(e.target.value)}
                placeholder="Nom ou SKU…"
                className="w-full rounded-lg border border-ink-100 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
              />
            </div>
            <button onClick={() => loadReagents(1)} className="rounded-lg border px-3 py-2.5 text-sm" disabled={busy}>
              Rechercher
            </button>
          </div>

          <div className="mt-3 space-y-2 max-h-[480px] overflow-auto">
            {reagents.length === 0 && (
              <div className="text-sm text-ink-500">Aucun réactif trouvé (en stock).</div>
            )}
            {reagents.map((r) => {
              const low = r.reorder_point != null && (r.current_stock ?? 0) <= r.reorder_point!;
              return (
                <button
                  key={r.id}
                  onClick={() => chooseReagent(r, true)}
                  className={`w-full text-left rounded-lg border px-3 py-2 ${
                    reagent?.id === r.id ? "border-congo-green ring-1 ring-congo-green/30" : ""
                  }`}
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-ink-600">
                    SKU {r.sku} · UoM {r.uom} · Stock:{" "}
                    <b className={low ? "text-red-600" : ""}>{r.current_stock ?? 0}</b>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              className="rounded-md border px-2 py-1 disabled:opacity-50"
              disabled={rPage <= 1}
              onClick={() => loadReagents(rPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[120px] text-center">{reagentsPagerLabel}</span>
            <button
              className="rounded-md border px-2 py-1 disabled:opacity-50"
              disabled={rPage >= rLast}
              onClick={() => loadReagents(rPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Colonne droite — Actions + historique */}
        <section className="rounded-xl border bg-white p-4 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold flex-1">
              {reagent ? `Réactif: ${reagent.name}` : "Sélectionne un réactif"}
            </h2>
            {reagent && (
              <div className="rounded-md bg-ink-50 px-3 py-1 text-sm">
                Stock actuel: <b>{currentStock ?? reagent.current_stock ?? 0}</b> {reagent.uom}
              </div>
            )}
          </div>

          {/* Lots */}
          <div className="rounded-lg border p-3">
            <h3 className="font-medium mb-2">Lots actifs</h3>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-700">
                  <tr><Th>Lot</Th><Th>Quantité</Th></tr>
                </thead>
                <tbody>
                  {!reagent ? (
                    <tr><Td colSpan={2} className="p-5 text-center text-ink-500">Choisis un réactif pour voir ses lots.</Td></tr>
                  ) : lots.length === 0 ? (
                    <tr><Td colSpan={2} className="p-5 text-center text-ink-500">Aucun lot disponible.</Td></tr>
                  ) : (
                    lots.map((l) => (
                      <tr key={l.id} className="border-t">
                        <Td>{l.lot_code}</Td>
                        <Td>{l.current_qty}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sortie FEFO */}
          <div className="rounded-lg border p-3">
            <h3 className="font-medium mb-2">Sortie (FEFO)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Field label={`Quantité (${reagent?.uom ?? "unit"})`}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={consume.quantity}
                  onChange={(e) => setConsume((v) => ({ ...v, quantity: e.target.value }))}
                  className="input"
                />
              </Field>
              <Field label="Référence">
                <input
                  value={consume.reference}
                  onChange={(e) => setConsume((v) => ({ ...v, reference: e.target.value }))}
                  className="input"
                />
              </Field>
              <Field label="Notes">
                <input
                  value={consume.notes}
                  onChange={(e) => setConsume((v) => ({ ...v, notes: e.target.value }))}
                  className="input"
                />
              </Field>
            </div>
            <div className="mt-3">
              <button
                disabled={busy || !reagent}
                onClick={doConsume}
                className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Déduire (FEFO)
              </button>
            </div>
          </div>

          {/* Transfert */}
          <div className="rounded-lg border p-3">
            <h3 className="font-medium mb-2">Transfert</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Field label="Lot">
                <select
                  value={transfer.lot_id}
                  onChange={(e) => setTransfer((v) => ({ ...v, lot_id: Number(e.target.value) }))}
                  className="input"
                >
                  <option value={0}>—</option>
                  {lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lot_code} (Qté {l.current_qty})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vers location">
                <select
                  value={transfer.to_location_id}
                  onChange={(e) =>
                    setTransfer((v) => ({ ...v, to_location_id: Number(e.target.value) }))
                  }
                  className="input"
                >
                  <option value={0}>—</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={`Quantité (${reagent?.uom ?? "unit"})`}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={transfer.quantity}
                  onChange={(e) => setTransfer((v) => ({ ...v, quantity: e.target.value }))}
                  className="input"
                />
              </Field>
            </div>
            <div className="mt-3">
              <button
                disabled={busy || !reagent}
                onClick={doTransfer}
                className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Transférer
              </button>
            </div>
          </div>

          {/* Historique */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Historique des mouvements</h3>
              <div className="flex items-center gap-2 text-sm">
                <select
                  value={movType}
                  onChange={async (e) => {
                    const v = e.target.value as "" | MovementRow["type"];
                    setMovType(v);
                    if (reagent) await loadMovements(reagent.id, 1, v);
                  }}
                  className="rounded-md border px-2 py-1"
                  disabled={!reagent}
                >
                  <option value="">Tous</option>
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                  <option value="TRANSFER">TRANSFER</option>
                  <option value="OPENING">OPENING</option>
                  <option value="ADJUST">ADJUST</option>
                  <option value="DISPOSAL">DISPOSAL</option>
                  <option value="RETURN">RETURN</option>
                </select>

                <button
                  className="rounded-md border px-2 py-1 disabled:opacity-50"
                  disabled={!reagent || movPage <= 1}
                  onClick={async () => reagent && (await loadMovements(reagent.id, movPage - 1, movType))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[120px] text-center">{movesPagerLabel}</span>
                <button
                  className="rounded-md border px-2 py-1 disabled:opacity-50"
                  disabled={!reagent || movPage >= movLast}
                  onClick={async () => reagent && (await loadMovements(reagent.id, movPage + 1, movType))}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-700">
                  <tr><Th>Date</Th><Th>Type</Th><Th>Lot</Th><Th>Qté</Th><Th>Réf</Th><Th>Location</Th><Th>Notes</Th></tr>
                </thead>
                <tbody>
                  {!reagent ? (
                    <tr><Td colSpan={7} className="p-6 text-center text-ink-500">Choisis un réactif pour voir l’historique.</Td></tr>
                  ) : movs.length === 0 ? (
                    <tr><Td colSpan={7} className="p-6 text-center text-ink-500">Aucun mouvement.</Td></tr>
                  ) : (
                    movs.map((m) => (
                      <tr key={m.id} className="border-t">
                        <Td>{new Date(m.moved_at).toLocaleString()}</Td>
                        <Td>{m.type}</Td>
                        <Td>{m.lot?.lot_code ?? "—"}</Td>
                        <Td>{m.quantity}</Td>
                        <Td>{m.reference ?? "—"}</Td>
                        <Td>{m.location?.name ?? "—"}</Td>
                        <Td className="max-w-xs truncate" title={m.notes ?? undefined}>{m.notes ?? "—"}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          background: #fff;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
        }
      `}</style>
    </div>
  );
}

/* ---- mini composants ---- */
function Th({ children, className = "" }: any) {
  return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "", ...rest }: any) {
  return <td className={`px-3 py-2 ${className}`} {...rest}>{children}</td>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-sm"><span className="text-ink-600">{label}</span>{children}</label>;
}
