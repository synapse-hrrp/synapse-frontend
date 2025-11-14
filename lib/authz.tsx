"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ACCESS_RULES, PUBLIC_ROUTES } from "./route-access";

/* ------------------------------------------------------------------ */
/* Session helpers                                                     */
/* ------------------------------------------------------------------ */

export function setAuthSession(token: string, user: any) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("auth:token", token);
    sessionStorage.setItem("auth:user", JSON.stringify(user || null));
  } catch {}
}

export function readUserFromSession(): any | null {
  try {
    const raw = sessionStorage.getItem("auth:user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function deleteCookie(name: string) {
  try {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname}; SameSite=Lax`;
  } catch {}
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("auth:token");
    sessionStorage.removeItem("auth:user");
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i) ?? "";
      if (k.startsWith("auth:")) sessionStorage.removeItem(k);
    }
  } catch {}
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i) ?? "";
      if (k.startsWith("auth:")) localStorage.removeItem(k);
    }
  } catch {}
  deleteCookie("auth_token");
  deleteCookie("auth_roles");
  deleteCookie("is_admin");
}

export function logoutAndRedirect(redirectTo = "/login") {
  clearAuthSession();
  try { window.history.replaceState(null, "", redirectTo); } catch {}
  window.location.replace(redirectTo);
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

function getRoles(u: any): string[] {
  const roles: string[] = [];
  if (u?.role) roles.push(String(u.role).toLowerCase());
  roles.push(...pickArrayOfStrings(u?.roles));
  return Array.from(new Set(roles));
}

function getAbilities(u: any, isSuper: boolean): string[] {
  const fromApi =
    pickArrayOfStrings(u?.abilities).length
      ? pickArrayOfStrings(u?.abilities)
      : pickArrayOfStrings(u?.permissions).length
      ? pickArrayOfStrings(u?.permissions)
      : pickArrayOfStrings(u?.perms);

  const base = new Set(fromApi);
  if (isSuper) base.add("*");
  return Array.from(base);
}

/** Renvoie le "rôle caisse" prioritaire s'il existe sur l'utilisateur */
export function pickCaisseRole(roles: string[]): "admin_caisse" | "caissier_general" | "caissier_service" | null {
  const set = new Set(roles.map((r) => r.toLowerCase()));
  if (set.has("admin_caisse")) return "admin_caisse";
  if (set.has("caissier_general")) return "caissier_general";
  if (set.has("caissier_service")) return "caissier_service";
  return null;
}

/* ------------------------------------------------------------------ */
/* Hook d’autorisation                                                 */
/* ------------------------------------------------------------------ */

export function useAuthz() {
  const [state, setState] = React.useState(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("auth:token") : null;
    const user = typeof window !== "undefined" ? readUserFromSession() : null;
    const roles = getRoles(user);
    const isAdmin = roles.includes("admin") || roles.includes("dg");
    const abilities = getAbilities(user, isAdmin);
    const caisseRole = pickCaisseRole(roles);
    return {
      ready: false,
      user,
      token,
      roles,
      isAdmin,
      abilities,
      caisseRole, // 🟢 exposé au front
      isAuthenticated: !!token,
    };
  });

  React.useEffect(() => {
    const sync = () => {
      const token = sessionStorage.getItem("auth:token");
      const user = readUserFromSession();
      const roles = getRoles(user);
      const isAdmin = roles.includes("admin") || roles.includes("dg");
      const abilities = getAbilities(user, isAdmin);
      const caisseRole = pickCaisseRole(roles);
      setState({
        ready: true,
        user,
        token,
        roles,
        isAdmin,
        abilities,
        caisseRole,
        isAuthenticated: !!token,
      });
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

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
/* Guards                                                              */
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

  let allowed = isAdmin;
  if (!allowed) {
    if (allOf && allOf.length) allowed = canAll(allOf);
    else if (anyOf && anyOf.length) allowed = canAny(anyOf);
    else allowed = true;
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
/* RouteGuard GLOBAL                                                   */
/* ------------------------------------------------------------------ */

export function RouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, isAuthenticated, isAdmin, abilities, roles } = useAuthz();

  React.useEffect(() => {
    if (!ready) return;

    // 1) routes publiques
    if (PUBLIC_ROUTES.some((rx) => rx.test(pathname))) return;

    // 2) auth obligatoire
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // 3) /portail strict: admin/dg
    if (pathname.startsWith("/portail") && !isAdmin) {
      router.replace("/login?error=forbidden");
      return;
    }

    // 4) règles custom
    const rule = ACCESS_RULES.find((r) => r.pattern.test(pathname));
    if (!rule) return;

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
