// lib/api.ts
import { setAuthSession, clearAuthSession } from "@/lib/authz"; // ou "./authz" si pas d'alias

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8080/api/v1";

/* ------------ Helpers session ------------ */
export type LoginPayload =
  | { mode: "email"; email: string; password: string }
  | { mode: "phone"; phone: string; password: string };

export function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("auth:token");
}

// ❌ on n'utilise plus setSession/clearSession : remplacés par setAuthSession/clearAuthSession

// Fetch commun avec protection contre la redirection HTML vers /login
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("auth:token") : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
    redirect: "follow",
  });

  // Si Laravel renvoie une page HTML de /login, on la traite comme 401
  const finalURL = res.url || "";
  const ct = res.headers.get("content-type") || "";
  if (res.redirected && finalURL.includes("/login")) {
    throw new Error("401 Unauthorized - redirected to login");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} - ${text}`);
  }

  return ct.includes("application/json") ? res.json() : (await res.text());
}

/* ------------ Auth ------------ */
export async function login(payload: LoginPayload) {
  const body =
    payload.mode === "email"
      ? { email: payload.email, password: payload.password }
      : { phone: payload.phone, password: payload.password };

  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const token = data?.token || data?.access_token || data?.data?.token;
  let user   = data?.user  || data?.data?.user;
  if (!token) throw new Error("Token manquant dans la réponse /auth/login");

  // Option: enrichir l'utilisateur avec /auth/me (roles, permissions, etc.)
  try {
    const meData = await me();
    user = meData?.data ?? meData ?? user;
  } catch {
    // si /auth/me n'est pas dispo, on continue avec user tel quel
  }

  setAuthSession(token, user || null);
  return { token, user };
}

export async function logout() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    clearAuthSession();
  }
}

export async function me() {
  return apiFetch("/auth/me", { method: "GET" });
}

/* ------------ Patients ------------ */
// ⚠️ version avec AbortSignal pour annuler la recherche si besoin
export async function listPatientsPaginated(
  params: { page?: number; per_page?: number; search?: string; signal?: AbortSignal } = {}
) {
  const { page = 1, per_page = 15, search = "", signal } = params;
  const qp = new URLSearchParams({ page: String(page), per_page: String(per_page) });
  if (search.trim()) qp.set("search", search.trim());
  return apiFetch(`/patients?${qp.toString()}`, { method: "GET", signal });
}

export async function createPatient(payload: any) {
  return apiFetch("/patients", { method: "POST", body: JSON.stringify(payload) });
}
export async function getPatient(id: string) {
  return apiFetch(`/patients/${id}`, { method: "GET" });
}
export async function updatePatient(id: string, payload: any) {
  return apiFetch(`/patients/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}
export async function deletePatient(id: string) {
  return apiFetch(`/patients/${id}`, { method: "DELETE" });
}


/* ------------ Personnels (routes admin) ------------ */
/** NB: le back expose /api/v1/admin/personnels (role:admin) */
export type Personnel = {
  id: number;
  user_id: number;
  matricule: string | null;
  first_name: string;
  last_name: string;
  sex?: "M" | "F" | null;
  date_of_birth?: string | null;
  cin?: string | null;
  phone_alt?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  job_title?: string | null;
  hired_at?: string | null;
  service_id?: number | null;
  avatar_path?: string | null;
  extra?: any;
  created_at?: string;
  updated_at?: string;

  // relations (si renvoyées par l’API)
  user?: { id: number; name: string; email: string } | null;
  service?: { id: number; name: string; slug?: string } | null;
};

/** Payloads front : on autorise roles/permissions comme attendu par le controller */
export type CreatePersonnelPayload = {
  user_id: number;                 // requis
  first_name: string;              // requis
  last_name: string;               // requis
  matricule?: string | null;
  sex?: "M" | "F" | null;
  date_of_birth?: string | null;
  cin?: string | null;
  phone_alt?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  job_title?: string | null;
  hired_at?: string | null;
  service_id?: number | null;
  avatar_path?: string | null;
  extra?: any;

  // 💡 nouveau côté front : déduire et pousser le rôle/les permissions
  roles?: string[];                // ex: ["laborantin"]
  permissions?: string[];          // optionnel
};

