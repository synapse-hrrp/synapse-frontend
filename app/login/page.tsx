// app/login/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Phone, Lock, Loader2, Eye, EyeOff } from "lucide-react";

import TopIdentityBar from "@/components/TopIdentityBar";
import { login } from "@/lib/api";
import { setAuthSession } from "@/lib/authz";

/* ---------------- Helpers redirection ---------------- */

type AnyObj = Record<string, any>;

const SERVICE_NAME_TO_SLUG: Record<string, string> = {
  "Accueil / Réception": "reception",
  "Consultations": "consultations",
  "Médecine Générale": "medecine",
  "Accueil & Urgences (ARU)": "aru",
  "Laboratoire": "laboratoire",
  "Pharmacie": "pharmacie",
  "Caisse / Finance": "finance",
  "Logistique": "logistique",
  "Pansement": "pansement",
  "Kinésithérapie": "kinesitherapie",
  "Gestion des Malades (Hospitalisation)": "gestion-malade",
  "Programme Sanitaire (Tuberculose/VIH)": "sanitaire",
  "Gynécologie": "gynecologie",
  "Maternité": "maternite",
  "Pédiatrie": "pediatrie",
  "SMI (Santé Maternelle & Infantile)": "smi",
  "Bloc Opératoire": "bloc-operatoire",
  "Statistiques / Dashboard": "statistiques",
  "Répartition des Pourcentages": "pourcentage",
  "Gestion du Personnel": "personnel",
};

// pour deviner un service si on ne reçoit pas la relation service
const ROLE_TO_SLUG: Record<string, string> = {
  reception: "reception",
  medecin: "consultations",
  infirmier: "pansement",
  laborantin: "laboratoire",
  pharmacien: "pharmacie",
  caissier: "finance",
  gestionnaire: "statistiques",
};

function getRoleNames(user: AnyObj): string[] {
  const raw = user?.roles ?? [];
  return raw
    .map((r: any) => (typeof r === "string" ? r : r?.name))
    .filter(Boolean);
}
function getPermNames(user: AnyObj): Set<string> {
  const pools = [user?.permissions, user?.perms, user?.abilities, user?.scopes].filter(Boolean);
  const names = pools.flatMap((arr: any[]) =>
    (Array.isArray(arr) ? arr : []).map((p: any) => (typeof p === "string" ? p : p?.name)).filter(Boolean)
  );
  return new Set(names);
}

function serviceSlugToPath(slug?: string | null): string | null {
  if (!slug) return null;
  // exceptions d’URL côté front
  if (slug === "finance") return "/caisse";
  if (slug === "personnel") return "/personnels";
  return `/${slug}`;
}

