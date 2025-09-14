// app/visites/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getVisite } from "@/lib/api";
import { ArrowLeft, ClipboardList, User2, Building2, CalendarDays } from "lucide-react";

export default function VisiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [v, setV] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/visites/${id}`); return; }
    me().catch(() => window.location.replace(`/login?next=/visites/${id}`));
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        setBusy(true);
        const data = await getVisite(id);
        setV(data?.data ?? data);
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
        title="Détail de la visite"
        subtitle={v?.created_at ? new Date(v.created_at).toLocaleString() : "Informations générales"}
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/visites" className="hover:underline">Visites</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Détail</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/visites" className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
            <Link href={`/visites/${id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
              Modifier
            </Link>
          </div>
        </div>

        {busy && <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />}
        {!busy && err && <div className="rounded-xl border border-congo-red/30 bg-red-50 p-4 text-congo-red text-sm">{err}</div>}

        {!busy && v && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-6">
              <Card title="Essentiel" icon={<ClipboardList className="h-4 w-4" />}>
                <ul className="text-sm space-y-2">
                  <li><b>Motif :</b> {v.plaintes_motif}</li>
                  <li className="text-ink-600 text-xs flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Créée le {v.created_at ? new Date(v.created_at).toLocaleString() : "—"}</li>
                </ul>
              </Card>

              <Card title="Patient" icon={<User2 className="h-4 w-4" />}>
                <ul className="text-sm space-y-1">
                  <li><b>ID patient :</b> {v.patient?.id || v.patient_id}</li>
                  <li><b>Nom :</b> {v.patient ? `${v.patient.nom} ${v.patient.prenom}` : "—"}</li>
                  {v.patient?.numero_dossier && <li><b>N° dossier :</b> {v.patient.numero_dossier}</li>}
                </ul>
                {v.patient?.id && <Link href={`/patients/${v.patient.id}`} className="mt-2 inline-block text-xs text-congo-green hover:underline">Voir la fiche patient →</Link>}
              </Card>
            </section>

            <aside className="space-y-6">
              <Card title="Service" icon={<Building2 className="h-4 w-4" />}>
                <ul className="text-sm space-y-1">
                  <li><b>ID service :</b> {v.service?.id || v.service_id}</li>
                  <li><b>Nom :</b> {v.service?.name || "—"}</li>
                </ul>
              </Card>

              <Card title="Métadonnées">
                <ul className="text-sm space-y-1">
                  <li><b>ID :</b> {v.id}</li>
                  <li><b>MAJ :</b> {v.updated_at ? new Date(v.updated_at).toLocaleString() : "—"}</li>
                </ul>
              </Card>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children?: React.ReactNode; }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">{icon}<h3 className="text-sm font-semibold">{title}</h3></div>
      {children}
    </section>
  );
}
