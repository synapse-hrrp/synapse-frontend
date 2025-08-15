"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MOCK_USERS } from "@/lib/mock-data";
import type { Role } from "@/lib/roles";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  allowedServices: import("@/lib/roles").ServiceSlug[];
};

type AuthCtx = {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  ready: boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

const KEY = "hrrp_auth_token";
const USER_KEY = "hrrp_user";

function isBrowser() { return typeof window !== "undefined"; }
function setAuth(token: string, user: AuthUser) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearAuth() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
}
function getToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(KEY);
}
function getUser(): AuthUser | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setToken(getToken());
    setUser(getUser());
    setReady(true);
  }, []);

  // Auth MOCK : vérifie email+password dans MOCK_USERS
  const login = async (email: string, password: string) => {
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) throw new Error("Identifiants invalides");

    const fakeToken = "demo-" + Math.random().toString(36).slice(2);
    const authUser: AuthUser = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role as Role,
      allowedServices: found.allowedServices,
    };
    setAuth(fakeToken, authUser);
    setToken(fakeToken);
    setUser(authUser);
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, token, login, logout, ready }), [user, token, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
