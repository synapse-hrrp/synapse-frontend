// app/login/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Phone, Lock, Loader2, Eye, EyeOff } from "lucide-react";

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
function stripPhone(v: string) {
  return v.replace(/[\s.\-]/g, "");
}

/** Formatte visuel simple +242 XXX XXX XXX (sans impacter la valeur normalisée) */
function prettifyPhone(v: string) {
  const raw = stripPhone(v).replace(/^\+242/, ""); // retire l'indicatif pour regrouper
  const groups = raw.match(/^(\d{0,3})(\d{0,3})(\d{0,3})$/);
  if (!groups) return v;
  const parts = [groups[1], groups[2], groups[3]].filter(Boolean);
  return "+242 " + parts.join(" ");
}

/** Normalise en E.164 du Congo (+242) si possible */
function normalizeToCongo(v: string) {
  const s = stripPhone(v);
  if (s.startsWith("+242")) {
    // +242 suivi de 9 chiffres
    const rest = s.slice(4);
    if (/^\d{9}$/.test(rest)) return "+242" + rest;
    return null;
  }
  // format local: 0 + 9 chiffres -> +242 + 9 chiffres (on retire le 0)
  if (/^0\d{9}$/.test(s)) {
    return "+242" + s.slice(1);
  }
  // format direct 9 chiffres -> on suppose national sans 0
  if (/^\d{9}$/.test(s)) {
    return "+242" + s;
  }
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phoneRaw, setPhoneRaw] = useState(""); // valeur affichée (jolie)
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
    if (!norm) {
      setPhoneError("Numéro invalide. Format attendu : +242XXXXXXXXX ou 0XXXXXXXXX.");
      return null;
    }
    setPhoneError(null);
    return norm;
  }

  function handlePhoneChange(v: string) {
    // Nettoie l'entrée et reconstruit joliment
    const stripped = stripPhone(v);
    // Si l’utilisateur commence à taper en mode téléphone et que c’est vide, on préfixe +242 visuellement
    let display = stripped.startsWith("+242") ? "+" + stripped.slice(1) : stripped;
    if (!display.startsWith("+242")) {
      // autorise 0XXXXXXXXX ou 9 chiffres — l’affichage reste brut, on ajoute l’indicatif à la sortie
      display = display;
    }
    // Ajoute +242 pour l’affichage si l’utilisateur n’a rien mis
    if (display === "" || display === "0" || /^\d{1,9}$/.test(display)) {
      // affichage en joli avec +242 si au moins un chiffre
      const raw9 = display.replace(/^0/, ""); // on retire le 0 pour l’affichage groupé
      if (raw9.length > 0) {
        const padded = raw9.slice(0, 9);
        display = prettifyPhone("+242" + padded);
      }
    } else if (display.startsWith("+242")) {
      display = prettifyPhone(display);
    }
    setPhoneRaw(display);
    // Valide à la volée (facultatif, on peut relâcher si tu préfères valider au submit)
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
        if (!norm) {
          setLoading(false);
          setPhoneError("Numéro invalide. Exemple : +242060000001");
          return;
        }
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

  // Quand on passe à l’onglet Téléphone, si vide, on aide l’utilisateur
  function onSwitchMode(next: "email" | "phone") {
    setMode(next);
    if (next === "phone" && !phoneRaw) {
      setPhoneRaw("+242 ");
    }
  }

  return (
    <div className="relative min-h-screen text-slate-900 bg-green-100">
      {/* Navbar verte unie */}
      <div className="text-white">
        <div className="bg-[#1b8f3a]">
          <div className="mx-auto max-w-7xl px-4 py-2 text-xs sm:text-sm flex items-center justify-between">
            <span>République du Congo – Ministère de la Santé et de la Population</span>
            <span className="opacity-90">Brazzaville</span>
          </div>
        </div>
        <div className="h-[3px] bg-[#ffd100]" />
        <div className="h-[3px] bg-[#d91e18]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-2 md:items-center">
        {/* Colonne gauche : logo + message */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-3">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-white ring-2 ring-[#1b8f3a] shadow-sm">
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
              <h1 className="text-2xl font-semibold text-slate-900">HRRP</h1>
              <p className="text-xs text-slate-600">Portail hospitalier sécurisé</p>
            </div>
          </div>

          {/* Barre tricolore */}
          <div className="mt-3 h-1.5 w-44 rounded-full overflow-hidden ring-1 ring-black/5">
            <div className="flex h-full">
              <span className="w-1/3 bg-[#1b8f3a]" />
              <span className="w-1/3 bg-[#ffd100]" />
              <span className="w-1/3 bg-[#d91e18]" />
            </div>
          </div>

          <p className="mt-4 max-w-md text-[17px] text-slate-700">
            Connectez-vous au <b>portail hospitalier officiel de l’Hôpital de Référence Raymond Pouaty</b>.
            <br className="hidden sm:block" />
            <span className="text-slate-600 text-[15px]">
              Service demandé :
              <b className="ml-1 inline-flex items-center gap-2 rounded-full border border-[#1b8f3a]/25 bg-[#1b8f3a]/10 px-2.5 py-0.5 text-[#1b8f3a]">
                <span className="inline-block h-2 w-2 rounded-full bg-[#1b8f3a]" />
                {serviceLabel}
              </b>
            </span>
          </p>

          {/* Points clés */}
          <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-slate-700">
            <li className="rounded-xl border border-[#1b8f3a]/30 bg-[#1b8f3a]/10 px-3 py-2">🔐 Accès par rôle — superuser & personnel</li>
            <li className="rounded-xl border border-[#ffd100]/40 bg-[#ffd100]/15 px-3 py-2">🧭 Redirection automatique vers le bon service</li>
            <li className="rounded-xl border border-[#d91e18]/30 bg-[#d91e18]/10 px-3 py-2">⏳ Session limitée à l’onglet (aucune donnée persistée)</li>
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
                <span className="w-1/3 bg-[#1b8f3a]" />
                <span className="w-1/3 bg-[#ffd100]" />
                <span className="w-1/3 bg-[#d91e18]" />
              </div>
            </div>

            {error && (
              <div
                id="login-error"
                role="alert"
                className="mb-3 rounded-lg border border-[#d91e18]/30 bg-[#d91e18]/10 p-2.5 text-sm text-[#d91e18]"
              >
                {error}
              </div>
            )}

            {/* Sélecteur E-mail / Téléphone */}
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
              <button
                type="button"
                onClick={() => onSwitchMode("email")}
                className={`rounded-md px-3 py-2 font-medium transition ${
                  mode === "email" ? "bg-white shadow ring-1 ring-slate-200 text-[#1b8f3a]" : "text-slate-600 hover:bg-white/70"
                }`}
                aria-pressed={mode === "email"}
              >
                E-mail
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode("phone")}
                className={`rounded-md px-3 py-2 font-medium transition ${
                  mode === "phone" ? "bg-white shadow ring-1 ring-slate-200 text-[#1b8f3a]" : "text-slate-600 hover:bg-white/70"
                }`}
                aria-pressed={mode === "phone"}
              >
                Téléphone
              </button>
            </div>

            {/* Identifiant selon le mode */}
            {mode === "email" ? (
              <>
                <label htmlFor="email" className="mb-1 block text-xs font-medium text-slate-600">
                  Adresse e-mail
                </label>
                <div className="relative mb-3">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1b8f3a]/80" />
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    placeholder="ex : prenom.nom@hopital.cg"
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-3 text-[15px] outline-none focus:border-[#1b8f3a] focus:ring-2 focus:ring-[#1b8f3a]/20"
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
                <label htmlFor="phone" className="mb-1 block text-xs font-medium text-slate-600">
                  Numéro de téléphone (Congo)
                </label>
                <div className="relative mb-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1b8f3a]/80" />
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="+242 060 000 001"
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-3 text-[15px] outline-none focus:border-[#1b8f3a] focus:ring-2 focus:ring-[#1b8f3a]/20"
                    value={phoneRaw}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onBlur={(e) => validatePhoneForUI(e.target.value)}
                    onKeyDown={onKeyDown}
                    autoComplete="off"
                    required={mode === "phone"}
                    aria-required={mode === "phone"}
                  />
                </div>
                {phoneError && <div className="mb-2 text-xs text-[#d91e18]">{phoneError}</div>}
              </>
            )}

            {/* Mot de passe (masqué avec bascule) */}
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-slate-600">
                Mot de passe
              </label>
              <span role="status" aria-live="polite" className={`text-xs ${caps ? "text-[#d91e18]" : "text-transparent"} transition`}>
                {caps ? "CapsLock activé" : "—"}
              </span>
            </div>
            <div className="relative mb-3">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1b8f3a]/80" />
              <input
                id="password"
                ref={pwdRef}
                type={showPwd ? "text" : "password"}
                placeholder="Saisir votre mot de passe"
                className={`w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 py-3 text-[15px] outline-none focus:border-[#1b8f3a] focus:ring-2 ${caps ? "ring-[#d91e18]/20" : "focus:ring-[#1b8f3a]/20"}`}
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100"
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
                ? "bg-[#1b8f3a]/70 cursor-not-allowed"
                : "bg-[#1b8f3a] hover:bg-[#177a31] focus:outline-none focus:ring-2 focus:ring-[#1b8f3a]/30"}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Connexion…
                </span>
              ) : "Se connecter"}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              Aucune donnée n’est mémorisée. La session se termine à la fermeture de l’onglet.
            </p>
          </form>

          {/* Encart institutionnel */}
          <div className="mt-6 text-center text-[13px] text-slate-600">
            <span className="font-semibold text-[#1b8f3a]">
              Hôpital de Référence Raymond Pouaty | Brazzaville
            </span>{" "}
            — Portail sécurisé des services
          </div>
        </div>
      </div>
    </div>
  );
}
