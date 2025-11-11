"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Search, Bell, LogOut } from "lucide-react";
import TriStripe from "./TriStripe";
import { logoutAndRedirect, setAuthSession } from "@/lib/authz";

/* ---------- Types ---------- */
type Props = {
  logoSrc?: string;
  title?: string;
  subtitle?: string;
  homeHref?: string;
  /** Si fourni on force cet avatar, sinon on prend celui du user connecté. */
  avatarSrc?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  showBell?: boolean;
  onLogout?: () => void;
  rightSlot?: React.ReactNode;
  showStripe?: boolean;
};
type AnyObj = Record<string, any>;

/* ---------- Session helpers ---------- */
function getSessionUser(): AnyObj | null {
  try {
    const raw = sessionStorage.getItem("auth:user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ---------- Bases d’URL robustes (même sans .env) ---------- */
function getApiBase(): string {
  // Cas idéal: ex. "http://localhost:8000/api/v1"
  const env = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/,"");
  if (env) return env;
  // Fallback sûr: on préfixe /api/v1 (reverse proxy habituel Next → Laravel)
  return "/api/v1";
}
function getAssetBase(): string {
  // Idéal: NEXT_PUBLIC_ASSET_BASE = "http://localhost:8000"
  const env = (process.env.NEXT_PUBLIC_ASSET_BASE || "").replace(/\/+$/,"");
  if (env) return env;
  // Sinon, si NEXT_PUBLIC_API_BASE existe, on enlève le suffixe /api(/vX)?
  const rawApi = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/,"");
  if (rawApi) return rawApi.replace(/\/api(\/v\d+)?$/i, "");
  // Dernier filet: même origine que le front (utile si Nginx sert /storage)
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/* ---------- URL publique pour assets ---------- */
function publicUrlMaybe(path?: string | null) {
  if (!path) return "";
  let p = String(path).trim();
  if (!p) return "";
  if (/^(https?:)?\/\//i.test(p) || p.startsWith("blob:") || p.startsWith("data:")) return p;
  if (!p.startsWith("/")) p = "/" + p;
  return `${getAssetBase()}${p}`;
}

function initialsOf(user?: AnyObj) {
  const ln = (user?.last_name ?? user?.personnel?.last_name ?? user?.name ?? "").toString().trim();
  const fn = (user?.first_name ?? user?.personnel?.first_name ?? "").toString().trim();
  const a = (ln[0] || "").toUpperCase();
  const b = (fn[0] || "").toUpperCase();
  return (a + b) || "U";
}

export default function SiteHeader({
  logoSrc = "/logo-hospitals.png",
  title = "Portail Administratif",
  subtitle = "Hôpital de Référence Raymond Pouaty",
  homeHref = "/portail",
  avatarSrc,
  showSearch = true,
  searchPlaceholder = "Rechercher un patient, un dossier, un service…",
  onSearch,
  showBell = true,
  onLogout,
  rightSlot,
  showStripe = true,
}: Props) {
  const [autoAvatar, setAutoAvatar] = useState<string>("");
  const [user, setUser] = useState<AnyObj | null>(null);
  const [imgOk, setImgOk] = useState<boolean>(true);

  // 1) Essaye depuis la session
  useEffect(() => {
    const u = getSessionUser();
    setUser(u);

    const fromPersonnel = u?.personnel?.avatar_path || u?.personnel?.avatar || u?.personnel?.photo;
    const fromUser = u?.avatar_path || u?.avatar || u?.photo;
    const chosen = fromPersonnel || fromUser || "";
    const url = publicUrlMaybe(chosen);
    setAutoAvatar(url || "");
    setImgOk(Boolean(url));
  }, []);

  // 2) Fallback: si pas d’avatar → fetch /api/v1/auth/me (et pas /auth/me)
  useEffect(() => {
    if (autoAvatar) return; // déjà OK
    const token = typeof window !== "undefined" ? sessionStorage.getItem("auth:token") : null;
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return; // évite 404/401
        const me = await res.json();

        // Met à jour la session user (y compris personnel.avatar_path)
        const current = getSessionUser() || {};
        const merged = { ...current, ...me };
        setAuthSession(token, merged);
        setUser(merged);

        const fromPersonnel = merged?.personnel?.avatar_path || merged?.personnel?.avatar || merged?.personnel?.photo;
        const fromUser = merged?.avatar_path || merged?.avatar || merged?.photo;
        const chosen = fromPersonnel || fromUser || "";
        const url = publicUrlMaybe(chosen);
        setAutoAvatar(url || "");
        setImgOk(Boolean(url));
      } catch {
        // ignore
      }
    })();
  }, [autoAvatar]);

  const effectiveAvatar = useMemo(() => avatarSrc || autoAvatar || "", [avatarSrc, autoAvatar]);
  const initials = useMemo(() => initialsOf(user || {}), [user]);

  async function handleLogout() {
    if (onLogout) return onLogout();
    logoutAndRedirect("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto max-w-7xl px-4">
        <div className="h-16 flex items-center gap-4">
          {/* Logo + titre */}
          <Link href={homeHref} className="flex items-center gap-3 group">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-ink-100 ring-1 ring-ink-100 shadow-sm">
              <Image
                src={logoSrc}
                alt="Logo"
                width={40}
                height={40}
                className="h-full w-full object-contain p-1.5"
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-ink-900">{title}</div>
              {subtitle && <div className="text-xs text-ink-500">{subtitle}</div>}
            </div>
          </Link>

          {/* Recherche */}
          {showSearch && (
            <div className="ml-auto hidden md:flex items-center w-96">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
                <input
                  type="search"
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-ink-100 bg-white pl-10 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && onSearch) {
                      onSearch((e.target as HTMLInputElement).value.trim());
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions droite */}
          <div className={`ml-2 flex items-center gap-2 ${showSearch ? "" : "ml-auto"}`}>
            {rightSlot}

            {showBell && (
              <button
                className="relative rounded-lg p-2 text-ink-700 hover:bg-ink-100 focus:outline-none focus:ring-2 focus:ring-congo-green/30"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-congo-red" />
              </button>
            )}

            {/* Avatar: image si OK, sinon initiales (pas de 404) */}
            <button
              className="rounded-full p-[2px] focus:outline-none focus:ring-2 focus:ring-congo-green/30 hover:ring-2 hover:ring-congo-green/50"
              aria-label="Profil utilisateur"
              title="Profil utilisateur"
            >
              {effectiveAvatar && imgOk ? (
                <img
                  src={effectiveAvatar}
                  alt="Profil utilisateur"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setImgOk(false)}
                />
              ) : (
                <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-semibold bg-ink-200 text-ink-700">
                  {initials}
                </div>
              )}
            </button>

            {/* Déconnexion */}
            <button
              className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-white text-ink-700 border border-ink-100 px-3 py-2 text-sm hover:bg-ink-100 focus:outline-none focus:ring-2 focus:ring-congo-green/30"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {showStripe && <TriStripe />}
    </header>
  );
}
