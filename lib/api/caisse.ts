// lib/api/caisse.ts
import { apiFetch as baseFetch } from "@/lib/api";

type Dict = Record<string, any>;

function wsHeader(extra?: HeadersInit) {
  const ws =
    typeof window !== "undefined"
      ? localStorage.getItem("cash:workstation") || "POS-01"
      : "POS-01";

  return new Headers({ "X-Workstation": ws, ...(extra as any) });
}

function buildQs(params: Dict = {}) {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;

    // ✅ si tableau: group_by[]=service&group_by[]=mode...
    if (Array.isArray(v)) {
      v.forEach((item) => {
        if (item === undefined || item === null) return;
        const s = String(item).trim();
        if (!s) return;
        qs.append(`${k}[]`, s);
      });
      return;
    }

    const s = String(v);
    if (s.trim() === "") return;
    qs.set(k, s);
  });

  const str = qs.toString();
  return str ? `?${str}` : "";
}


/**
 * ✅ apiFetch dédié CAISSE
 * - n’impacte pas les autres modules
 * - ajoute X-Workstation automatiquement
 * - garde le comportement de baseFetch (token, json, erreurs…)
 */
async function caisseFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers as HeadersInit | undefined);

  // Ajoute/override le header X-Workstation
  const ws = wsHeader();
  ws.forEach((v, k) => headers.set(k, v));

  return baseFetch(path, { ...options, headers });
}

/* =================== Sessions =================== */
export async function cashSessionOpen(
  body: { currency?: string; service_id?: number | null; opening_note?: string | null } = {}
) {
  return caisseFetch("/caisse/sessions/open", { method: "POST", body });
}

export async function cashSessionClose(body: { closing_note?: string | null } = {}) {
  return caisseFetch("/caisse/sessions/close", { method: "POST", body });
}

export async function cashSessionSummary() {
  return caisseFetch("/caisse/sessions/summary", { method: "GET" });
}

export async function cashSessionCurrent() {
  try {
    return await caisseFetch("/caisse/sessions/me", { method: "GET" });
  } catch {
    return { data: null };
  }
}

/* =================== Factures & Paiements =================== */
export async function findFactureByNumero(numero: string) {
  const qs = new URLSearchParams({ search: numero });
  try {
    const res: any = await baseFetch(`/factures?${qs.toString()}`, { method: "GET" });
    const arr = Array.isArray(res) ? res : res?.data ?? [];
    return arr.find((x: any) => String(x?.numero) === String(numero)) || arr[0] || null;
  } catch {
    return null;
  }
}

export async function getFactureLite(id: string) {
  return baseFetch(`/factures/${id}`, { method: "GET" });
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

  return caisseFetch(`/factures/${factureId}/reglements`, {
    method: "POST",
    headers: { "Idempotency-Key": key },
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
  return caisseFetch(`/caisse/payments${buildQs(params)}`, { method: "GET" });
}

export async function cashPaymentsExportCsv(params: Dict = {}) {
  return caisseFetch(`/caisse/payments/export${buildQs(params)}`, { method: "GET" });
}

export async function cashSummary(params: Dict = {}) {
  return caisseFetch(`/caisse/rapport${buildQs(params)}`, { method: "GET" });
}

export async function cashTopOverview(params: Dict = {}) {
  return caisseFetch(`/caisse/top/overview${buildQs(params)}`, { method: "GET" });
}

/* =================== Audit =================== */
export async function cashAuditList(params: Dict = {}) {
  return caisseFetch(`/caisse/audit${buildQs(params)}`, { method: "GET" });
}

export async function cashAuditExportCsv(params: Dict = {}) {
  return caisseFetch(`/caisse/audit/export${buildQs(params)}`, { method: "GET" });
}

export async function cashTopCashiers(params: Dict = {}) {
  return caisseFetch(`/caisse/top/cashiers${buildQs(params)}`, { method: "GET" });
}
