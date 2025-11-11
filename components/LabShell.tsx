"use client";

import React, { createContext, useContext, useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Microscope, BarChart3 } from "lucide-react";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type AnyObj = Record<string, any>;
type Caps = {
  isAdmin: boolean;
  examens: { view: boolean; requestCreate: boolean; resultWrite: boolean };
  patients: { read: boolean };
  visites: { read: boolean };
  stats:   { view: boolean };
  medecins: { read: boolean };
};

const LabCtx = createContext<{ caps: Caps }>({
  caps: {
    isAdmin: false,
    examens: { view: false, requestCreate: false, resultWrite: false },
    patients: { read: false },
    visites: { read: false },
    stats:   { view: false },
    medecins: { read: false },
  },
});
export const useLaboratoire = () => useContext(LabCtx);

function getSessionUser(): AnyObj | null {
  try {
    const raw = sessionStorage.getItem("auth:user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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
      examens: { view: true, requestCreate: true, resultWrite: true },
      patients: { read: true },
      visites: { read: true },
      stats:   { view: true },
      medecins: { read: true },
    };
  }

  const isLaborantin = roles.includes("laborantin");
  if (isLaborantin) {
    return {
      isAdmin: false,
      examens: { view: true, requestCreate: true, resultWrite: true },
      patients: { read: true },
      visites: { read: true },
      stats:   { view: true },
      medecins: { read: true },
    };
  }

  return {
    isAdmin: false,
    examens: { view: false, requestCreate: false, resultWrite: false },
    patients: { read: false },
    visites: { read: false },
    stats:   { view: false },
    medecins: { read: false },
  };
}

export default function LabShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [caps, setCaps] = useState<Caps>(() => buildCaps([]));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("auth:token");
    if (!token) { router.replace("/login?next=/laboratoire"); return; }

    const u = getSessionUser();
    if (!u) { router.replace("/login?next=/laboratoire"); return; }

    const roles = getRoleNames(u);
    const nextCaps = buildCaps(roles);
    setCaps(nextCaps);

    if (!nextCaps.isAdmin && !roles.includes("laborantin")) {
      router.replace("/portail");
      return;
    }
    setReady(true);
  }, [router]);

  const active = useMemo(() => {
    if (!pathname) return "examens";
    if (pathname.startsWith("/laboratoire/patients")) return "patients";
    if (pathname.startsWith("/laboratoire/visites"))  return "visites";
    if (pathname.startsWith("/laboratoire/stats"))    return "stats";
    return "examens";
  }, [pathname]);

  if (!ready) return null;

  return (
    <LabCtx.Provider value={{ caps }}>
      <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
        <TopIdentityBar />
        <SiteHeader
          title="Laboratoire"
          subtitle="Examens, comptes-rendus et statistiques"
          logoSrc="/logo-hospital.png"
        />

        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar */}
            <aside className="lg:col-span-3">
              <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden">
                {/* bandeau */}
                <div className="h-1 bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
                <div className="p-3">
                  <div className="text-xs font-semibold text-ink-700 mb-2">
                    Applications Laboratoire
                  </div>
                  <nav className="space-y-1" aria-label="Apps laboratoire">
                    {caps.examens.view && (
                      <SideItem
                        href="/laboratoire/examens"
                        icon={<Microscope className="h-4 w-4" />}
                        label="Examens"
                        active={active === "examens"}
                      />
                    )}
                    {caps.stats.view && (
                      <SideItem
                        href="/laboratoire/stats"
                        icon={<BarChart3 className="h-4 w-4" />}
                        label="Statistiques"
                        active={active === "stats"}
                      />
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

function SideItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-congo-green/10 text-congo-green ring-1 ring-congo-green/30"
          : "text-ink-700 hover:bg-ink-50"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`h-6 w-6 rounded-lg flex items-center justify-center ${
          active ? "bg-congo-green text-white" : "bg-ink-100 text-ink-700"
        }`}
      >
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}
