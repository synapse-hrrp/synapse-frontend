"use client";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import UserFormPro from "@/components/UserFormPro";
import { AdminGuard } from "@/lib/authz";

export default function UserCreatePage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
        <TopIdentityBar />
        <SiteHeader
          title="Nouvel utilisateur"
          subtitle="Créer un compte (rôle par défaut: staff côté backend)"
          logoSrc="/logo-hospital.png"
          avatarSrc="/Gloire.png"
        />

        <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li>Portail</li><li aria-hidden>/</li>
              <li>Utilisateurs</li><li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Nouveau</li>
            </ol>
          </nav>

          <UserFormPro mode="create" />
        </main>

        <SiteFooter />
      </div>
    </AdminGuard>
  );
}
