// lib/reagents.ts
import { apiFetch } from "@/lib/api";

/* ===== Types laravel côté front ===== */
export type Paginated<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number; per_page: number; total: number };
};

export type Reagent = {
  id: number;
  name: string;
  sku: string;
  uom: string;
  cas_number?: string | null;
  hazard_class?: string | null;
  storage_temp_min?: number | null;
  storage_temp_max?: number | null;
  storage_conditions?: string | null;
  concentration?: string | null;
  container_size?: number | null;
  location_default?: string | null;
  min_stock?: number | null;
  reorder_point?: number | null;
  current_stock?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type Location = {
  id: number;
  name: string;
  path?: string | null;
  is_cold_chain: boolean;
  temp_range_min?: number | null;
  temp_range_max?: number | null;
};

export type ReagentLot = {
  id: number;
  reagent_id: number;
  lot_code: string;
  expiry_date?: string | null;  // YYYY-MM-DD
  received_at?: string | null;  // ISO
  initial_qty: number;
  current_qty: number;
  location_id?: number | null;
  status: "ACTIVE" | "QUARANTINE" | "EXPIRED" | "DISPOSED";
  coa_url?: string | null;
  barcode?: string | null;
  location?: Location | null;
};

export type StockMovement = {
  id: number;
  reagent_id: number;
  reagent_lot_id?: number | null;
  location_id?: number | null;
  type: "OPENING"|"IN"|"OUT"|"ADJUST"|"TRANSFER"|"DISPOSAL"|"RETURN";
  quantity: number;
  moved_at: string;           // ISO
  reference?: string | null;
  unit_cost?: number | null;
  user_id?: number | null;
  notes?: string | null;
  lot?: Pick<ReagentLot, "id"|"lot_code"|"expiry_date"> | null;
};

/* ===== Helpers ===== */
function q(params: Record<string, any>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== "") s.set(k, String(v));
  });
  return s.toString();
}

/* ===== Reagents CRUD ===== */
export async function listReagents(params: { search?: string; page?: number } = {}) {
  const qs = q({ search: params.search ?? "", page: params.page ?? 1 });
  return apiFetch(`/reagents?${qs}`, { method: "GET" }) as Promise<Paginated<Reagent>>;
}

export async function createReagent(payload: Partial<Reagent>) {
  return apiFetch(`/reagents`, { method: "POST", body: payload }) as Promise<Reagent>;
}

export async function getReagent(id: number) {
  // le back renvoie { ...reagent, lots: [...] }
  return apiFetch(`/reagents/${id}`, { method: "GET" }) as Promise<Reagent & { lots: ReagentLot[] }>;
}

export async function updateReagent(id: number, payload: Partial<Reagent>) {
  return apiFetch(`/reagents/${id}`, { method: "PATCH", body: payload }) as Promise<Reagent>;
}

export async function deleteReagent(id: number) {
  await apiFetch(`/reagents/${id}`, { method: "DELETE" });
}

/* ===== Lots ===== */
export async function listLots(reagentId: number, params: { status?: string; page?: number } = {}) {
  const qs = q(params);
  return apiFetch(`/reagents/${reagentId}/lots?${qs}`, { method: "GET" }) as Promise<Paginated<ReagentLot>>;
}

export async function receiveLot(
  reagentId: number,
  payload: {
    lot_code: string;
    quantity: number;
    received_at?: string | null;
    expiry_date?: string | null;
    location_id?: number | null;
    unit_cost?: number | null;
    coa_url?: string | null;
    reference?: string | null;
  }
) {
  return apiFetch(`/reagents/${reagentId}/lots`, { method: "POST", body: payload }) as Promise<ReagentLot>;
}

/* ===== Mouvements / actions ===== */
export async function listMovements(
  reagentId: number,
  params: { type?: StockMovement["type"]; from?: string; to?: string; page?: number } = {}
) {
  const qs = q(params);
  return apiFetch(`/reagents/${reagentId}/movements?${qs}`, { method: "GET" }) as Promise<Paginated<StockMovement>>;
}

export async function consumeFefo(
  reagentId: number,
  payload: { quantity: number; reference?: string | null; notes?: string | null }
) {
  return apiFetch(`/reagents/${reagentId}/consume-fefo`, { method: "POST", body: payload }) as Promise<{
    movements: StockMovement[];
    current_stock: number;
  }>;
}

export async function transfer(
  reagentId: number,
  payload: { lot_id: number; to_location_id: number; quantity: number }
) {
  return apiFetch(`/reagents/${reagentId}/transfer`, { method: "POST", body: payload }) as Promise<{
    movement: StockMovement; from_lot: ReagentLot; to_lot: ReagentLot;
  }>;
}

/* ===== Rapport global (option lecture seule) ===== */
export async function reportMovements(params: { type?: StockMovement["type"]; from?: string; to?: string; sku?: string; page?: number } = {}) {
  const qs = q(params);
  return apiFetch(`/movements/report?${qs}`, { method: "GET" }) as Promise<Paginated<StockMovement & { reagent?: Pick<Reagent,"sku"|"name"|"uom">; }>>;
}
