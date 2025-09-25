"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ACCESS_RULES, PUBLIC_ROUTES } from "./route-access";

/* ------------------------------------------------------------------ */
/* Session helpers (utilisés aussi par lib/api.ts)                     */
/* ------------------------------------------------------------------ */

export function setAuthSession(token: string, user: any) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("auth:token", token);
  sessionStorage.setItem("auth:user", JSON.stringify(user || null));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("auth:token");
  sessionStorage.removeItem("auth:user");
}

/* ------------------------------------------------------------------ */
/* Normalisation user/roles/abilities                                  */
/* ------------------------------------------------------------------ */

function pickArrayOfStrings(x: any): string[] {
  if (!x) return [];
  if (Array.isArray(x)) {
    return x
      .map((v) => (typeof v === "string" ? v : v?.name))
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
  }
  return [];
}

function readUserFromSession(): any | null {
  try {
    const raw = sessionStorage.getItem("auth:user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getRoles(u: any): string[] {
  const roles: string[] = [];
  if (u?.role) roles.push(String(u.role).toLowerCase());
  roles.push(...pickArrayOfStrings(u?.roles));
  return Array.from(new Set(roles));
}

function getAbilities(u: any, isSuper: boolean): string[] {
  // Le back peut renvoyer abilities | permissions | perms
  const fromApi =
    pickArrayOfStrings(u?.abilities).length
      ? pickArrayOfStrings(u?.abilities)
      : pickArrayOfStrings(u?.permissions).length
      ? pickArrayOfStrings(u?.permissions)
      : pickArrayOfStrings(u?.perms);

  const base = new Set(fromApi);
  if (isSuper) base.add("*"); // admin/dg = full access
  return Array.from(base);
}

/* ------------------------------------------------------------------ */
/* Hook d’autorisation (API compatible avec l’ancien)                  */
/* ------------------------------------------------------------------ */

export function useAuthz() {
  const [state, setState] = React.useState(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("auth:token") : null;
    const user = typeof window !== "undefined" ? readUserFromSession() : null;
    const roles = getRoles(user);
    const isAdmin = roles.includes("admin") || roles.includes("dg"); // ✅ admin & dg
    const abilities = getAbilities(user, isAdmin);
    return {
      ready: false,                 // nouveau (non bloquant)
      user,
      token,
      roles,
      isAdmin,
      abilities,
      isAuthenticated: !!token,
    };
  });

  // Se resynchroniser si la session change (autre onglet, logout, etc.)
  React.useEffect(() => {
    const sync = () => {
      const token = sessionStorage.getItem("auth:token");
      const user = readUserFromSession();
      const roles = getRoles(user);
      const isAdmin = roles.includes("admin") || roles.includes("dg");
      const abilities = getAbilities(user, isAdmin);
      setState({
        ready: true,
        user,
        token,
        roles,
        isAdmin,
        abilities,
        isAuthenticated: !!token,
      });
    };
    // 1) au mount
    sync();
    // 2) sur storage
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // Helpers compatibles
  const can = React.useCallback(
    (perm: string) => {
      if (state.isAdmin) return true;
      const p = String(perm).toLowerCase();
      return state.abilities.includes("*") || state.abilities.includes(p);
    },
    [state.isAdmin, state.abilities]
  );
  const canAll = React.useCallback((perms: string[]) => perms.every((p) => can(p)), [can]);
  const canAny = React.useCallback((perms: string[]) => perms.some((p) => can(p)), [can]);

  return { ...state, can, canAll, canAny };
}

/* ------------------------------------------------------------------ */
/* Guards réutilisables (compatibles)                                  */
/* ------------------------------------------------------------------ */

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthz();

  React.useEffect(() => {
    if (!isAuthenticated) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login?next=${next}`);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuthz();

  React.useEffect(() => {
    if (!isAuthenticated) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login?next=${next}`);
    } else if (!isAdmin) {
      // 403 → renvoie vers page 403 ou portail si tu préfères
      window.location.replace("/403");
    }
  }, [isAuthenticated, isAdmin]);

  if (!isAuthenticated || !isAdmin) return null;
  return <>{children}</>;
}

export function AbilityGuard({
  anyOf,
  allOf,
  children,
  fallback,
}: {
  anyOf?: string[];
  allOf?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, canAny, canAll, isAdmin } = useAuthz();

  React.useEffect(() => {
    if (!isAuthenticated) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login?next=${next}`);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  let allowed = isAdmin; // admin/dg bypass
  if (!allowed) {
    if (allOf && allOf.length) allowed = canAll(allOf);
    else if (anyOf && anyOf.length) allowed = canAny(anyOf);
    else allowed = true; // aucun critère => OK
  }

  if (!allowed) {
    return (
      <>
        {fallback ?? (
          <div className="mx-auto max-w-3xl mt-10 rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm">
            <div className="text-lg font-semibold text-ink-900">Accès refusé</div>
            <p className="mt-1 text-sm text-ink-600">
              Vous n’avez pas les permissions nécessaires pour accéder à ce module.
            </p>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/* Bonus modernes (optionnels)                                         */
/* ------------------------------------------------------------------ */

/** Masquer/afficher un fragment d’UI selon des permissions */
export function Can({ any = [], all = [], children }: { any?: string[]; all?: string[]; children: React.ReactNode; }) {
  const { isAdmin, abilities } = useAuthz();
  const set = React.useMemo(() => new Set(abilities), [abilities]);
  const okAny = any.length ? any.some((p) => set.has(p)) : true;
  const okAll = all.length ? all.every((p) => set.has(p)) : true;
  if (isAdmin || (okAny && okAll)) return <>{children}</>;
  return null;
}

/**
 * Garde GLOBAL basé sur des règles d’URL (ACCESS_RULES)
 * - Ajoute <RouteGuard /> UNE FOIS dans app/layout.tsx
 */
export function RouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, isAuthenticated, isAdmin, abilities, roles } = useAuthz();

  React.useEffect(() => {
    if (!ready) return;

    // Routes publiques
    if (PUBLIC_ROUTES.some((rx) => rx.test(pathname))) return;

    // Auth obligatoire
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // Cherche une règle qui matche l’URL
    const rule = ACCESS_RULES.find((r) => r.pattern.test(pathname));
    if (!rule) return; // pas de règle => on laisse passer

    // Évaluation de la règle
    const roleSet = new Set(roles);
    const permSet = new Set(abilities);
    const allowedByRole = rule.allowRoles?.some((r) => roleSet.has(r)) ?? false;
    const allowedByAny = rule.any ? rule.any.some((p) => permSet.has(p)) : true;
    const allowedByAll = rule.all ? rule.all.every((p) => permSet.has(p)) : true;

    const allowed = isAdmin || allowedByRole || (allowedByAny && allowedByAll);
    if (!allowed) router.replace("/403");
  }, [ready, pathname, isAuthenticated, isAdmin, abilities, roles, router]);

  return null;
}
