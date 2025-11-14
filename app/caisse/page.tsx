// app/caisse/page.tsx
"use client";
import { useEffect } from "react";
import { useAuthz } from "@/lib/authz";

export default function CaisseIndex() {
  const { abilities } = useAuthz();

  useEffect(() => {
    const can = (p: string) => abilities.includes(p) || abilities.includes("*");
    if (can("caisse.audit.view")) window.location.replace("/caisse/admin/audit");
    else if (can("caisse.report.view")) window.location.replace("/caisse/rapport");
    else if (can("caisse.access")) window.location.replace("/caisse/ma");
    else window.location.replace("/403");
  }, [abilities]);

  return null;
}
