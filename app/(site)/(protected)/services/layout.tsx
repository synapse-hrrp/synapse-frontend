// app/(protected)/services/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function ServicesProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [ready, token, pathname, router]);

  // Pendant l'init ou la redirection, ne rien afficher
  if (!ready || !token) return null;

  return <>{children}</>;
}
