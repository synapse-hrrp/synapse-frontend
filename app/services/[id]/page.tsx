// app/services/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getService, Service } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();

  const [svc, setSvc] = useState<Service | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const flash = sp?.get("flash");

  // Garde
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/services/${id}`); return; }
    me().catch(() => window.location.replace(`/login?next=/services/${id}`));
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        setBusy(true);
        const raw = await getService(id);
        setSvc(raw?.data ?? raw);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || "Chargement impossible");
      } finally { setBusy(false); }
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Détail du service"
        subtitle={svc?.name || "Informations"}
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/services" className="hover:underline">Services</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Détail</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/services" className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
            <Link href={`/services/${id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
              Modifier
            </Link>
          </div>
        </div>

        {flash === "updated" && (
          <div className="rounded-lg border border-congo-green/30 bg-congo-greenL p-3 text-sm text-congo-green">
            Modifications enregistrées.
          </div>
        )}

        {busy && <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />}
        {!busy && err && <div className="rounded-xl border border-congo-red/30 bg-red-50 p-4 text-congo-red text-sm">{err}</div>}

        {!busy && svc && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-3">Informations</h3>
              <ul className="text-sm space-y-2">
                <li><b>Nom :</b> {svc.name}</li>
                <li><b>Slug :</b> <span className="font-mono">{svc.slug}</span></li>
                <li><b>Code :</b> {svc.code || "—"}</li>
                <li><b>Statut :</b> {svc.is_active ? "Actif" : "Inactif"}</li>
              </ul>
            </section>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold mb-3">Métadonnées</h3>
                <ul className="text-sm space-y-2">
                  <li><b>ID :</b> {svc.id}</li>
                  <li><b>Créé le :</b> {svc.created_at ? new Date(svc.created_at).toLocaleString() : "—"}</li>
                  <li><b>MAJ :</b> {svc.updated_at ? new Date(svc.updated_at).toLocaleString() : "—"}</li>
                </ul>
              </section>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
