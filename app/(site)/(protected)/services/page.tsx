"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { ALL_SERVICES } from "@/lib/roles";

export default function ServicesPage() {
  const { user } = useAuth();

  // Admin : tout. Sinon : seulement ses services autorisés.
  const visible = user?.role === "admin"
    ? ALL_SERVICES
    : ALL_SERVICES.filter(s => user?.allowedServices.includes(s.slug));

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-green-700 mb-6">
        Services
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((s) => (
          <Link
            key={s.slug}
            href={`/services/${s.slug}`}
            className="rounded-2xl border border-green-100 bg-white hover:shadow-lg transition p-5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-800">
                {s.label}
              </span>
              <span className="text-green-700 font-bold group-hover:translate-x-0.5 transition">
                →
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Accéder au service.</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