/** Vérifie et "nettoie" ?next= pour éviter le contournement des règles d'accès */
function safeNext(user: AnyObj, nextUrl: string): string | null {
  if (!nextUrl) return null;
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(nextUrl, base);

    // 1) Interne uniquement
    if (url.origin !== base) return null;

    // 2) /portail réservé aux admin/dg
    const roles = getRoleNames(user).map((r) => String(r).toLowerCase());
    const isAdmin = roles.includes("admin") || roles.includes("dg");
    if (!isAdmin && url.pathname === "/portail") return null;

    // OK
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

function computeRedirect(user: AnyObj, requestedService: string, nextUrl: string): string {
  // Tente d'abord un next sécurisé
  const nextSafe = safeNext(user, nextUrl);
  if (nextSafe) return nextSafe;

  const roles = getRoleNames(user).map((r) => String(r).toLowerCase());
  const isAdmin = roles.includes("admin") || roles.includes("dg");
  if (isAdmin) return "/portail";

  // 2) service directement depuis la relation personnelle -> service
  let slug =
    user?.personnel?.service?.slug ||
    SERVICE_NAME_TO_SLUG[user?.personnel?.service?.name as string];

  // 3) si l’URL a demandé un service (ex: ?service=laboratoire) et qu’on n’a rien trouvé
  if (!slug && requestedService && typeof requestedService === "string") {
    slug = requestedService;
  }

  // 4) sinon, deviner via le rôle (ex: caissier → finance)
  if (!slug) {
    for (const r of roles) {
      if (ROLE_TO_SLUG[r]) {
        slug = ROLE_TO_SLUG[r];
        break;
      }
    }
  }

  // 5) sinon, deviner via permissions
  if (!slug) {
    const perms = getPermNames(user);
    if (perms.has("labo.view") || perms.has("labo.request.create")) slug = "laboratoire";
    else if (perms.has("pharma.stock.view") || perms.has("pharma.sale.create")) slug = "pharmacie";
    else if (perms.has("finance.invoice.view") || perms.has("finance.payment.create")) slug = "finance";
    else if (perms.has("pansement.view")) slug = "pansement";
    else if (perms.has("patients.read") || perms.has("visites.read")) slug = "accueil";
  }

  // 6) non-admin : si un service a été trouvé → on y va ; sinon retour login avec message.
  const path = serviceSlugToPath(slug);
  if (path) return path;

  // ⚠️ non-admin sans service → retour login (PAS /portail)
  return "/login?error=noservice";
}

/* ---------------- Helpers UI/phone ---------------- */

const hasWindow = () => typeof window !== "undefined";

function getParam(sp: any | null, key: string) {
  try {
    const v = sp?.get?.(key);
    if (v != null) return v;
  } catch {}
  if (hasWindow())
    try {
      return new URLSearchParams(window.location.search).get(key) || "";
    } catch {}
  return "";
}

/** Nettoie pour comparaison (supprime espaces, points, tirets) */
function stripPhone(v: string) {
  return v.replace(/[\s.\-]/g, "");
}

/** Formatte visuel simple +242 XXX XXX XXX (sans impacter la valeur normalisée) */
function prettifyPhone(v: string) {
  const raw = stripPhone(v).replace(/^\+242/, "");
  const groups = raw.match(/^(\d{0,3})(\d{0,3})(\d{0,3})$/);
  if (!groups) return v;
  const parts = [groups[1], groups[2], groups[3]].filter(Boolean);
  return "+242 " + parts.join(" ");
}

/** Normalise en E.164 du Congo (+242) si possible */
function normalizeToCongo(v: string) {
  const s = stripPhone(v);
  if (s.startsWith("+242")) {
    const rest = s.slice(4);
    if (/^\d{9}$/.test(rest)) return "+242" + rest;
    return null;
  }
  if (/^0\d{9}$/.test(s)) return "+242" + s.slice(1);
  if (/^\d{9}$/.test(s)) return "+242" + s;
  return null;
}

/* ---------------- Page ---------------- */

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [caps, setCaps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const pwdRef = useRef<HTMLInputElement | null>(null);

  const requestedService = useMemo(
    () => (getParam(sp as any, "service") || "").toLowerCase(),
    [sp]
  );
  const nextUrl = useMemo(() => getParam(sp as any, "next") || "", [sp]);
  const serviceLabel = requestedService || "(sélection automatique)";

  // Afficher un message lorsqu'on revient ici sans service associé
  useEffect(() => {
    const err = getParam(sp as any, "error");
    if (err === "noservice") {
      setError("Votre compte n'est associé à aucun service. Veuillez contacter l'administrateur.");
    }
  }, [sp]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // CapsLock
    if ((e as any).getModifierState && (e as any).getModifierState("CapsLock") !== undefined) {
      setCaps((e as any).getModifierState("CapsLock"));
    }
    if (e.key === "Enter") handleLogin();
  }

  function validatePhoneForUI(v: string) {
    const norm = normalizeToCongo(v);
    if (!norm) {
      setPhoneError("Numéro invalide. Format attendu : +242XXXXXXXXX ou 0XXXXXXXXX.");
      return null;
    }
    setPhoneError(null);
    return norm;
  }

  function handlePhoneChange(v: string) {
    const stripped = stripPhone(v);
    let display = stripped.startsWith("+242") ? "+" + stripped.slice(1) : stripped;
    if (display === "" || display === "0" || /^\d{1,9}$/.test(display)) {
      const raw9 = display.replace(/^0/, "");
      if (raw9.length > 0) display = prettifyPhone("+242" + raw9.slice(0, 9));
    } else if (display.startsWith("+242")) {
      display = prettifyPhone(display);
    }
    setPhoneRaw(display);
    if (display.trim()) validatePhoneForUI(display);
  }

    const canSubmit =
      mode === "email"
        ? !!email && !!password
        : !!normalizeToCongo(phoneRaw) && !!password && !phoneError;

    async function handleLogin() {
    setError(null);
    setLoading(true);

    try {
      let data: { token: string; user: any };
      if (mode === "email") {
        data = await login({ mode: "email", email: email.trim(), password });
      } else {
        const norm = normalizeToCongo(phoneRaw || "");
        if (!norm) {
          setLoading(false);
          setPhoneError("Numéro invalide. Exemple : +242060000001");
          return;
        }
        data = await login({ mode: "phone", phone: norm, password });
      }

      // ✅ on persiste la session proprement
      setAuthSession(data.token, data.user);

      // ta logique existante de redirection (admin → /portail, sinon → service)
      const target = computeRedirect(data.user, requestedService, nextUrl);
      setLoading(false);
      window.location.replace(target);
    } catch (e: any) {
      setLoading(false);
      setError(e?.message || "Identifiant ou mot de passe incorrect.");
      setPassword("");
      requestAnimationFrame(() => pwdRef.current?.focus());
    }
  }


  function onSwitchMode(next: "email" | "phone") {
    setMode(next);
    if (next === "phone" && !phoneRaw) setPhoneRaw("+242 ");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />

      <main className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-2 md:items-center">
        {/* Colonne gauche : logo + message */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-3">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-white ring-2 ring-congo-green shadow-sm">
              <Image
                src="/hopital.png"
                alt="Logo Hôpital"
                fill
                className="object-contain p-2"
                sizes="96px"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">
                <span className="text-green-600">H</span>
                <span className="text-yellow-500">R</span>
                <span className="text-yellow-500">R</span>
                <span className="text-red-600">P</span>
              </h1>
              <p className="text-xs text-ink-600">Portail hospitalier sécurisé</p>
            </div>
          </div>

          <div className="mt-3 h-1.5 w-44 rounded-full overflow-hidden ring-1 ring-black/5">
            <div className="flex h-full">
              <span className="w-1/3 bg-congo-green" />
              <span className="w-1/3 bg-congo-yellow" />
              <span className="w-1/3 bg-congo-red" />
            </div>
          </div>

          <p className="mt-4 max-w-md text-[17px] text-ink-700">
            Connectez-vous au <b>portail hospitalier officiel de l’Hôpital de Référence Raymond Pouaty | Ex-Hôpital des Lépreux. </b>.
            <br className="hidden sm:block" />
            <span className="text-ink-600 text-[15px]">
              Service demandé :
              <b className="ml-1 inline-flex items-center gap-2 rounded-full border border-congo-green/25 bg-congo-greenL px-2.5 py-0.5 text-congo-green">
                <span className="inline-block h-2 w-2 rounded-full bg-congo-green" />
                {requestedService || "(sélection automatique)"}
              </b>
            </span>
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-ink-700">
            <li className="rounded-xl border border-congo-green/30 bg-congo-greenL px-3 py-2">🔐 Accès par rôle — admin & personnel</li>
            <li className="rounded-xl border border-congo-yellow/40 bg-[color:var(--color-congo-yellow)]/15 px-3 py-2">🧭 Redirection automatique vers le bon service</li>
            <li className="rounded-xl border border-congo-red/30 bg-[color:var(--color-congo-red)]/10 px-3 py-2">⏳ Session limitée à l’onglet (aucune donnée persistée)</li>
          </ul>
        </div>

        {/* Colonne droite : carte de connexion */}
        <div className="mx-auto w-full max-w-sm">
          <form
            autoComplete="off"
            onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
            className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
            aria-describedby={error ? "login-error" : undefined}
          >
            <div className="-mx-5 -mt-5 mb-4 h-1.5 rounded-t-2xl overflow-hidden">
              <div className="flex h-full">
                <span className="w-1/3 bg-congo-green" />
                <span className="w-1/3 bg-congo-yellow" />
                <span className="w-1/3 bg-congo-red" />
              </div>
            </div>

            {error && (
              <div id="login-error" role="alert" className="mb-3 rounded-lg border border-congo-red/30 bg-[color:var(--color-congo-red)]/10 p-2.5 text-sm text-congo-red">
                {error}
              </div>
            )}

            {/* Sélecteur E-mail / Téléphone */}
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-ink-100 p-1 text-sm">
              <button
                type="button"
                onClick={() => onSwitchMode("email")}
                className={`rounded-md px-3 py-2 font-medium transition ${
                  mode === "email" ? "bg-white shadow ring-1 ring-ink-200 text-congo-green" : "text-ink-600 hover:bg-white/70"
                }`}
                aria-pressed={mode === "email"}
              >
                E-mail
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode("phone")}
                className={`rounded-md px-3 py-2 font-medium transition ${
                  mode === "phone" ? "bg-white shadow ring-1 ring-ink-200 text-congo-green" : "text-ink-600 hover:bg-white/70"
                }`}
                aria-pressed={mode === "phone"}
              >
                Téléphone
              </button>
            </div>

            {/* Identifiant */}
            {mode === "email" ? (
              <>
                <label htmlFor="email" className="mb-1 block text-xs font-medium text-ink-600">Adresse e-mail</label>
                <div className="relative mb-3">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-congo-green/80" />
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    placeholder="ex : prenom.nom@hopital.cg"
                    className="w-full rounded-lg border border-ink-200 bg-white pl-10 pr-3 py-3 text-[15px] outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={onKeyDown}
                    autoComplete="off"
                    required={mode === "email"}
                    aria-required={mode === "email"}
                  />
                </div>
              </>
            ) : (
              <>
                <label htmlFor="phone" className="mb-1 block text-xs font-medium text-ink-600">Numéro de téléphone (Congo)</label>
                <div className="relative mb-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-congo-green/80" />
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="+242 060 000 001"
                    className="w-full rounded-lg border border-ink-200 bg-white pl-10 pr-3 py-3 text-[15px] outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
                    value={phoneRaw}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onBlur={(e) => validatePhoneForUI(e.target.value)}
                    onKeyDown={onKeyDown}
                    autoComplete="off"
                    required={mode === "phone"}
                    aria-required={mode === "phone"}
                  />
                </div>
                {phoneError && <div className="mb-2 text-xs text-congo-red">{phoneError}</div>}
              </>
            )}

            {/* Mot de passe */}
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-ink-600">Mot de passe</label>
              <span role="status" aria-live="polite" className={`text-xs ${caps ? "text-congo-red" : "text-transparent"} transition`}>
                {caps ? "CapsLock activé" : "—"}
              </span>
            </div>
            <div className="relative mb-3">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-congo-green/80" />
              <input
                id="password"
                ref={pwdRef}
                type={showPwd ? "text" : "password"}
                placeholder="Saisir votre mot de passe"
                className={`w-full rounded-lg border border-ink-200 bg-white pl-10 pr-10 py-3 text-[15px] outline-none focus:border-congo-green focus:ring-2 ${
                  caps ? "ring-congo-red/20" : "focus:ring-congo-green/20"
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                required
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-500 hover:bg-ink-100"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className={`mb-3 w-full rounded-lg px-4 py-3 text-[15px] font-semibold text-white transition
              ${loading || !canSubmit ? "bg-congo-green/70 cursor-not-allowed" : "bg-congo-green hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-congo-green/30"}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Connexion…
                </span>
              ) : (
                "Se connecter"
              )}
            </button>

            <p className="mt-3 text-center text-xs text-ink-500">
              Aucune donnée n’est mémorisée. La session se termine à la fermeture de l’onglet.
            </p>
          </form>

          <div className="mt-6 text-center text-[13px] text-ink-600">
            <span className="font-semibold text-congo-green">
              Hôpital de Référence Raymond Pouaty | Brazzaville
            </span>{" "}
            — Portail sécurisé des services
          </div>
        </div>
      </main>
    </div>
  );
}
