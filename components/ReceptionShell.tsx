// components/ReceptionShell.tsx
"use client";

import React, { createContext, useContext, useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, ClipboardList, BarChart3 } from "lucide-react";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type AnyObj = Record<string, any>;
type Caps = {
  isAdmin: boolean;
  patients: { read: boolean; write: boolean; create: boolean; del: boolean; edit: boolean };
  visites:  { read: boolean; write: boolean; create: boolean; del: boolean; edit: boolean };
  stats:    { view: boolean };
};

const ReceptionCtx = createContext<{ caps: Caps }>({
  caps: {
    isAdmin: false,
    patients: { read: false, write: false, create: false, del: false, edit: false },
    visites:  { read: false, write: false, create: false, del: false, edit: false },
    stats:    { view: false },
  },
});
export const useReception = () => useContext(ReceptionCtx);

// ----- helpers session (inchangés) -----
function getSessionUser(): AnyObj | null {
  try { const raw = sessionStorage.getItem("auth:user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function getRoleNames(user: AnyObj): string[] {
  const raw = user?.roles ?? [];
  return (Array.isArray(raw) ? raw : [])
    .map((r: any) => (typeof r === "string" ? r : r?.name))
    .filter(Boolean)
    .map((s: string) => s.toLowerCase());
}
function buildCaps(roles: string[]): Caps {
  const isAdmin = roles.includes("admin") || roles.includes("dg");
  if (isAdmin) {
    return {
      isAdmin: true,
      patients: { read: true, write: true, create: true, del: true,  edit: true },
      visites:  { read: true, write: true, create: true, del: true,  edit: true },
      stats:    { view: true },
    };
  }
  const isReception = roles.includes("reception");
  if (isReception) {
    return {
      isAdmin: false,
      patients: { read: true, write: true, create: true, del: false, edit: true },
      visites:  { read: true, write: true, create: true, del: false, edit: true },
      stats:    { view: true },
    };
  }
  return {
    isAdmin: false,
    patients: { read: false, write: false, create: false, del: false, edit: false },
    visites:  { read: false, write: false, create: false, del: false, edit: false },
    stats:    { view: false },
  };
}

export default function ReceptionShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [caps, setCaps] = useState<Caps>(() => buildCaps([]));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("auth:token");
    if (!token) { router.replace("/login?next=/reception"); return; }

    const u = getSessionUser();
    if (!u)    { router.replace("/login?next=/reception"); return; }

    const roles = getRoleNames(u);
    const nextCaps = buildCaps(roles);
    setCaps(nextCaps);

    if (!nextCaps.isAdmin && !roles.includes("reception")) {
      router.replace("/portail"); // non autorisé → portail
      return;
    }
    setReady(true);
  }, [router]);

  const active = useMemo(() => {
    if (!pathname) return "patients";
    if (pathname.startsWith("/reception/visites"))  return "visites";
    if (pathname.startsWith("/reception/stats"))    return "stats";
    return "patients";
  }, [pathname]);

  if (!ready) return null;

  return (
    <ReceptionCtx.Provider value={{ caps }}>
      <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
        <TopIdentityBar />
        {/* ⬇️ avatar dynamique: on ne passe plus avatarSrc */}
        <SiteHeader title="Réception" subtitle="Accueil, dossiers et admissions" logoSrc="/logo-hospital.png" />

        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar */}
            <aside className="lg:col-span-3">
              <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden">
                <div className="h-1 bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
                <div className="p-3">
                  <div className="text-xs font-semibold text-ink-700 mb-2">Applications Réception</div>
                  <nav className="space-y-1" aria-label="Apps réception">
                    {caps.patients.read && (
                      <SideItem href="/reception/patients" icon={<Users className="h-4 w-4" />} label="Patients" active={active==="patients"} />
                    )}
                    {caps.visites.read && (
                      <SideItem href="/reception/visites" icon={<ClipboardList className="h-4 w-4" />} label="Admissions" active={active==="visites"} />
                    )}
                    {caps.stats.view && (
                      <SideItem href="/reception/stats" icon={<BarChart3 className="h-4 w-4" />} label="Statistiques" active={active==="stats"} />
                    )}
                  </nav>
                </div>
              </div>
            </aside>

            {/* Contenu */}
            <section className="lg:col-span-9 space-y-6">
              {children}
            </section>
          </div>
        </main>

        <SiteFooter />
      </div>
    </ReceptionCtx.Provider>
  );
}

function SideItem({ href, icon, label, active }:{
  href:string; icon:React.ReactNode; label:string; active?:boolean;
}) {
  return (
    <Link
      href={href}
      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
        active ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/30" : "text-ink-700 hover:bg-ink-50"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className={`h-6 w-6 rounded-lg flex items-center justify-center ${
        active ? "bg-congo-green text-white" : "bg-ink-100 text-ink-700"
      }`}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}
