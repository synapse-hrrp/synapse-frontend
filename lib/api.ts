// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8080/api/v1";

export type LoginPayload =
  | { mode: "email"; email: string; password: string }
  | { mode: "phone"; phone: string; password: string };

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("auth:token") : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : (await res.text());
}

export async function login(payload: LoginPayload) {
  const body =
    payload.mode === "email"
      ? { email: payload.email, password: payload.password }
      : { phone: payload.phone, password: payload.password };

  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });

  // backend attendu: { token, user }
  if (!data?.token) throw new Error("Token manquant dans la réponse /auth/login");

  sessionStorage.setItem("auth:token", data.token);
  sessionStorage.setItem("auth:user", JSON.stringify(data.user || null));

  return data as { token: string; user: any };
}

export function getSession() {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem("auth:token");
  const user = sessionStorage.getItem("auth:user");
  return token ? { token, user: user ? JSON.parse(user) : null } : null;
}

export const me = () => apiFetch("/auth/me", { method: "GET" });

export async function logout() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {}
  sessionStorage.removeItem("auth:token");
  sessionStorage.removeItem("auth:user");
}
