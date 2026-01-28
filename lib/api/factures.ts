// lib/api/factures.ts
import { apiFetch } from "@/lib/api";

export async function factureTrashSoftDelete(factureId: string, commentaire: string) {
  return apiFetch(`/factures/${factureId}/trash`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commentaire }),
  });
}


export async function factureTrashList(params: { page?: number; per_page?: number; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.search) qs.set("search", params.search);

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`/factures/trash${suffix}`, { method: "GET" });
}

export async function factureTrashRestore(factureId: string) {
  return apiFetch(`/factures/${factureId}/restore`, { method: "POST" });
}
