// app/login/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Phone, Lock, Loader2, Eye, EyeOff } from "lucide-react";

// ⬇️ On importe les éléments communs
import TopIdentityBar from "@/components/TopIdentityBar";

type Role = "superuser" | "staff";
type DemoUser = {
  email: string;
  phone?: string; // E.164 attendu: +242XXXXXXXXX
  password: string;
  role: Role;
  service: string;
};

const demoUsers: DemoUser[] = [
  { email: "admin@hopital.cg",  phone: "+242060000001", password: "1234", role: "superuser", service: "*" },
  { email: "pharma@hopital.cg", phone: "+242060000002", password: "1234", role: "staff",     service: "pharmacie" },
  { email: "labo@hopital.cg",   phone: "+242060000003", password: "1234", role: "staff",      service: "laboratoire" },
  { email: "caisse@hopital.cg", phone: "+242060000004", password: "1234", role: "staff",      service: "caisse" },
];

const hasWindow = () => typeof window !== "undefined";
const sset = (k: string, v: string) => { if (hasWindow()) try { sessionStorage.setItem(k, v); } catch {} };

function getParam(sp: any | null, key: string) {
  try { const v = sp?.get?.(key); if (v != null) return v; } catch {}
  if (hasWindow()) try { return new URLSearchParams(window.location.search).get(key) || ""; } catch {}
  return "";
}

function computeRedirect(user: DemoUser, _requestedService: string, nextUrl: string) {
  if (nextUrl) return nextUrl;
  if (user.role === "superuser") return "/portail";
  return `/${user.service}`;
}

