"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";

export default function Guarded({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const t = sessionStorage.getItem("auth:token");
      setOk(!!t);
    } catch {
      setOk(false);
    }
  }, []);

  if (ok === null) return <div className="p-6">...</div>;

  if (!ok) {
    return (
      <div className="max-w-lg mx-auto mt-16 rounded-lg border bg-white p-6 shadow">
        <h2 className="text-lg font-semibold mb-2">401 — Unauthenticated</h2>
        <p className="text-sm text-gray-600 mb-4">
          Vous devez être connecté pour accéder à l’admin pharmacie.
        </p>
        <Link className="text-congo-green underline" href="/login">Aller à la page de connexion</Link>
      </div>
    );
  }

  return <>{children}</>;
}
