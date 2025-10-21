"use client";

import React, { createContext, useContext, useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, Microscope, BarChart3, ClipboardCheck } from "lucide-react";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type AnyObj = Record<string, any>;
type Caps = {
  isAdmin: boolean;
  examens: { view: boolean; requestCreate: boolean; resultWrite: boolean };
  visites: { read: boolean };
  stats:   { view: boolean };
};

const LabCtx = createContext<{ caps: Caps }>({
  caps: {
    isAdmin: false,
    examens: { view: false, requestCreate: false, resultWrite: false },
    visites: { read: false },
    stats:   { view: false },
  },
});
export const useLaboratoire = () => useContext(LabCtx);

/* --- helpers session (même logique que réception, mais on lit aussi les permissions) --- */
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
function getPermNames(user: AnyObj): Set<string> {
  const pools = [user?.permissions, user?.perms, user?.abilities, user?.scopes].filter(Boolean);
  const names = pools.flatMap((arr: any[]) =>
    (Array.isArray(arr) ? arr : []).map((p: any) => (typeof p === "string" ? p : p?.name)).filter(Boolean)
  );
  return new Set(names.map((s: string) => s.toLowerCase()));
}

function buildCaps(roles: string[], perms: Set<string>): Caps {
  const isAdmin = roles.includes("admin") || roles.includes("dg");

  const examensView   = isAdmin || perms.has("examen.view");
  const examensCreate = isAdmin || perms.has("examen.request.create");
  const resultWrite   = isAdmin || perms.has("examen.result.write");
  const statsView     = isAdmin || perms.has("stats.view");

  // ⛔ Désactivé dans l'appli Labo (même si l'utilisateur a la perm globale visites.read)
  const visitesRead   = false;

  return {
    isAdmin,
    examens: { view: examensView, requestCreate: examensCreate, resultWrite },
    visites: { read: visitesRead },
    stats:   { view: statsView },
  };
}


export default function LabShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [caps, setCaps] = useState<Caps>(() => buildCaps([], new Set()));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("auth:token");
    if (!token) { router.replace("/login?next=/laboratoire"); return; }

    const u = getSessionUser();
    if (!u)    { router.replace("/login?next=/laboratoire"); return; }

    const roles = getRoleNames(u);
    const perms = getPermNames(u);
    const nextCaps = buildCaps(roles, perms);
    setCaps(nextCaps);

    // garde d’accès : admin, laborantin, ou quiconque a au moins une perm labo
    const isLaborantin = roles.includes("laborantin");
    const hasAnyLabPerm = nextCaps.examens.view || nextCaps.examens.requestCreate || nextCaps.examens.resultWrite || nextCaps.stats.view || nextCaps.visites.read;
    if (!nextCaps.isAdmin && !isLaborantin && !hasAnyLabPerm) {
      router.replace("/portail");
      return;
    }
    setReady(true);
  }, [router]);

  const active = useMemo(() => {
    if (!pathname) return "examens";
    if (pathname.startsWith("/laboratoire/visites")) return "visites";
    if (pathname.startsWith("/laboratoire/stats"))   return "stats";
    return "examens";
  }, [pathname]);

  if (!ready) return null;

  return (
    <LabCtx.Provider value={{ caps }}>
      <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
        <TopIdentityBar />
        <SiteHeader title="Laboratoire" subtitle="Examens, comptes-rendus et statistiques" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar */}
            <aside className="lg:col-span-3">
              <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden">
                <div className="h-1 bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
                <div className="p-3">
                  <div className="text-xs font-semibold text-ink-700 mb-2">Applications Laboratoire</div>
                  <nav className="space-y-1" aria-label="Apps laboratoire">
                    {(caps.examens.view || caps.examens.requestCreate || caps.examens.resultWrite) && (
                      <SideItem href="/laboratoire/examens" icon={<Microscope className="h-4 w-4" />} label="Examens" active={active==="examens"} />
                    )}
                    {caps.visites.read && (
                      <SideItem href="/laboratoire/visites" icon={<ClipboardList className="h-4 w-4" />} label="Visites" active={active==="visites"} />
                    )}
                    {caps.stats.view && (
                      <SideItem href="/laboratoire/stats" icon={<BarChart3 className="h-4 w-4" />} label="Statistiques" active={active==="stats"} />
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
    </LabCtx.Provider>
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
