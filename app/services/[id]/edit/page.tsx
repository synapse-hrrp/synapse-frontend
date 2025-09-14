// app/services/[id]/edit/page.tsx
"use client";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ServiceFormPro from "@/components/ServiceFormPro";
import { useParams } from "next/navigation";

export default function EditServicePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Modifier le service"
        subtitle="Mettre à jour les informations du service"
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-6 text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Portail</li><li aria-hidden>/</li>
            <li>Services</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Modifier</li>
          </ol>
        </nav>
        <ServiceFormPro mode="edit" serviceId={Number(id)} />
      </main>
      <SiteFooter />
    </div>
  );
}
