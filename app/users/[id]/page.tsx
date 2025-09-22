"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getUser, deleteUser } from "@/lib/api";
import { AdminGuard } from "@/lib/authz";
import { Pencil, Trash2, ShieldAlert } from "lucide-react";

type UserDetail = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  roles?: Array<string | { name: string }>;
};

export default function UserShowPage() {
  return (
    <AdminGuard>
      <UserShowInner />
    </AdminGuard>
  );
}

function UserShowInner() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const sp = useSearchParams();
  const flash = sp?.get("flash") || "";

  const [data, setData] = useState<UserDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setBusy(true); setErr(null);
      try {
        const res: any = await getUser(id);
        const u = Array.isArray(res) ? res[0] : (res?.data ?? res);
        setData(u || null);
      } catch (e: any) {
        setErr(e?.message || "Impossible de charger l’utilisateur.");
        setData(null);
      } finally { setBusy(false); }
    })();
  }, [id]);

  async function onDelete() {
    if (!id) return;
    if (!confirm("Supprimer cet utilisateur ?")) return;
    try {
      setBusy(true);
      await deleteUser(Number(id));
      router.replace("/users?flash=deleted");
    } catch (e: any) {
      alert("Suppression impossible : " + (e?.message || "inconnue"));
    } finally { setBusy(false); }
  }

  const roles =
    (data?.roles || [])
      .map((r: any) => (typeof r === "string" ? r : r?.name))
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Détail utilisateur"
        subtitle="Informations du compte et sécurité"
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {flash && (
          <div className="rounded-lg border border-congo-green/30 bg-congo-greenL p-3 text-sm text-congo-green">
            {flash === "updated" ? "Utilisateur mis à jour." : "Opération effectuée."}
          </div>
        )}

        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Portail</li><li aria-hidden>/</li>
            <li><Link href="/users" className="hover:underline">Utilisateurs</Link></li>
            <li aria-hidden>/</li>
            <li className="font-medium text-ink-900">#{id}</li>
          </ol>
        </nav>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          {busy && <p className="text-sm text-ink-500">Chargement…</p>}
          {!busy && !data && !err && <p className="text-sm text-ink-500">Introuvable.</p>}
          {err && (
            <p className="flex items-center gap-2 text-sm text-congo-red">
              <ShieldAlert className="h-4 w-4" /> {err}
            </p>
          )}

          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom">{data.name}</Field>
              <Field label="E-mail">{data.email}</Field>
              <Field label="Téléphone">{data.phone || "—"}</Field>
              <Field label="Statut">
                <span className={`rounded-full px-2 py-0.5 text-xs ${data.is_active === false ? "bg-ink-200 text-ink-700" : "bg-congo-greenL text-congo-green"}`}>
                  {data.is_active === false ? "Inactif" : "Actif"}
                </span>
              </Field>
              <Field label="Rôles">{roles}</Field>
              <Field label="Dernière connexion">{data.last_login_at ? new Date(data.last_login_at).toLocaleString() : "—"}</Field>
              <Field label="Dernière IP">{data.last_login_ip || "—"}</Field>
              <Field label="Créé le">{data.created_at ? new Date(data.created_at).toLocaleString() : "—"}</Field>
              <Field label="MAJ le">{data.updated_at ? new Date(data.updated_at).toLocaleString() : "—"}</Field>
            </div>
          )}

          <div className="mt-5 flex items-center gap-2">
            <Link
              href={`/users/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm hover:bg-ink-50"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--color-congo-red)]/10 text-congo-red px-3 py-2 text-sm hover:bg-[color:var(--color-congo-red)]/20"
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-ink-600">{label}</div>
      <div className="text-sm font-medium text-ink-900">{children}</div>
    </div>
  );
}
