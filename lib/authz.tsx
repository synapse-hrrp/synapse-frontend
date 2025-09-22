// lib/authz.tsx
"use client";

import * as React from "react";

/* ---------------- Session helpers (utilisés par lib/api.ts) ---------------- */

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

/* ---------------- Normalisation user/roles/permissions ---------------- */

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

function getAbilities(u: any, isAdmin: boolean): string[] {
  // Cherche dans plusieurs champs possibles renvoyés par le back
  const fromApi =
    pickArrayOfStrings(u?.abilities).length
      ? pickArrayOfStrings(u?.abilities)
      : pickArrayOfStrings(u?.permissions).length
      ? pickArrayOfStrings(u?.permissions)
      : pickArrayOfStrings(u?.perms);

  const base = new Set(fromApi);
  if (isAdmin) base.add("*"); // admin = full access
  return Array.from(base);
}

/* ----------------------- Hook d’autorisation ----------------------- */

export function useAuthz() {
  const [state, setState] = React.useState(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("auth:token") : null;
    const user = typeof window !== "undefined" ? readUserFromSession() : null;
    const roles = getRoles(user);
    const isAdmin = roles.includes("admin");
    const abilities = getAbilities(user, isAdmin);
    return {
      user,
      token,
      roles,
      isAdmin,
      abilities,
      isAuthenticated: !!token,
    };
  });

  // Se resynchroniser si le storage change (ex: login/logout dans un autre onglet)
  React.useEffect(() => {
    const onStorage = () => {
      const token = sessionStorage.getItem("auth:token");
      const user = readUserFromSession();
      const roles = getRoles(user);
      const isAdmin = roles.includes("admin");
      const abilities = getAbilities(user, isAdmin);
      setState({
        user,
        token,
        roles,
        isAdmin,
        abilities,
        isAuthenticated: !!token,
      });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const can = React.useCallback(
    (perm: string) => {
      if (state.isAdmin) return true;
      const p = String(perm).toLowerCase();
      return state.abilities.includes("*") || state.abilities.includes(p);
    },
    [state.isAdmin, state.abilities]
  );

  const canAll = React.useCallback(
    (perms: string[]) => perms.every((p) => can(p)),
    [can]
  );

  const canAny = React.useCallback(
    (perms: string[]) => perms.some((p) => can(p)),
    [can]
  );

  return { ...state, can, canAll, canAny };
}

/* -------------------------- Guards réutilisables -------------------------- */

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthz();

  React.useEffect(() => {
    if (!isAuthenticated) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login?next=${next}`);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;
  return <React.Fragment>{children}</React.Fragment>;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuthz();

  React.useEffect(() => {
    if (!isAuthenticated) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login?next=${next}`);
    } else if (!isAdmin) {
      // 403 → renvoie vers portail
      window.location.replace("/portail");
    }
  }, [isAuthenticated, isAdmin]);

  if (!isAuthenticated || !isAdmin) return null;
  return <React.Fragment>{children}</React.Fragment>;
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

  let allowed = isAdmin; // admin bypass
  if (!allowed) {
    if (allOf && allOf.length) allowed = canAll(allOf);
    else if (anyOf && anyOf.length) allowed = canAny(anyOf);
    else allowed = true; // si aucun critère, laisse passer
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

  return <React.Fragment>{children}</React.Fragment>;
}
