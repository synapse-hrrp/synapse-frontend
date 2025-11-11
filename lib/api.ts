// lib/api.ts
import { setAuthSession, clearAuthSession } from "@/lib/authz"; // ou "./authz" si pas d'alias

/* ================= Base & helpers ================= */
const API_BASE_RAW = process.env.NEXT_PUBLIC_API_BASE || "http://192.168.1.196:8000/api/v1";
const API_BASE = API_BASE_RAW.replace(/\/+$/, ""); // retire les / finaux

function join(base: string, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/* ------------ Helpers session ------------ */
export type LoginPayload =
  | { mode: "email"; email: string; password: string }
  | { mode: "phone"; phone: string; password: string };

export function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("auth:token");
}

/* =============== Fetch commun (FIX headers) =============== */
// Protection contre redirection HTML /login + fusion de headers sûre
// lib/api.ts
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("auth:token") : null;

  const isFormData = options.body instanceof FormData;

  // Construit des headers "safe"
  const headers = new Headers({
    Accept: "application/json",
    // ❗️ NE PAS fixer Content-Type si FormData (fetch ajoute le boundary)
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
  });

  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Fusionne les headers passés par l’appelant (en les laissant override)
  if (options.headers) {
    const extra = new Headers(options.headers as HeadersInit);
    extra.forEach((v, k) => headers.set(k, v));
  }

  // Si on nous a passé un objet JS (pas FormData, pas string), on JSON.stringify
  let body = options.body as any;
  if (body && !isFormData && typeof body === "object" && !(body instanceof Blob)) {
    body = JSON.stringify(body);
  }

  const res = await fetch(join(API_BASE, path), {
    ...options,
    headers,
    body,
    cache: "no-store",
    redirect: "follow",
    // Si tu utilises Sanctum + cookies: active aussi credentials
    // credentials: "include",
  });

  // Si Laravel renvoie une page HTML /login, traite comme 401
  const finalURL = res.url || "";
  const ct = res.headers.get("content-type") || "";
  if (res.redirected && finalURL.includes("/login")) {
    throw new Error("401 Unauthorized - redirected to login");
  }

  const rawText = await res.text().catch(() => "");
  const tryJson = () => {
    try { return rawText ? JSON.parse(rawText) : null; } catch { return null; }
  };

  if (!res.ok) {
    const data = tryJson();
    const msg =
      (data && (data.message || data.error)) ||
      `${res.status} ${res.statusText}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.payload = data || rawText;
    throw err;
  }

  return ct.includes("application/json") ? (rawText ? JSON.parse(rawText) : null) : rawText;
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

/* ------------ Services (UNIQUE) ------------ */
export type ServiceDTO = {
  id: number;
  slug: string;
  name: string;
  is_active?: boolean;
};

// ⬇️ Renvoie *toutes* les pages (corrige le problème des 16 éléments)
export async function listAllServices(params: { search?: string; per_page?: number } = {}) {
  const { search = "", per_page = 500 } = params; // tu peux augmenter si besoin
  const all: ServiceDTO[] = [];
  let page = 1;

  while (true) {
    const res: any = await listServicesPaginated({ page, per_page, search });
    const arr: ServiceDTO[] = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : [];

    all.push(...arr);

    const meta = res?.meta;
    const cur  = meta?.current_page ?? page;
    const last = meta?.last_page;

    if (last) {
      if (cur >= last) break;      // pagination classique Laravel
    } else {
      if (arr.length < per_page) break; // fallback si pas de meta
    }

    page++;
    if (page > 1000) break; // garde-fou
  }

  return all;
}

// Alias rétro-compatibilité (pour VisiteFormPro qui importe listServices)
export const listServices = listAllServices;

function qs(obj: Record<string, string>) {
  const u = new URLSearchParams(obj);
  return u.toString();
}

export async function listServicesPaginated(params: { page?: number; per_page?: number; search?: string } = {}) {
  const { page = 1, per_page = 15, search = "" } = params;
  const query = qs({
    page: String(page),
    per_page: String(per_page),
    ...(search.trim() ? { search: search.trim() } : {}),
  });

  try {
    return await apiFetch(`/admin/services?${query}`, { method: "GET" });
  } catch {
    return await apiFetch(`/services?${query}`, { method: "GET" });
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

/* ================== Examens ================== */
export type ExamenDTO = {
  id: string;
  patient_id: string;
  service_slug?: string | null;   // ex: "laboratoire"
  demande_par?: number | null;    // personnels.id (si renvoyé)
  valide_par?: number | null;     // personnels.id (si renvoyé)

  type_origine: "interne" | "externe";
  prescripteur_externe?: string | null;
  reference_demande?: string | null;

  code_examen: string;
  nom_examen: string;
  prelevement?: string | null;

  statut: "en_attente" | "en_cours" | "termine" | "valide";

  valeur_resultat?: string | null;
  unite?: string | null;
  intervalle_reference?: string | null;
  resultat_json?: any | null;

  prix?: number | null;
  devise?: string | null;
  facture_id?: string | null;

  date_demande?: string | null;     // ISO
  date_validation?: string | null;  // ISO

  created_at?: string | null;
  updated_at?: string | null;

  // relations éventuelles renvoyées par l'API
  patient?: { id: string; nom: string; prenom: string; numero_dossier?: string } | null;
};

export async function listExamensPaginated(params: { page?: number; per_page?: number; search?: string } = {}) {
  const { page = 1, per_page = 15, search = "" } = params;
  const qp = new URLSearchParams({ page: String(page), per_page: String(per_page) });
  if (search?.trim()) qp.set("search", search.trim());
  return apiFetch(`/examens?${qp.toString()}`, { method: "GET" });
}

export async function createExamen(payload: Partial<ExamenDTO>) {
  return apiFetch(`/examens`, { method: "POST", body: JSON.stringify(payload) });
}

export async function getExamen(id: string) {
  return apiFetch(`/examens/${id}`, { method: "GET" });
}

export async function updateExamen(id: string, payload: Partial<ExamenDTO>) {
  return apiFetch(`/examens/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function deleteExamen(id: string) {
  return apiFetch(`/examens/${id}`, { method: "DELETE" });
}

/* ------------ Tarifs (slug) ------------ */
export type Tarif = {
  id: string;
  code: string;
  libelle: string;
  montant: number | string;
  devise?: string | null;
  is_active?: boolean | null;
  service_slug?: string | null;            // ✅ slug
  service?: { slug?: string; name: string } | null;
  created_at?: string;
  updated_at?: string;
};

// Helpers locaux pour cette section (utilisent ton apiFetch)
async function _apiGet(path: string, params?: Record<string, any>) {
  const qp = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v).trim() !== "") qp.set(k, String(v));
    }
  }
  const qs = qp.toString();
  return apiFetch(`${path}${qs ? `?${qs}` : ""}`, { method: "GET" });
}
async function _apiSend(path: string, method: "POST"|"PUT"|"PATCH"|"DELETE", body?: any) {
  return apiFetch(path, { method, body: body != null ? JSON.stringify(body) : undefined });
}

