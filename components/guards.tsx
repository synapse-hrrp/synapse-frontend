// components/guards.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type ServiceId =
  | "Patients"
  | "pharmacie"
  | "laboratoire"
  | "caisse"
  | "echographie"
  | "gynecologie"
  | "pediatrie"
  | "medecine-generale"
  | "admissions"
  | "consultations";

function hasWindow() {
  return typeof window !== "undefined";
}
function sget(key: string) {
  if (!hasWindow()) return null;
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-[50vh] grid place-items-center text-slate-600">
      <div className="animate-pulse">{label}…</div>
    </div>
  );
}

/** Garde pour un service donné (staff ou superuser) */
export function ServiceGuard({
  service,
  children,
}: {
  service: ServiceId;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  // On lit la session une seule fois au montage
  useEffect(() => {
    let ok = false;

    // superuser a tous les droits
    if (sget("auth:token:superuser") === "ok") {
      ok = true;
    }

    // jeton spécifique au service pour le staff
    if (!ok && sget(`auth:token:${service}`) === "ok") {
      ok = true;
    }

    setAllowed(ok);
    setReady(true);

    // si non autorisé → redirige vers /login avec next+service (une seule fois)
    if (!ok) {
      const next = encodeURIComponent(pathname || `/${service}`);
      router.replace(`/login?next=${next}&service=${encodeURIComponent(service)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]); // ← dépend seulement du service

  if (!ready) return <LoadingScreen label="Vérification des autorisations" />;

  // Si pas autorisé, on rend un écran neutre (la redirection est en cours)
  if (!allowed) return <LoadingScreen label="Redirection vers la connexion" />;

  return <>{children}</>;
}

/** Garde portail superuser uniquement */
export function SuperuserGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [isSuper, setIsSuper] = useState(false);

  useEffect(() => {
    const ok = sget("auth:token:superuser") === "ok";
    setIsSuper(ok);
    setReady(true);
    if (!ok) {
      const next = encodeURIComponent(pathname || "/portail");
      router.replace(`/login?next=${next}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <LoadingScreen label="Vérification du profil superuser" />;
  if (!isSuper) return <LoadingScreen label="Redirection vers la connexion" />;

  return <>{children}</>;
}
