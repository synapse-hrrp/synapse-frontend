"use client";

import { useParams } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import UserFormPro from "@/components/UserFormPro";
import { AdminGuard } from "@/lib/authz";

export default function UserEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
        <TopIdentityBar />
        <SiteHeader
          title="Modifier l’utilisateur"
          subtitle="Mettre à jour l’identité, le contact et la sécurité"
          logoSrc="/logo-hospital.png"
          avatarSrc="/Gloire.png"
        />

        <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li>Portail</li><li aria-hidden>/</li>
              <li>Utilisateurs</li><li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Modifier</li>
            </ol>
          </nav>

          {/* id peut être undefined une fraction de seconde en SSR/CSR, mais UserFormPro gère le chargement dans useEffect */}
          <UserFormPro mode="edit" id={id} />
        </main>

        <SiteFooter />
      </div>
    </AdminGuard>
  );
}