/** Nettoie pour comparaison (supprime espaces, points, tirets) */
function stripPhone(v: string) { return v.replace(/[\s.\-]/g, ""); }

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

  const requestedService = useMemo(() => (getParam(sp as any, "service") || "").toLowerCase(), [sp]);
  const nextUrl          = useMemo(() => getParam(sp as any, "next") || "", [sp]);
  const serviceLabel     = requestedService || "(sélection automatique)";

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e as any).getModifierState && (e as any).getModifierState("CapsLock") !== undefined) {
      setCaps((e as any).getModifierState("CapsLock"));
    }
    if (e.key === "Enter") handleLogin();
  }

  function validatePhoneForUI(v: string) {
    const norm = normalizeToCongo(v);
    if (!norm) { setPhoneError("Numéro invalide. Format attendu : +242XXXXXXXXX ou 0XXXXXXXXX."); return null; }
    setPhoneError(null); return norm;
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

  const canSubmit = mode === "email"
    ? !!email && !!password
    : !!normalizeToCongo(phoneRaw) && !!password && !phoneError;

  function handleLogin() {
    setError(null);
    setLoading(true);

    setTimeout(() => {
      let user: DemoUser | undefined;
      if (mode === "email") {
        const id = email.trim();
        user = demoUsers.find(u => u.email === id && u.password === password);
      } else {
        const norm = normalizeToCongo(phoneRaw || "");
        if (!norm) { setLoading(false); setPhoneError("Numéro invalide. Exemple : +242060000001"); return; }
        user = demoUsers.find(u => stripPhone(u.phone || "") === stripPhone(norm) && u.password === password);
      }

      if (!user) {
        setLoading(false);
        setError("Identifiant ou mot de passe incorrect.");
        setPassword("");
        requestAnimationFrame(() => pwdRef.current?.focus());
        return;
      }

      if (user.role === "superuser") sset("auth:token:superuser", "ok");
      else sset(`auth:token:${user.service}`, "ok");

      sset("auth:session", JSON.stringify({
        identifier: mode === "email" ? email.trim() : normalizeToCongo(phoneRaw),
        mode,
        email: user.email,
        phone: user.phone,
        role: user.role,
        service: user.service,
      }));

      const target = computeRedirect(user, requestedService, nextUrl);
      setLoading(false);
      router.replace(target);
    }, 250);
  }

  function onSwitchMode(next: "email" | "phone") {
    setMode(next);
    if (next === "phone" && !phoneRaw) setPhoneRaw("+242 ");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      {/* ⬇️ Héritage des barres/entête/footers communs */}
      <TopIdentityBar />

      {/* Contenu spécifique Login */}
      <main className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-2 md:items-center">
        {/* Colonne gauche : logo + message */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-3">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-white ring-2 ring-congo-green shadow-sm">
              <Image
                src="/logo-hospital.png"
                alt="Logo Hôpital"
                fill
                className="object-contain p-2"
                sizes="96px"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-ink-900">HRRP</h1>
              <p className="text-xs text-ink-600">Portail hospitalier sécurisé</p>
            </div>
          </div>

          {/* Barre tricolore (petit rappel visuel) */}
          <div className="mt-3 h-1.5 w-44 rounded-full overflow-hidden ring-1 ring-black/5">
            <div className="flex h-full">
              <span className="w-1/3 bg-congo-green" />
              <span className="w-1/3 bg-congo-yellow" />
              <span className="w-1/3 bg-congo-red" />
            </div>
          </div>

          <p className="mt-4 max-w-md text-[17px] text-ink-700">
            Connectez-vous au <b>portail hospitalier officiel de l’Hôpital de Référence Raymond Pouaty</b>.
            <br className="hidden sm:block" />
            <span className="text-ink-600 text-[15px]">
              Service demandé :
              <b className="ml-1 inline-flex items-center gap-2 rounded-full border border-congo-green/25 bg-congo-greenL px-2.5 py-0.5 text-congo-green">
                <span className="inline-block h-2 w-2 rounded-full bg-congo-green" />
                {serviceLabel}
              </b>
            </span>
          </p>

          {/* Points clés */}
          <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-ink-700">
            <li className="rounded-xl border border-congo-green/30 bg-congo-greenL px-3 py-2">🔐 Accès par rôle — superuser & personnel</li>
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
            {/* Liseré haut tricolore */}
            <div className="-mx-5 -mt-5 mb-4 h-1.5 rounded-t-2xl overflow-hidden">
              <div className="flex h-full">
                <span className="w-1/3 bg-congo-green" />
                <span className="w-1/3 bg-congo-yellow" />
                <span className="w-1/3 bg-congo-red" />
              </div>
            </div>

            {error && (
              <div
                id="login-error"
                role="alert"
                className="mb-3 rounded-lg border border-congo-red/30 bg-[color:var(--color-congo-red)]/10 p-2.5 text-sm text-congo-red"
              >
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

            {/* Identifiant selon le mode */}
            {mode === "email" ? (
              <>
                <label htmlFor="email" className="mb-1 block text-xs font-medium text-ink-600">
                  Adresse e-mail
                </label>
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
                <label htmlFor="phone" className="mb-1 block text-xs font-medium text-ink-600">
                  Numéro de téléphone (Congo)
                </label>
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

            {/* Mot de passe (bascule œil) */}
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-ink-600">
                Mot de passe
              </label>
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
                className={`w-full rounded-lg border border-ink-200 bg-white pl-10 pr-10 py-3 text-[15px] outline-none focus:border-congo-green focus:ring-2 ${caps ? "ring-congo-red/20" : "focus:ring-congo-green/20"}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                required
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-500 hover:bg-ink-100"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* CTA principal */}
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className={`mb-3 w-full rounded-lg px-4 py-3 text-[15px] font-semibold text-white transition
              ${loading || !canSubmit
                ? "bg-congo-green/70 cursor-not-allowed"
                : "bg-congo-green hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-congo-green/30"}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Connexion…
                </span>
              ) : "Se connecter"}
            </button>

            <p className="mt-3 text-center text-xs text-ink-500">
              Aucune donnée n’est mémorisée. La session se termine à la fermeture de l’onglet.
            </p>
          </form>

          {/* Encart institutionnel */}
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