export type UpdatePersonnelPayload = Partial<CreatePersonnelPayload>;

export async function listPersonnelsPaginated(params: {
  page?: number;
  per_page?: number;
  search?: string;                 // utilisé pour ?q=
  user_id?: number | string;
  service_id?: number | string;
} = {}) {
  const {
    page = 1,
    per_page = 15,
    search = "",
    user_id,
    service_id,
  } = params;

  const qp = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
  });

  // le backend lit ?q=..., pas ?search
  if (search.trim()) qp.set("q", search.trim());
  if (user_id !== undefined && user_id !== null && String(user_id) !== "")
    qp.set("user_id", String(user_id));
  if (service_id !== undefined && service_id !== null && String(service_id) !== "")
    qp.set("service_id", String(service_id));

  return apiFetch(`/admin/personnels?${qp.toString()}`, { method: "GET" });
}

export async function createPersonnel(payload: CreatePersonnelPayload) {
  return apiFetch("/admin/personnels", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPersonnel(id: string | number) {
  return apiFetch(`/admin/personnels/${id}`, { method: "GET" });
}

export async function updatePersonnel(id: string | number, payload: UpdatePersonnelPayload) {
  return apiFetch(`/admin/personnels/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deletePersonnel(id: string | number) {
  return apiFetch(`/admin/personnels/${id}`, { method: "DELETE" });
}


/* ------------ Users (routes admin) ------------ */
/** NB: le back expose /api/v1/admin/users (role:admin) */
export type UserDTO = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
  // password est accepté en écriture seulement
};

export async function listUsersPaginated(params: { page?: number; per_page?: number; search?: string } = {}) {
  const { page = 1, per_page = 15, search = "" } = params;
  const qp = new URLSearchParams({ page: String(page), per_page: String(per_page) });
  if (search.trim()) qp.set("search", search.trim());
  return apiFetch(`/admin/users?${qp.toString()}`, { method: "GET" });
}

export async function createUser(
  payload: Partial<UserDTO> & { password: string; password_confirmation?: string }
) {
  return apiFetch("/admin/users", { method: "POST", body: JSON.stringify(payload) });
}

export async function getUser(id: string | number) {
  return apiFetch(`/admin/users/${id}`, { method: "GET" });
}
export async function updateUser(id: string | number, payload: Partial<UserDTO> & { password?: string }) {
  // si password === "" on ne l’envoie pas
  const body = { ...payload } as any;
  if (body.password === "") delete body.password;
  return apiFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}
export async function deleteUser(id: string | number) {
  return apiFetch(`/admin/users/${id}`, { method: "DELETE" });
}


/* ------------ Visites ------------ */
export type VisiteDTO = {
  id: string | number;
  patient_id: string;          // UUID du patient
  service_id: number;          // ID du service
  plaintes_motif: string;
  created_at?: string;
  updated_at?: string;
  // si le back renvoie les relations
  patient?: { id: string; nom: string; prenom: string; numero_dossier?: string } | null;
  service?: { id: number; name: string; slug?: string } | null;
};

export async function listVisitesPaginated(params: { page?: number; per_page?: number; search?: string } = {}) {
  const { page = 1, per_page = 15, search = "" } = params;
  const qp = new URLSearchParams({ page: String(page), per_page: String(per_page) });
  if (search.trim()) qp.set("search", search.trim());
  return apiFetch(`/visites?${qp.toString()}`, { method: "GET" });
}
export async function createVisite(payload: { patient_id: string; service_id: number; plaintes_motif: string }) {
  return apiFetch("/visites", { method: "POST", body: JSON.stringify(payload) });
}
export async function getVisite(id: string | number) {
  return apiFetch(`/visites/${id}`, { method: "GET" });
}
export async function updateVisite(id: string | number, payload: Partial<Pick<VisiteDTO,"patient_id"|"service_id"|"plaintes_motif">>) {
  return apiFetch(`/visites/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}
export async function deleteVisite(id: string | number) {
  return apiFetch(`/visites/${id}`, { method: "DELETE" });
}


/* ------------ Services (CRUD) ------------ */
export type Service = {
  id: number;
  slug: string;
  name: string;
  code?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

function qs(obj: Record<string, string>) {
  const u = new URLSearchParams(obj);
  return u.toString();
}

export async function listServicesPaginated(params: { page?: number; per_page?: number; search?: string } = {}) {
  const { page = 1, per_page = 15, search = "" } = params;
  const query = qs({ page: String(page), per_page: String(per_page), ...(search.trim() ? { search: search.trim() } : {}) });
  try {
    return await apiFetch(`/admin/services?${query}`, { method: "GET" });
  } catch {
    return await apiFetch(`/services?${query}`, { method: "GET" });
  }
}


export async function listAllServices() {
  // essaye admin d'abord
  try {
    // 1) on tire la première page avec un per_page élevé
    const perPage = 200;
    const first = await apiFetch(`/admin/services?page=1&per_page=${perPage}`, { method: "GET" });
    const firstData = first?.data ?? (Array.isArray(first) ? first : []);
    const total = first?.meta?.total ?? firstData.length;

    // 2) si tout tient dans la première page → on renvoie
    if (firstData.length >= total) {
      return firstData;
    }

    // 3) sinon on boucle pour récupérer les pages suivantes
    const pages = Math.max(1, Math.ceil(total / (first?.meta?.per_page || perPage)));
    const all = [...firstData];
    for (let p = 2; p <= pages; p++) {
      const next = await apiFetch(`/admin/services?page=${p}&per_page=${perPage}`, { method: "GET" });
      const nextData = next?.data ?? (Array.isArray(next) ? next : []);
      all.push(...nextData);
    }
    return all;
  } catch {
    // fallback: route publique /services
    try {
      const perPage = 200;
      const first = await apiFetch(`/services?page=1&per_page=${perPage}`, { method: "GET" });
      const firstData = first?.data ?? (Array.isArray(first) ? first : []);
      const total = first?.meta?.total ?? firstData.length;

      if (firstData.length >= total) return firstData;

      const pages = Math.max(1, Math.ceil(total / (first?.meta?.per_page || perPage)));
      const all = [...firstData];
      for (let p = 2; p <= pages; p++) {
        const next = await apiFetch(`/services?page=${p}&per_page=${perPage}`, { method: "GET" });
        const nextData = next?.data ?? (Array.isArray(next) ? next : []);
        all.push(...nextData);
      }
      return all;
    } catch {
      return [];
    }
  }
}


export async function createService(payload: Partial<Service>) {
  try {
    return await apiFetch(`/admin/services`, { method: "POST", body: JSON.stringify(payload) });
  } catch {
    return await apiFetch(`/services`, { method: "POST", body: JSON.stringify(payload) });
  }
}

export async function getService(id: string | number) {
  try {
    return await apiFetch(`/admin/services/${id}`, { method: "GET" });
  } catch {
    return await apiFetch(`/services/${id}`, { method: "GET" });
  }
}

export async function updateService(id: string | number, payload: Partial<Service>) {
  try {
    return await apiFetch(`/admin/services/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  } catch {
    return await apiFetch(`/services/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  }
}

export async function deleteService(id: string | number) {
  try {
    return await apiFetch(`/admin/services/${id}`, { method: "DELETE" });
  } catch {
    return await apiFetch(`/services/${id}`, { method: "DELETE" });
  }
}


/* ------------ Pansements (Métier) ------------ */
export type PansementDTO = {
  id: string | number;
  patient_id: string;                 // UUID requis
  visite_id?: string | null;          // UUID optionnel (le back peut le déduire)
  soignant_id?: number | null;        // rempli côté back
  date_soin?: string | null;          // ISO ou "YYYY-MM-DD HH:mm:ss"
  type: string;                       // ⚠️ requis par la migration
  observation?: string | null;
  etat_plaque?: string | null;
  produits_utilises?: string | null;
  status?: "planifie" | "en_cours" | "clos" | "annule"; // ⬅︎ enum exact
  created_at?: string; updated_at?: string;
  // relations éventuelles
  patient?: { id: string; nom: string; prenom: string; numero_dossier?: string } | null;
  visite?: { id: string; service_id?: number; heure_arrivee?: string } | null;
  soignant?: { id: number; name: string; email?: string } | null;
};

export async function listPansementsPaginated(params: {
  page?: number; per_page?: number; q?: string; patient_id?: string; status?: string; sort?: string;
} = {}) {
  const { page = 1, per_page = 15, q = "", patient_id = "", status = "", sort = "-date_soin" } = params;
  const qp = new URLSearchParams({ page: String(page), limit: String(per_page), sort });
  if (q.trim()) qp.set("q", q.trim());
  if (patient_id) qp.set("patient_id", patient_id);
  if (status) qp.set("status", status);
  return apiFetch(`/pansements?${qp.toString()}`, { method: "GET" });
}

export async function createPansement(payload: {
  patient_id: string;
  visite_id?: string | null;
  type: string; // ⚠️ requis
  observation?: string | null;
  etat_plaque?: string | null;
  produits_utilises?: string | null;
  status?: "planifie" | "en_cours" | "clos" | "annule";
  date_soin?: string | null;
}) {
  return apiFetch(`/pansements`, { method: "POST", body: JSON.stringify(payload) });
}
export async function getPansement(id: string | number) {
  return apiFetch(`/pansements/${id}`, { method: "GET" });
}
export async function updatePansement(id: string | number, payload: Partial<PansementDTO>) {
  return apiFetch(`/pansements/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}
export async function deletePansement(id: string | number) {
  return apiFetch(`/pansements/${id}`, { method: "DELETE" });
}


/* ------------ Laboratoire (Métier) ------------ */
export type LaboratoireDTO = {
  id: string;                    // UUID
  patient_id: string;            // UUID requis
  visite_id?: string | null;     // UUID optionnel
  test_code: string;             // ⚠ requis
  test_name: string;             // ⚠ requis
  specimen?: string | null;

  status?: "pending" | "in_progress" | "validated" | "canceled"; // défaut: pending

  result_value?: string | null;
  unit?: string | null;
  ref_range?: string | null;
  result_json?: any;             // objet JSON libre

  price?: number | null;
  currency?: string | null;      // ex: "XAF"
  invoice_id?: string | null;    // UUID

  requested_by?: number | null;
  requested_at?: string | null;  // ISO
  validated_by?: number | null;
  validated_at?: string | null;

  created_at?: string;
  updated_at?: string;

  // relations éventuelles si le back les renvoie
  patient?: { id: string; nom: string; prenom: string; numero_dossier?: string } | null;
  visite?: { id: string; service_id?: number; heure_arrivee?: string } | null;
  requester?: { id: number; name: string } | null;
  validator?: { id: number; name: string } | null;
};

export async function listLaboratoiresPaginated(params: {
  page?: number; per_page?: number; q?: string; status?: string; patient_id?: string; sort?: string;
} = {}) {
  const { page = 1, per_page = 15, q = "", status = "", patient_id = "", sort = "-requested_at" } = params;
  const qp = new URLSearchParams({ page: String(page), limit: String(per_page), sort });
  if (q.trim()) qp.set("q", q.trim());
  if (status) qp.set("status", status);
  if (patient_id) qp.set("patient_id", patient_id);
  return apiFetch(`/laboratoire?${qp.toString()}`, { method: "GET" });
}

export async function createLaboratoire(payload: Partial<LaboratoireDTO> & {
  patient_id: string; test_code: string; test_name: string;
}) {
  return apiFetch(`/laboratoire`, { method: "POST", body: JSON.stringify(payload) });
}
export async function getLaboratoire(id: string) {
  return apiFetch(`/laboratoire/${id}`, { method: "GET" });
}
export async function updateLaboratoire(id: string, payload: Partial<LaboratoireDTO>) {
  return apiFetch(`/laboratoire/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}
export async function deleteLaboratoire(id: string) {
  return apiFetch(`/laboratoire/${id}`, { method: "DELETE" });
}
