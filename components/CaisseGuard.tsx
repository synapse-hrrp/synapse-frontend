"use client";

import { useEffect, useState } from "react";
import { me } from "@/lib/api";

export function CaisseGuard({ ability, children }: { ability: string; children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await me();
        const abilities: string[] = u?.data?.abilities || u?.abilities || u?.data?.permissions || [];
        setOk(abilities.includes(ability));
      } catch {
        setOk(false);
      }
    })();
  }, [ability]);

  if (ok === null) return <div className="p-6 text-sm text-ink-600">Chargement…</div>;
  if (!ok) { if (typeof window !== "undefined") window.location.replace("/login"); return null; }
  return <>{children}</>;
}
