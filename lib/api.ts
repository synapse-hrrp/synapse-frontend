// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8080/api/v1";

export type LoginPayload =
  | { mode: "email"; email: string; password: string }
  | { mode: "phone"; phone: string; password: string };

export function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("auth:token");
}

export function setSession(token: string, user: any) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("auth:token", token);
  sessionStorage.setItem("auth:user", JSON.stringify(user || null));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("auth:token");
  sessionStorage.removeItem("auth:user");
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = (typeof window !== "undefined") ? sessionStorage.getItem("auth:token") : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} - ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : (await res.text());
}

/* ------------ Auth ------------ */

export async function login(payload: LoginPayload) {
  const body =
    payload.mode === "email"
      ? { email: payload.email, password: payload.password }
      : { phone: payload.phone, password: payload.password };

  const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) });

  const token = data?.token || data?.access_token || data?.data?.token;
  const user  = data?.user  || data?.data?.user;
  if (!token) throw new Error("Token manquant dans la réponse /auth/login");

  setSession(token, user || null);
  return { token, user };
}

export async function me() {
  return apiFetch("/auth/me", { method: "GET" });
}

export async function logout() {
  try { await apiFetch("/auth/logout", { method: "POST" }); } catch {}
  clearSession();
}

/* ------------ Patients ------------ */

export async function listPatientsPaginated(params: { page?: number; per_page?: number; search?: string } = {}) {
  const { page = 1, per_page = 15, search = "" } = params;
  const qp = new URLSearchParams({ page: String(page), per_page: String(per_page) });
  if (search.trim()) qp.set("search", search.trim());
  return apiFetch(`/patients?${qp.toString()}`, { method: "GET" });
}

export async function createPatient(payload: any) {
  return apiFetch("/patients", { method: "POST", body: JSON.stringify(payload) });
}

export async function deletePatient(id: string) {
  return apiFetch(`/patients/${id}`, { method: "DELETE" });
}

export async function getPatient(id: string) {
  return apiFetch(`/patients/${id}`, { method: "GET" });
}

export async function updatePatient(id: string, payload: any) {
  return apiFetch(`/patients/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}
