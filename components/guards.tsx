// components/Guard.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAdmin, hasRole, can, canAny } from "@/lib/authz";

type Props = {
  requireRole?: "admin" | "staff";
  requireAbility?: string;
  requireAny?: string[]; // ex: ["visites.read","visites.write"]
  children: React.ReactNode;
  redirectTo?: string;   // défaut: /login?next=...
};

export default function Guard({ requireRole, requireAbility, requireAny, redirectTo, children }: Props) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) { router.replace(redirectTo || `/login?next=${encodeURIComponent(location.pathname)}`); return; }

    // super admin passe partout
    if (isAdmin()) { setOk(true); return; }

    if (requireRole && !hasRole(requireRole)) { router.replace("/403"); return; }
    if (requireAbility && !can(requireAbility)) { router.replace("/403"); return; }
    if (requireAny && !canAny(requireAny)) { router.replace("/403"); return; }

    setOk(true);
  }, [router, requireRole, requireAbility, requireAny, redirectTo]);

  if (!ok) return null; // ou un loader
  return <>{children}</>;
}
