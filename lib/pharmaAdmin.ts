// lib/pharmaAdmin.ts
import { apiFetch } from "@/lib/api"; // <- garde ton apiFetch existant

export type AdminArticle = {
  id: number;
  code: string;
  name: string;
  form?: string | null;
  dosage?: string | null;
  unit?: string | null;
  dci_id?: number | null;
  sell_price?: number | null;
  tax_rate?: number | null;
  stock_on_hand?: number;
  image_url?: string | null;
};

export async function listArticles(params?: { q?: string; form?: string; active?: boolean; page?: number; per_page?: number }) {
  const qp = new URLSearchParams();
  if (params?.q) qp.set("q", params.q);
  if (params?.form) qp.set("form", params.form);
  if (typeof params?.active === "boolean") qp.set("active", String(params.active));
  if (params?.page) qp.set("page", String(params.page));
  if (params?.per_page) qp.set("per_page", String(params.per_page));

  const res: any = await apiFetch(`/pharma/articles?${qp.toString()}`);
  const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  const meta = res?.meta ?? {};
  return {
    items: data as AdminArticle[],
    meta: {
      current_page: meta.current_page ?? 1,
      last_page: meta.last_page ?? 1,
      per_page: meta.per_page ?? data.length,
      total: meta.total ?? data.length,
    },
  };
}

export async function getArticle(id: number) {
  const res: any = await apiFetch(`/pharma/articles/${id}`);
  return (res?.data ?? res) as AdminArticle;
}

export async function createArticle(payload: Partial<AdminArticle>) {
  const res: any = await apiFetch(`/pharma/articles`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return (res?.data ?? res) as AdminArticle;
}

export async function updateArticle(id: number, payload: Partial<AdminArticle>) {
  const res: any = await apiFetch(`/pharma/articles/${id}`, {
    method: "PUT", // PATCH possible aussi
    body: JSON.stringify(payload),
  });
  return (res?.data ?? res) as AdminArticle;
}
