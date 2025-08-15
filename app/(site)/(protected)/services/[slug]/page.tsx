"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { hasAccess, type ServiceSlug } from "@/lib/roles";
import { SERVICE_DATA } from "@/lib/mock-data";

type Props = { params: { slug: string } };

export default function ServiceDetail({ params }: Props) {
  const { user, ready } = useAuth();
  const router = useRouter();

  const slug = useMemo(() => params.slug as ServiceSlug, [params.slug]);
  const allowed = useMemo(
    () => (user ? hasAccess(user.role, slug, user.allowedServices) : false),
    [user, slug]
  );

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/login?redirect=/services/${slug}`);
      return;
    }
    if (!allowed) {
      // Refuser et renvoyer vers /services
      router.replace("/services");
    }
  }, [ready, user, allowed, router, slug]);

  if (!ready || !user || !allowed) return null;

  const data = SERVICE_DATA[slug];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-green-700 mb-4">
        {slug.charAt(0).toUpperCase() + slug.slice(1)}
      </h1>

      <div className="rounded-2xl bg-white border border-green-100 p-6 shadow-sm space-y-3">
        <pre className="text-sm text-gray-700 overflow-auto">
{JSON.stringify(data, null, 2)}
        </pre>
        <p className="text-xs text-gray-500">
          Données provisoires (mock) pour la maquette.
        </p>
      </div>
    </div>
  );
}
