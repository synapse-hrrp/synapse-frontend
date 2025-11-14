// lib/api/caisse.ts
import { apiFetch } from "@/lib/api";

type Dict = Record<string, any>;

function wsHeader(extra?: HeadersInit) {
  const ws =
    typeof window !== "undefined"
      ? localStorage.getItem("cash:workstation") || "POS-01"
      : "POS-01";
  return new Headers({ "X-Workstation": ws, ...(extra as any) });
}

/* =================== Sessions =================== */
export async function cashSessionOpen(body: {
  currency?: string;
  service_id?: number | null;
  opening_note?: string | null;
} = {}) {
  return apiFetch("/caisse/sessions/open", {
    method: "POST",
    headers: wsHeader(),
    body,
  });
}

export async function cashSessionClose(body: { closing_note?: string | null } = {}) {
  return apiFetch("/caisse/sessions/close", {
    method: "POST",
    headers: wsHeader(),
    body,
  });
}

export async function cashSessionSummary() {
  return apiFetch("/caisse/sessions/summary", { method: "GET", headers: wsHeader() });
}

export async function cashSessionCurrent() {
  return apiFetch("/caisse/sessions/me", { method: "GET", headers: wsHeader() }).catch(
    () => ({ data: null })
  );
}

/* =================== Factures & Paiements =================== */
export async function findFactureByNumero(numero: string) {
  const qs = new URLSearchParams({ search: numero });
  try {
    const res: any = await apiFetch(`/factures?${qs.toString()}`, { method: "GET" });
    const arr = Array.isArray(res) ? res : res?.data ?? [];
    return arr.find((x: any) => String(x?.numero) === String(numero)) || arr[0] || null;
  } catch {
    return null;
  }
}
export async function getFactureLite(id: string) {
  return apiFetch(`/factures/${id}`, { method: "GET" });
}

export type CreateReglementBody = {
  montant: number;
  mode: "CASH" | "MOBILE" | "CARD" | "CHEQUE" | "VIREMENT" | string;
  reference?: string | null;
  service_id?: number | null;
};
export async function createReglement(factureId: string, body: CreateReglementBody) {
  const key =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return apiFetch(`/factures/${factureId}/reglements`, {
    method: "POST",
    headers: wsHeader({ "Idempotency-Key": key }),
    body,
  });
}

export function ticketPdfUrl(reglementId: string | number) {
  const base =
    (typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE as string) || "/api/v1"
      : "/api/v1"
    ).replace(/\/+$/, "");
  return `${base}/caisse/payments/${reglementId}/ticket`;
}

/* =================== Rapports & Tops =================== */
export async function cashPayments(params: Dict = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== "") qs.set(k, String(v));
  });
  return apiFetch(`/caisse/payments${qs.size ? `?${qs}` : ""}`, { method: "GET" });
}
export async function cashPaymentsExportCsv(params: Dict = {}) {
  const qs = new URLSearchParams(params as any).toString();
  return apiFetch(`/caisse/payments/export${qs ? `?${qs}` : ""}`, { method: "GET" });
}
export async function cashSummary(params: Dict = {}) {
  const qs = new URLSearchParams(params as any).toString();
  return apiFetch(`/caisse/rapport${qs ? `?${qs}` : ""}`, { method: "GET" });
}
export async function cashTopOverview(params: Dict = {}) {
  const qs = new URLSearchParams(params as any).toString();
  return apiFetch(`/caisse/top/overview${qs ? `?${qs}` : ""}`, { method: "GET" });
}

/* =================== Audit =================== */
export async function cashAuditList(params: Dict = {}) {
  const qs = new URLSearchParams(params as any).toString();
  return apiFetch(`/caisse/audit${qs ? `?${qs}` : ""}`, { method: "GET" });
}
export async function cashAuditExportCsv(params: Dict = {}) {
  const qs = new URLSearchParams(params as any).toString();
  return apiFetch(`/caisse/audit/export${qs ? `?${qs}` : ""}`, { method: "GET" });
}
