// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Bell, LogOut } from "lucide-react";
import TriStripe from "./TriStripe";
import { logoutAndRedirect } from "@/lib/authz";

type Props = {
  logoSrc?: string;
  title?: string;
  subtitle?: string;
  homeHref?: string;
  avatarSrc?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  showBell?: boolean;
  onLogout?: () => void; // si fourni on l’utilise, sinon logout global
  rightSlot?: React.ReactNode;
  showStripe?: boolean;
};

export default function SiteHeader({
  logoSrc = "/logo-hospitals.png",
  title = "Portail Administratif",
  subtitle = "Hôpital de Référence Raymond Pouaty",
  homeHref = "/portail",
  avatarSrc = "/images/default-avatar.png",
  showSearch = true,
  searchPlaceholder = "Rechercher un patient, un dossier, un service…",
  onSearch,
  showBell = true,
  onLogout,
  rightSlot,
  showStripe = true,
}: Props) {

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
              <Image src={logoSrc} alt="Logo" width={40} height={40} className="h-full w-full object-contain p-1.5" priority />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-ink-900">{title}</div>
              {subtitle && <div className="text-xs text-ink-500">{subtitle}</div>}
            </div>
          </Link>

          {/* Recherche (optionnelle) */}
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

          {/* Zone actions droite */}
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

            {/* Avatar */}
            <button
              className="rounded-full p-[2px] focus:outline-none focus:ring-2 focus:ring-congo-green/30 hover:ring-2 hover:ring-congo-green/50"
              aria-label="Profil"
            >
              <Image src={avatarSrc} alt="Profil utilisateur" width={32} height={32} className="rounded-full object-cover" />
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