// --- NEW: lister tous les tarifs (agrège la pagination) ---
export async function listAllTarifs(params: {
  search?: string;
  service?: string;
  only_active?: boolean | number;
  sort?: string;
  dir?: "asc" | "desc";
  per_page?: number;
  max_pages?: number;
} = {}): Promise<Tarif[]> {
  const {
    search = "",
    service = "",
    only_active,
    sort,
    dir,
    per_page = 200,
    max_pages = 50,
  } = params;

  let page = 1;
  const all: Tarif[] = [];

  while (page <= max_pages) {
    const resp: any = await _apiGet("/tarifs", {
      page,
      per_page,
      limit: per_page,
      ...(search.trim() ? { search: search.trim(), q: search.trim() } : {}),
      ...(service.trim() ? { service: service.trim() } : {}),
      ...(only_active != null ? { only_active: Number(!!only_active) } : {}),
      ...(sort ? { sort } : {}),
      ...(dir ? { dir } : {}),
    });

    const data: Tarif[] = Array.isArray(resp) ? (resp as Tarif[]) : (resp?.data ?? []);
    const meta: any = Array.isArray(resp) ? null : (resp?.meta ?? null);

    all.push(...data);

    const noMore =
      (!meta && data.length < per_page) ||
      (meta?.last_page && page >= meta.last_page);

    if (noMore) break;
    page += 1;
  }

  return all;
}

// --- NEW: liste paginée des tarifs ---
export async function listTarifsPaginated(params: {
  page?: number;
  per_page?: number;
  search?: string;
  service?: string;
  only_active?: boolean | number;
  sort?: string;
  dir?: "asc" | "desc";
} = {}) {
  const {
    page = 1,
    per_page = 15,
    search = "",
    service = "",
    only_active,
    sort,
    dir,
  } = params;

  return _apiGet("/tarifs", {
    page,
    per_page,
    limit: per_page,
    ...(search.trim() ? { search: search.trim(), q: search.trim() } : {}),
    ...(service.trim() ? { service: service.trim() } : {}),
    ...(only_active != null ? { only_active: Number(!!only_active) } : {}),
    ...(sort ? { sort } : {}),
    ...(dir ? { dir } : {}),
  });
}

export async function getTarif(id: string) {
  return _apiGet(`/tarifs/${id}`);
}

export async function createTarif(payload: {
  code: string; libelle: string; montant: number; devise?: string; is_active?: boolean; service_slug?: string | null;
}) {
  return _apiSend("/tarifs", "POST", payload);
}

export async function updateTarif(id: string, payload: {
  code?: string; libelle?: string; montant?: number; devise?: string; is_active?: boolean; service_slug?: string | null;
}) {
  return _apiSend(`/tarifs/${id}`, "PUT", payload);
}

export async function deleteTarif(id: string) {
  return _apiSend(`/tarifs/${id}`, "DELETE");
}


function authHeaders() {
  try {
    const t = typeof window !== "undefined" ? sessionStorage.getItem("auth:token") : null;
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

export async function uploadPersonnelAvatar(
  personnelId: string | number,
  file: File
): Promise<string> {
  const token = getToken?.(); // si getToken existe déjà dans lib/api.ts
  const url = `${API_BASE}/admin/personnels/${personnelId}/avatar`;

  const fd = new FormData();
  // côté Laravel, on a prévu le champ "file" (adapter si ton contrôleur attend "avatar")
  fd.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });

  if (!res.ok) {
    throw new Error(`Upload avatar failed: ${res.status} ${res.statusText}`);
  }

  // tolérant: accepte string ou JSON { avatar_path|path|url }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j: any = await res.json();
    return j.avatar_path || j.path || j.url || j.data?.avatar_path || "";
  } else {
    const t = await res.text();
    try {
      const j: any = JSON.parse(t);
      return j.avatar_path || j.path || j.url || "";
    } catch {
      return t; // si l'API renvoie directement le chemin en texte
    }
  }
}

export async function deletePersonnelAvatar(
  personnelId: string | number
): Promise<void> {
  const token = getToken?.();
  const url = `${API_BASE}/admin/personnels/${personnelId}/avatar`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    throw new Error(`Delete avatar failed: ${res.status} ${res.statusText}`);
  }
}


// lib/api.ts — AJOUT UNIQUEMENT LA SECTION "Médecins" (assure-toi de n'en avoir qu'UNE)
/* ------------ Médecins (Métier) ------------ */
export type MedecinDTO = {
  id: number;
  personnel_id: number;
  numero_ordre: string;
  specialite: string;
  grade?: string | null;
  deleted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  personnel?: {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
  } | null;
};

export async function listMedecinsPaginated(params: {
  page?: number;
  per_page?: number;
  search?: string;
  specialite?: string;
  grade?: string;
} = {}) {
  const { page = 1, per_page = 15, search = "", specialite = "", grade = "" } = params;
  const qs = new URLSearchParams({ page: String(page), per_page: String(per_page) });
  if (search.trim()) qs.set("search", search.trim());
  if (specialite.trim()) qs.set("specialite", specialite.trim());
  if (grade.trim()) qs.set("grade", grade.trim());

  return apiFetch(`/medecins?${qs.toString()}`, { method: "GET" });
}

export async function createMedecin(payload: {
  personnel_id: number;
  numero_ordre: string;
  specialite: string;
  grade?: string | null;
}) {
  return apiFetch("/medecins", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMedecin(id: string | number) {
  return apiFetch(`/medecins/${id}`, { method: "GET" });
}

export async function updateMedecin(id: string | number, payload: Partial<MedecinDTO>) {
  return apiFetch(`/medecins/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteMedecin(id: string | number) {
  return apiFetch(`/medecins/${id}`, { method: "DELETE" });
}


export async function getMedecinByPersonnel(personnelId: number | string) {
  return apiFetch(`/medecins/by-personnel/${personnelId}`, { method: "GET" });
}

// ---------- Visites (types + CRUD) ----------

export type StatutVisite = "EN_ATTENTE" | "A_ENCAISSER" | "PAYEE" | "CLOTUREE";

export type VisiteDTO = {
  id: string;                 // uuid
  patient_id: string;         // uuid
  service_id: number;         // bigint unsigned

  medecin_id?: number | null;
  agent_id?: number | null;
  medecin_nom?: string | null;  // snapshots
  agent_nom?: string | null;

  heure_arrivee?: string | null;         // ISO string (ou 'YYYY-MM-DDTHH:mm')
  plaintes_motif?: string | null;
  hypothese_diagnostic?: string | null;

  affectation_id?: string | null;        // uuid|null

  tarif_id?: string | null;              // uuid|null
  montant_prevu?: number | string | null;
  montant_du?: number | string | null;
  devise?: string | null;

  statut: StatutVisite;
  clos_at?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  // Relations éventuelles renvoyées par l’API
  patient?: { id: string; nom?: string; prenom?: string; numero_dossier?: string } | null;
  service?: { id: number; name?: string; slug?: string } | null;
};

export async function listVisitesPaginated(params: {
  page?: number;
  per_page?: number;
  search?: string;
  statut?: StatutVisite | "";
  service_id?: number | "";
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
} = {}) {
  const { page = 1, per_page = 15, search = "", statut = "", service_id = "", date_from, date_to } = params;
  const qp = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
  });
  if (search?.trim()) qp.set("search", search.trim());
  if (statut) qp.set("statut", statut);
  if (service_id) qp.set("service_id", String(service_id));
  if (date_from) qp.set("date_from", date_from);
  if (date_to) qp.set("date_to", date_to);

  return apiFetch(`/visites?${qp.toString()}`, { method: "GET" });
}

export async function createVisite(payload: Partial<VisiteDTO>) {
  return apiFetch(`/visites`, { method: "POST", body: JSON.stringify(payload) });
}

export async function getVisite(id: string | number) {
  const _id = String(id);
  return apiFetch(`/visites/${_id}`, { method: "GET" });
}

export async function updateVisite(id: string | number, payload: Partial<VisiteDTO>) {
  const _id = String(id);
  return apiFetch(`/visites/${_id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function deleteVisite(id: string | number) {
  const _id = String(id);
  return apiFetch(`/visites/${_id}`, { method: "DELETE" });
}


// ============================================================
//  Pharmacie API (Front) — s'appuie sur TON apiFetch existant
//  ⚠️ Ne redéclare PAS apiFetch ici, on l'importe déjà ailleurs
// ============================================================

// ---------- Types ----------
// lib/api.ts
export type Dci = { id: number; name: string; description?: string | null };

export type ArticleDTO = {
  id: number;
  code: string;
  name: string;
  form?: string | null;
  dosage?: string | null;
  unit?: string | null;
  dci_id?: number | null;
  dci?: { id: number; name: string } | null;
  stock_on_hand?: number;
  buy_price?: number | null;
  sell_price?: number | null;
  tax_rate?: number | null;
  image_url?: string | null;
};

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  // compat
  page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
};

// 👇 Assure-toi que apiFetch existe déjà dans ton projet
declare function apiFetch(
  url: string,
  init?: RequestInit & { raw?: boolean }
): Promise<any>;

/** Options légères — GET /pharma/dcis/options */
export async function getDciOptions(): Promise<Array<{ id: number; name: string }>> {
  const res: any = await apiFetch(`/pharma/dcis/options`, { method: "GET" });
  const arr = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
  return arr.map((d: any) => ({
    id: Number(d.id ?? d.value),
    name: String(d.name ?? d.label ?? ""),
  }));
}

/**
 * Liste paginée avec recherche — **signature stable** pour les pages :
 * getDcis({ q }) -> { data: Dci[] }
 *
 * Si tu as une vraie route /pharma/dcis qui renvoie la liste complète
 * (avec description, pagination, etc.), dé-commente le bloc A.
 * Sinon, on fallback sur /options (bloc B) et on re-shape vers { data: [...] }.
 */
// --- getDcis avec description depuis /pharma/dcis ---
export async function getDcis(params?: { q?: string; page?: number; per_page?: number }): Promise<Paginated<Dci>> {
  const { q = "", page, per_page } = params ?? {};

  // Construit l'URL: /pharma/dcis?q=...&page=...&per_page=...
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (page) search.set("page", String(page));
  if (per_page) search.set("per_page", String(per_page));
  const qs = search.toString();
  const url = `/pharma/dcis${qs ? `?${qs}` : ""}`;

  const res: any = await apiFetch(url, { method: "GET" });

  // Tolère plusieurs formats de backend:
  // 1) { data: [{id,name,description}], meta: {...} }
  // 2) [{id,name,description}]
  // 3) { items: [...], total, page, per_page } (on re-shape en Paginated)
  if (Array.isArray(res)) {
    // cas #2
    return {
      data: res.map((d: any) => ({
        id: Number(d.id),
        name: String(d.name ?? ""),
        description: d.description ?? null,
      })),
      meta: { current_page: 1, last_page: 1, per_page: res.length, total: res.length },
    };
  }

  if (Array.isArray(res?.data)) {
    // cas #1
    return {
      data: res.data.map((d: any) => ({
        id: Number(d.id),
        name: String(d.name ?? ""),
        description: d.description ?? null,
      })),
      meta: res.meta ?? res.pagination ?? undefined,
      page: res.page,
      per_page: res.per_page,
      total: res.total,
      total_pages: res.total_pages,
    };
  }

  if (Array.isArray(res?.items)) {
    // cas #3
    const items = res.items.map((d: any) => ({
      id: Number(d.id),
      name: String(d.name ?? ""),
      description: d.description ?? null,
    }));
    return {
      data: items,
      meta: {
        current_page: Number(res.page ?? 1),
        last_page: Number(
          res.total_pages ??
          (res.per_page ? Math.max(1, Math.ceil(Number(res.total ?? items.length) / Number(res.per_page))) : 1)
        ),
        per_page: Number(res.per_page ?? items.length),
        total: Number(res.total ?? items.length),
      },
      page: res.page,
      per_page: res.per_page,
      total: res.total,
      total_pages: res.total_pages,
    };
  }

  // Si ton backend ne renvoie pas un des formats ci-dessus, on tente de mapper au mieux
  const raw = res ?? {};
  const maybeList = raw.list ?? raw.rows ?? raw.results ?? [];
  if (Array.isArray(maybeList)) {
    return {
      data: maybeList.map((d: any) => ({
        id: Number(d.id),
        name: String(d.name ?? ""),
        description: d.description ?? null,
      })),
      meta: raw.meta ?? undefined,
    };
  }

  // Dernier recours: on retombe sur /options (sans description)
  const opts = await getDciOptions();
  return {
    data: opts.map(o => ({ id: o.id, name: o.name, description: null })), // <-- pas de description dans ce cas
    meta: { current_page: 1, last_page: 1, per_page: opts.length, total: opts.length },
  };
}


/** Lecture d’un DCI par id — GET /pharma/dcis/{id} */
export async function getDci(id: string | number): Promise<Dci> {
  const res: any = await apiFetch(`/pharma/dcis/${id}`, { method: "GET" });
  if (!res || (res && res.error)) throw new Error("Erreur lors du chargement du DCI");
  return {
    id: Number(res.id),
    name: String(res.name ?? ""),
    description: res.description ?? null,
  };
}

// CRUD DCI
export async function createDci(payload: { name: string; description?: string }): Promise<Dci> {
  return apiFetch(`/pharma/dcis`, { method: "POST", body: JSON.stringify(payload) });
}
export async function updateDci(id: number | string, payload: { name?: string; description?: string }): Promise<Dci> {
  return apiFetch(`/pharma/dcis/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}
export async function deleteDci(id: number | string): Promise<void> {
  await apiFetch(`/pharma/dcis/${id}`, { method: "DELETE" });
}


// ============================================================
// Articles
// ============================================================

// (1) Lire un article  GET /pharma/articles/{id}
export async function getArticle(id: string | number): Promise<ArticleDTO> {
  const a: any = await apiFetch(`/pharma/articles/${id}`, { method: "GET" });
  return {
    id: Number(a.id),
    code: String(a.code ?? ""),
    name: String(a.name ?? ""),
    form: a.form ?? null,
    dosage: a.dosage ?? null,
    unit: a.unit ?? null,
    dci_id: a.dci_id ?? (a.dci?.id ?? null),
    dci: a.dci ? { id: Number(a.dci.id), name: String(a.dci.name) } : null,
    stock_on_hand: Number(a.stock_on_hand ?? a.stock ?? 0),
    buy_price: a.buy_price != null ? Number(a.buy_price) : null,
    sell_price: a.sell_price != null ? Number(a.sell_price) : null,
    tax_rate: a.tax_rate != null ? Number(a.tax_rate) : null,
    image_url: a.image_url ?? null,
  };
}

// (2) Liste paginée  GET /pharma/articles
export async function listArticles(params?: {
  q?: string;
  form?: string;
  active?: boolean;
  per_page?: number;
  page?: number;
}): Promise<Paginated<ArticleDTO>> {
  const qp = new URLSearchParams();
  if (params?.q) qp.set("q", params.q);
  if (params?.form) qp.set("form", params.form);
  if (typeof params?.active === "boolean") qp.set("active", String(params.active));
  if (params?.per_page) qp.set("per_page", String(params.per_page));
  if (params?.page) qp.set("page", String(params.page));

  const res: any = await apiFetch(`/pharma/articles?${qp.toString()}`, { method: "GET" });
  const arr: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

  const data: ArticleDTO[] = arr.map((a: any) => ({
    id: Number(a.id),
    code: String(a.code ?? ""),
    name: String(a.name ?? ""),
    form: a.form ?? null,
    dosage: a.dosage ?? null,
    unit: a.unit ?? null,
    dci: a.dci ? { id: Number(a.dci.id), name: String(a.dci.name) } : null,
    stock_on_hand: Number(a.stock_on_hand ?? 0),
    buy_price: a.buy_price != null ? Number(a.buy_price) : null,
    sell_price: a.sell_price != null ? Number(a.sell_price) : null,
    tax_rate: a.tax_rate != null ? Number(a.tax_rate) : null,
    image_url: a.image_url ?? a.image ?? null,
  }));

  return {
    data,
    meta: res?.meta ?? undefined,
    page: res?.meta?.current_page,
    per_page: res?.meta?.per_page,
    total: res?.meta?.total,
    total_pages: res?.meta?.last_page,
  };
}

// (3) Articles d’une DCI  GET /pharma/dcis/{dci}/articles
export async function listArticlesByDci(params: {
  dci_id: number | string;
  q?: string;
  form?: string;
  page?: number;
  per_page?: number;
}): Promise<Paginated<ArticleDTO>> {
  const { dci_id, q, form, page = 1, per_page = 32 } = params;
  const qp = new URLSearchParams({ page: String(page), per_page: String(per_page) });
  if (q?.trim()) qp.set("q", q.trim());
  if (form?.trim()) qp.set("form", form.trim());

  const res: any = await apiFetch(`/pharma/dcis/${dci_id}/articles?${qp.toString()}`, { method: "GET" });
  const arr: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

  const data: ArticleDTO[] = arr.map((a: any) => ({
    id: Number(a.id),
    code: String(a.code ?? ""),
    name: String(a.name ?? a.label ?? "—"),
    image_url: a.image_url ?? a.image ?? null,
    form: a.form ?? null,
    dosage: a.dosage ?? null,
    unit: a.unit ?? null,
    dci: a.dci?.id ? { id: Number(a.dci.id), name: String(a.dci.name ?? "") } : null,
    stock_on_hand: Number(a.stock_on_hand ?? a.stock ?? a.stock_total ?? 0),
    buy_price: a.buy_price != null ? Number(a.buy_price) : null,
    sell_price: a.sell_price != null ? Number(a.sell_price) : null,
    tax_rate: a.tax_rate != null ? Number(a.tax_rate) : null,
  }));

  const meta = res?.meta ?? {};
  const pageOut = Number(meta.current_page ?? page);
  const perOut = Number(meta.per_page ?? per_page);
  const total = Number(meta.total ?? data.length);
  const last = Number(meta.last_page ?? (total && perOut ? Math.max(1, Math.ceil(total / perOut)) : 1));

  return { data, page: pageOut, per_page: perOut, total, total_pages: last, meta: res?.meta };
}

// (4) Créer  POST /pharma/articles
export async function createArticle(payload: any, file?: File): Promise<ArticleDTO> {
  const url = `/pharma/articles`;
  if (file) {
    const fd = new FormData();
    Object.entries(payload || {}).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") fd.append(k, String(v));
    });
    fd.append("image", file);
    return apiFetch(url, { method: "POST", body: fd });
  }
  return apiFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload ?? {}) });
}

// (5) Mettre à jour  PUT /pharma/articles/{id}
export async function updateArticle(id: string | number, payload: any, file?: File): Promise<ArticleDTO> {
  const url = `/pharma/articles/${id}`;
  if (file) {
    const fd = new FormData();
    Object.entries(payload || {}).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") fd.append(k, String(v));
    });
    fd.append("image", file);
    return apiFetch(url, { method: "PUT", body: fd });
  }
  return apiFetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload ?? {}) });
}

// (6) Upload image seule  POST /pharma/articles/{id}/image
export async function uploadArticleImage(articleId: number | string, file: File) {
  const fd = new FormData();
  fd.append("image", file);
  return apiFetch(`/pharma/articles/${articleId}/image`, { method: "POST", body: fd });
}

// (7) Supprimer  DELETE /pharma/articles/{id}
export async function deleteArticle(id: number | string): Promise<{ message: string }> {
  return apiFetch(`/pharma/articles/${id}`, { method: "DELETE" });
}

// ============================================================
// Stock & Lots
// ============================================================
export async function stockIn(payload: {
  article_id: number;
  quantity: number;
  lot_id?: number;
  lot_number?: string;
  expires_at?: string | null; // YYYY-MM-DD
  unit_price?: number;        // achat (optionnel)
  sell_price?: number;        // vente (optionnel)
  supplier?: string;
  reference?: string;
}) {
  return apiFetch(`/pharma/stock/in`, { method: "POST", body: JSON.stringify(payload) });
}
export async function stockOut(payload: {
  article_id: number;
  quantity: number;
  reason?: "sale" | "transfer" | "waste";
  reference?: string;
}) {
  return apiFetch(`/pharma/stock/out`, { method: "POST", body: JSON.stringify(payload) });
}
export async function listLots(article_id: number, include_expired = false) {
  const qp = new URLSearchParams({ article_id: String(article_id) });
  if (include_expired) qp.set("include_expired", "1");
  return apiFetch(`/pharma/lots?${qp.toString()}`, { method: "GET" });
}

// ============================================================
// Panier (serveur)
export type ApiCart = {
  id: number;
  status: "open" | "checked_out" | "cancelled";
  total_ht: number | string;
  total_tva: number | string;
  total_ttc: number | string;
  currency: string;
  facture_id?: string | number | null; // si le back le renvoie sur checkout
  lines: Array<{
    id: number;
    article_id: number;
    quantity: number;
    unit_price: number | string | null;
    tax_rate: number | string | null;
    line_ht: number | string;
    line_tva: number | string;
    line_ttc: number | string;
    article?: { id: number; name: string; code: string; sell_price?: number };
  }>;
};

const CART_STORAGE_KEY = "ph_server_cart_id";
function getStoredCartId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CART_STORAGE_KEY);
}
function setStoredCartId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, String(id));
}
function clearStoredCartId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_STORAGE_KEY);
}

/** Ouvre un panier "open" avec contexte (patient, visite, etc.) */
export async function createPharmaCart(payload: {
  visite_id?: string | null;
  patient_id?: string | null;
  customer_name?: string | null;
  currency?: string | null;
} = {}) {
  return apiFetch(`/pharma/carts`, { method: "POST", body: JSON.stringify(payload) });
}

/**
 * Assure un panier **open**:
 * - si l'ID sauvegardé pointe vers un panier non "open", on l'invalide et on recrée
 * - on peut fournir un payload d’init pour lier patient/visite/currency dès la création
 */
export async function ensureCartId(init?: {
  visite_id?: string | null;
  patient_id?: string | null;
  customer_name?: string | null;
  currency?: string | null;
}): Promise<string> {
  const saved = getStoredCartId();

  if (saved) {
    try {
      const cart: any = await apiFetch(`/pharma/carts/${saved}`, { method: "GET" });
      if (cart && cart.status === "open") {
        return saved;
      }
      // panier fermé ou inexistant → purge
      clearStoredCartId();
    } catch {
      clearStoredCartId();
    }
  }

  const created = await createPharmaCart(init || {});
  const id = String(created.id);
  setStoredCartId(id);
  return id;
}

export async function getCart(cartId?: string) {
  const id = cartId ?? (await ensureCartId());
  return apiFetch(`/pharma/carts/${id}`, { method: "GET" });
}

export async function addCartLine(articleId: number, qty = 1) {
  const id = await ensureCartId();
  return apiFetch(`/pharma/carts/${id}/lines`, {
    method: "POST",
    body: JSON.stringify({ article_id: articleId, quantity: qty }),
  });
}

export async function updateCartLine(lineId: number | string, qty: number) {
  const id = await ensureCartId();
  return apiFetch(`/pharma/carts/${id}/lines/${lineId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity: qty }),
  });
}

export async function deleteCartLine(lineId: number | string) {
  const id = await ensureCartId();
  return apiFetch(`/pharma/carts/${id}/lines/${lineId}`, { method: "DELETE" });
}

/**
 * Checkout : déduis le stock, clôt le panier et génère la facture.
 * On **vide** l’ID local pour éviter de réutiliser un panier fermé.
 * La réponse devrait contenir `facture_id` (selon ton back).
 */
export async function checkoutCart(reference?: string) {
  const id = await ensureCartId();
  const res = await apiFetch(`/pharma/carts/${id}/checkout`, {
    method: "POST",
    body: JSON.stringify(reference ? { reference } : {}),
  });
  clearStoredCartId(); // le panier devient checked_out
  return res;          // <-- garde le res pour récupérer facture_id côté front
}

/** Paiement d’une facture (étape 4 du workflow) */
export async function payFacture(
  factureId: string | number,
  payload: { montant: number; mode: string; reference?: string; devise?: string }
) {
  return apiFetch(`/factures/${factureId}/reglements`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


// === Facturation — Types légers ===
export type FactureLigne = {
  id: number;
  designation?: string | null;
  article_id?: number | null;
  quantity: number;
  unit_price?: number | null;
  tax_rate?: number | null;
  line_ht?: number | string | null;
  line_tva?: number | string | null;
  line_ttc?: number | string | null;
};

export type FactureDTO = {
  id: string | number;
  numero?: string | null;
  status?: "draft" | "issued" | "paid" | "cancelled" | string;
  currency?: string | null;
  total_ht?: number | string | null;
  total_tva?: number | string | null;
  total_ttc?: number | string | null;
  patient_id?: string | null;
  visite_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  lignes?: FactureLigne[];
};

// Petit helper QS
function _qs(obj: Record<string, any>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && String(v) !== "") u.set(k, String(v));
  }
  return u.toString();
}

// === Factures: liste/lecture/création ===
export async function listFacturesPaginated(params: {
  page?: number; per_page?: number; search?: string;
  status?: string; date_from?: string; date_to?: string; patient_id?: string;
} = {}) {
  const { page = 1, per_page = 15, search = "", status, date_from, date_to, patient_id } = params;
  const qs = _qs({ page, per_page, search, status, date_from, date_to, patient_id });
  return apiFetch(`/factures?${qs}`, { method: "GET" }) as Promise<{
    data: FactureDTO[], meta?: { current_page: number; last_page: number; per_page: number; total: number }
  }>;
}

export async function getFactureFull(id: string | number) {
  return apiFetch(`/factures/${id}`, { method: "GET" }) as Promise<FactureDTO>;
}

export async function createFactureFromVisite(payload: { visite_id: string; currency?: string }) {
  return apiFetch(`/factures/from-visite`, { method: "POST", body: payload }) as Promise<FactureDTO>;
}

export async function createFactureLibre(payload: {
  patient_id?: string | null;
  currency?: string | null;
  lignes?: Array<Pick<FactureLigne, "designation" | "article_id" | "quantity" | "unit_price" | "tax_rate">>;
}) {
  return apiFetch(`/factures`, { method: "POST", body: payload }) as Promise<FactureDTO>;
}

// === Lignes de facture ===
export async function addFactureLigne(
  factureId: string | number,
  payload: Pick<FactureLigne, "designation" | "article_id" | "quantity" | "unit_price" | "tax_rate">
) {
  return apiFetch(`/factures/${factureId}/lignes`, { method: "POST", body: payload }) as Promise<FactureLigne>;
}

export async function updateFactureLigne(
  factureId: string | number,
  ligneId: string | number,
  payload: Partial<Pick<FactureLigne, "designation" | "article_id" | "quantity" | "unit_price" | "tax_rate">>
) {
  return apiFetch(`/factures/${factureId}/lignes/${ligneId}`, { method: "PATCH", body: payload }) as Promise<FactureLigne>;
}

export async function deleteFactureLigne(factureId: string | number, ligneId: string | number) {
  await apiFetch(`/factures/${factureId}/lignes/${ligneId}`, { method: "DELETE" });
}

// === Règlements / Caisse ===
// Tu as déjà payFacture(factureId, { montant, mode, reference?, devise? })
export const encaisserFacture = payFacture; // ✅ alias attendu par les pages

// Sessions de caisse (endpoints probables; ajuste si besoin côté back)
export async function openCashSession(payload: { opened_at?: string; initial_amount?: number; workstation_id?: string | number; note?: string }) {
  return apiFetch(`/cash-sessions/open`, { method: "POST", body: payload });
}
export async function currentCashSession() {
  return apiFetch(`/cash-sessions/current`, { method: "GET" });
}
export async function closeCashSession(payload?: { closed_at?: string; note?: string }) {
  return apiFetch(`/cash-sessions/close`, { method: "POST", body: payload ?? {} });
}

// Poste de travail (optionnel)
export async function getWorkstation() {
  return apiFetch(`/workstation`, { method: "GET" });
}
export async function setWorkstation(payload: { name?: string; code?: string; device_id?: string }) {
  return apiFetch(`/workstation`, { method: "POST", body: payload });
}

/* =======================================================================
   GESTION MALADE (mouvements) — Types + CRUD + Corbeille
   ======================================================================= */
export type GestionMaladeDTO = {
  id: string; // uuid
  patient_id: string;
  visite_id?: string | null;
  soignant_id?: number | null;

  date_acte?: string | null; // ISO

  type_action: "admission" | "transfert" | "hospitalisation" | "sortie";

  service_source?: string | null;
  service_destination?: string | null;

  pavillon?: string | null;
  chambre?: string | null;
  lit?: string | null;

  date_entree?: string | null;
  date_sortie_prevue?: string | null;
  date_sortie_effective?: string | null;

  motif?: string | null;
  diagnostic?: string | null;
  examen_clinique?: string | null;
  traitements?: string | null;
  observation?: string | null;

  statut: "en_cours" | "clos" | "annule";
  created_at?: string | null;
  updated_at?: string | null;

  // relations éventuelles
  patient?: any;
  visite?: any;
  soignant?: { id: number; name: string; email?: string } | null;
};

export async function listGestionMaladePaginated(params: {
  page?: number;
  limit?: number; // backend attend "limit"
  q?: string;
  patient_id?: string;
  statut?: GestionMaladeDTO["statut"] | "";
  type_action?: GestionMaladeDTO["type_action"] | "";
  sort?: "-date_acte" | "date_acte" | "created_at" | "-created_at" | "statut" | "-statut" | "type_action" | "-type_action";
  only_trashed?: boolean;
  with_trashed?: boolean;
} = {}) {
  const {
    page = 1,
    limit = 20,
    q = "",
    patient_id = "",
    statut = "",
    type_action = "",
    sort = "-date_acte",
    only_trashed = false,
    with_trashed = false,
  } = params;

  const qp = new URLSearchParams({
    page: String(page),
    limit: String(Math.min(Math.max(limit, 1), 200)),
    sort,
  });
  if (q.trim()) qp.set("q", q.trim());
  if (patient_id) qp.set("patient_id", patient_id);
  if (statut) qp.set("statut", statut);
  if (type_action) qp.set("type_action", type_action);
  if (only_trashed) qp.set("only_trashed", "1");
  else if (with_trashed) qp.set("with_trashed", "1");

  return apiFetch(`/gestion-malade?${qp.toString()}`, { method: "GET" });
}

export async function getGestionMalade(id: string) {
  return apiFetch(`/gestion-malade/${id}`, { method: "GET" });
}

export async function createGestionMalade(payload: Partial<GestionMaladeDTO> & { patient_id: string }) {
  return apiFetch(`/gestion-malade`, { method: "POST", body: payload });
}

export async function updateGestionMalade(id: string, payload: Partial<GestionMaladeDTO>) {
  return apiFetch(`/gestion-malade/${id}`, { method: "PUT", body: payload });
}

export async function deleteGestionMalade(id: string) {
  return apiFetch(`/gestion-malade/${id}`, { method: "DELETE" });
}

/* Corbeille / restore / suppression définitive */
export async function listGestionMaladeTrash(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  const qp = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiFetch(`/gestion-malade-corbeille?${qp.toString()}`, { method: "GET" });
}
export async function restoreGestionMalade(id: string) {
  return apiFetch(`/gestion-malade/${id}/restore`, { method: "POST" });
}
export async function forceDeleteGestionMalade(id: string) {
  return apiFetch(`/gestion-malade/${id}/force`, { method: "DELETE" });
}


/* =======================================================================
   HOSPITALISATIONS — Types + CRUD (+ via service)
   ======================================================================= */
export type HospitalisationDTO = {
  id: string; // uuid
  patient_id: string;
  service_slug?: string | null;
  admission_no?: string | null;
  created_via?: "service" | "med" | "admin" | null;
  created_by_user_id?: number | null;

  // logistique
  unite?: string | null;
  chambre?: string | null;
  lit?: string | null;
  lit_id?: number | null;
  medecin_traitant_id?: number | null;

  // clinique
  motif_admission?: string | null;
  diagnostic_entree?: string | null;
  diagnostic_sortie?: string | null;
  notes?: string | null;
  prise_en_charge_json?: any | null;

  // workflow
  statut: "en_cours" | "transfere" | "sorti" | "annule";
  date_admission?: string | null;
  date_sortie_prevue?: string | null;
  date_sortie_reelle?: string | null;

  // facturation
  prix?: number | string | null;
  devise?: string | null;
  facture_id?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  // relations éventuelles
  patient?: any;
  service?: any;
  medecinTraitant?: any;
};

export async function listHospitalisationsPaginated(params: {
  page?: number; per_page?: number;
  patient_id?: string; service_slug?: string;
  statut?: HospitalisationDTO["statut"] | "";
  from?: string; to?: string; // YYYY-MM-DD
  search?: string;
} = {}) {
  const { page = 1, per_page = 20, patient_id = "", service_slug = "", statut = "", from, to, search = "" } = params;
  const qp = new URLSearchParams({ page: String(page), per_page: String(per_page) });
  if (patient_id) qp.set("patient_id", patient_id);
  if (service_slug) qp.set("service_slug", service_slug);
  if (statut) qp.set("statut", statut);
  if (from) qp.set("from", from);
  if (to) qp.set("to", to);
  if (search.trim()) qp.set("search", search.trim());

  return apiFetch(`/hospitalisations?${qp.toString()}`, { method: "GET" });
}
export async function getHospitalisation(id: string) {
  return apiFetch(`/hospitalisations/${id}`, { method: "GET" });
}
export async function createHospitalisation(payload: Partial<HospitalisationDTO> & { patient_id: string }) {
  return apiFetch(`/hospitalisations`, { method: "POST", body: payload });
}
export async function createHospitalisationForService(service_slug: string, payload: Partial<HospitalisationDTO> & { patient_id: string }) {
  return apiFetch(`/services/${service_slug}/hospitalisations`, { method: "POST", body: payload });
}
export async function updateHospitalisation(id: string, payload: Partial<HospitalisationDTO>) {
  return apiFetch(`/hospitalisations/${id}`, { method: "PATCH", body: payload });
}
export async function deleteHospitalisation(id: string) {
  return apiFetch(`/hospitalisations/${id}`, { method: "DELETE" });
}
export async function restoreHospitalisation(id: string) {
  return apiFetch(`/hospitalisations/${id}/restore`, { method: "POST" });
}


/* =======================================================================
   BILLETS DE SORTIE — Types + CRUD (+ via service)
   ======================================================================= */
export type BilletSortieDTO = {
  id: string; // uuid
  patient_id: string;
  service_slug?: string | null;
  admission_id?: string | null;
  created_via?: "service" | "med" | "admin" | null;
  created_by_user_id?: number | null;

  motif_sortie?: string | null;
  diagnostic_sortie?: string | null;
  resume_clinique?: string | null;
  consignes?: string | null;
  traitement_sortie_json?: any | null;
  rdv_controle_at?: string | null;
  destination?: string | null;

  prix?: number | string | null;
  devise?: string | null;
  facture_id?: string | null;

  statut: "brouillon" | "valide" | "remis";
  remis_a?: string | null;
  signature_par?: string | null;
  date_signature?: string | null;
  date_sortie_effective?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  // relations éventuelles
  patient?: any;
  service?: any;
  signataire?: any;
};

export async function listBilletsSortiePaginated(params: {
  page?: number; per_page?: number;
  patient_id?: string; service_slug?: string;
  statut?: BilletSortieDTO["statut"] | ""; search?: string;
} = {}) {
  const { page = 1, per_page = 20, patient_id = "", service_slug = "", statut = "", search = "" } = params;
  const qp = new URLSearchParams({ page: String(page), per_page: String(per_page) });
  if (patient_id) qp.set("patient_id", patient_id);
  if (service_slug) qp.set("service_slug", service_slug);
  if (statut) qp.set("statut", statut);
  if (search.trim()) qp.set("search", search.trim());
  return apiFetch(`/billets-de-sortie?${qp.toString()}`, { method: "GET" });
}
export async function getBilletSortie(id: string) {
  return apiFetch(`/billets-de-sortie/${id}`, { method: "GET" });
}
export async function createBilletSortie(payload: Partial<BilletSortieDTO> & { patient_id: string }) {
  return apiFetch(`/billets-de-sortie`, { method: "POST", body: payload });
}
export async function createBilletSortieForService(service_slug: string, payload: Partial<BilletSortieDTO> & { patient_id: string }) {
  return apiFetch(`/services/${service_slug}/billets-de-sortie`, { method: "POST", body: payload });
}
export async function updateBilletSortie(id: string, payload: Partial<BilletSortieDTO>) {
  return apiFetch(`/billets-de-sortie/${id}`, { method: "PATCH", body: payload });
}
export async function deleteBilletSortie(id: string) {
  return apiFetch(`/billets-de-sortie/${id}`, { method: "DELETE" });
}
export async function restoreBilletSortie(id: string) {
  return apiFetch(`/billets-de-sortie/${id}/restore`, { method: "POST" });
}


/* =======================================================================
   DECLARATIONS DE NAISSANCE — Types + CRUD (+ via service)
   ======================================================================= */
export type DeclarationNaissanceDTO = {
  id: string; // uuid
  mere_id: string;
  service_slug?: string | null;
  accouchement_id?: string | null;
  created_via?: "service" | "med" | "admin" | null;
  created_by_user_id?: number | null;

  bebe_nom?: string | null;
  bebe_prenom?: string | null;
  pere_nom?: string | null;
  pere_prenom?: string | null;

  date_heure_naissance?: string | null;
  lieu_naissance?: string | null;
  sexe?: "M" | "F" | "I" | null;
  poids_kg?: number | string | null;
  taille_cm?: number | string | null;
  apgar_1?: number | null;
  apgar_5?: number | null;

  numero_acte?: string | null;
  officier_etat_civil?: string | null;
  documents_json?: any | null;

  statut: "brouillon" | "valide" | "transmis";
  date_transmission?: string | null;

  prix?: number | string | null;
  devise?: string | null;
  facture_id?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  // relations éventuelles
  mere?: any;
  service?: any;
};

export async function listDeclarationsNaissancePaginated(params: {
  page?: number; per_page?: number;
  mere_id?: string; service_slug?: string;
  statut?: DeclarationNaissanceDTO["statut"] | "";
  from?: string; to?: string; // YYYY-MM-DD
  search?: string;
} = {}) {
  const { page = 1, per_page = 20, mere_id = "", service_slug = "", statut = "", from, to, search = "" } = params;
  const qp = new URLSearchParams({ page: String(page), per_page: String(per_page) });
  if (mere_id) qp.set("mere_id", mere_id);
  if (service_slug) qp.set("service_slug", service_slug);
  if (statut) qp.set("statut", statut);
  if (from) qp.set("from", from);
  if (to) qp.set("to", to);
  if (search.trim()) qp.set("search", search.trim());
  return apiFetch(`/declarations-naissance?${qp.toString()}`, { method: "GET" });
}
export async function getDeclarationNaissance(id: string) {
  return apiFetch(`/declarations-naissance/${id}`, { method: "GET" });
}
export async function createDeclarationNaissance(payload: Partial<DeclarationNaissanceDTO> & { mere_id: string }) {
  return apiFetch(`/declarations-naissance`, { method: "POST", body: payload });
}
export async function createDeclarationNaissanceForService(service_slug: string, payload: Partial<DeclarationNaissanceDTO> & { mere_id: string }) {
  return apiFetch(`/services/${service_slug}/declarations-naissance`, { method: "POST", body: payload });
}
export async function updateDeclarationNaissance(id: string, payload: Partial<DeclarationNaissanceDTO>) {
  return apiFetch(`/declarations-naissance/${id}`, { method: "PATCH", body: payload });
}
export async function deleteDeclarationNaissance(id: string) {
  return apiFetch(`/declarations-naissance/${id}`, { method: "DELETE" });
}
export async function restoreDeclarationNaissance(id: string) {
  return apiFetch(`/declarations-naissance/${id}/restore`, { method: "POST" });
}


// lib/api.ts — section Médecine (front)
export async function listMedecinesPaginated(params: {
  page?: number; per_page?: number;
  q?: string; statut?: string; patient_id?: string; visite_id?: string; soignant_id?: string | number;
  date_from?: string; date_to?: string; sort?: string;
} = {}) {
  const { page = 1, per_page = 15, q = "", statut = "", patient_id = "", visite_id = "", soignant_id = "", date_from, date_to, sort = "-date_acte" } = params;
  const qp = new URLSearchParams({ page: String(page), limit: String(per_page), sort });
  if (q.trim()) qp.set("q", q.trim());
  if (statut) qp.set("statut", statut);
  if (patient_id) qp.set("patient_id", patient_id);
  if (visite_id) qp.set("visite_id", visite_id);
  if (soignant_id !== "" && soignant_id !== null) qp.set("soignant_id", String(soignant_id));
  if (date_from) qp.set("date_from", date_from);
  if (date_to) qp.set("date_to", date_to);
  return apiFetch(`/medecines?${qp.toString()}`, { method: "GET" });
}
export async function createMedecine(payload: any) { return apiFetch(`/medecines`, { method: "POST", body: JSON.stringify(payload) }); }
export async function getMedecine(id: string) { return apiFetch(`/medecines/${id}`, { method: "GET" }); }
export async function updateMedecine(id: string, payload: any) { return apiFetch(`/medecines/${id}`, { method: "PUT", body: JSON.stringify(payload) }); }
export async function deleteMedecine(id: string) { return apiFetch(`/medecines/${id}`, { method: "DELETE" }); }

