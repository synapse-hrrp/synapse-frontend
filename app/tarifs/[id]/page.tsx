// app/tarifs/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getTarif } from "@/lib/api";
import { ArrowLeft, Pencil, CheckCircle2, X, BadgeDollarSign, Tags, Building2 } from "lucide-react";

export default function TarifDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sp = useSearchParams();

  const [t, setT] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });

  // Garde
  useEffect(() => {
    const tok = getToken();
    if (!tok) { window.location.replace(`/login?next=/tarifs/${id}`); return; }
    me().catch(() => window.location.replace(`/login?next=/tarifs/${id}`));
  }, [id]);

  // Flash
  useEffect(() => {
    const f = sp?.get("flash");
    if (f === "updated") {
      setToast({ show: true, text: "Tarif mis à jour." });
      router.replace(`/tarifs/${id}`, { scroll: false });
      const tid = setTimeout(() => setToast({ show: false, text: "" }), 3500);
      return () => clearTimeout(tid);
    }
  }, [sp, router, id]);

  useEffect(() => {
    (async () => {
      try {
        setBusy(true);
        const data = await getTarif(id);
        setT(data?.data ?? data);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || "Chargement impossible");
      } finally {
        setBusy(false);
      }
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title={t ? `${t.libelle ?? ""}`.trim() || "Détail tarif" : "Détail tarif"}
        subtitle={t?.code ? `Code ${t.code}` : "Fiche & historique"}
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Fil d'Ariane + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/tarifs" className="hover:underline">Tarifs</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Détail</li>
            </ol>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/tarifs" className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
            <Link href={`/tarifs/${id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 inline-flex items-center gap-1">
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          </div>
        </div>

        {/* Contenu */}
        {busy && <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />}
        {!busy && err && <div className="rounded-xl border border-congo-red/30 bg-red-50 p-4 text-congo-red text-sm">{err}</div>}

        {!busy && t && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-6">
              <Card title="Identification" icon={<Tags className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <Field k="Code" v={t.code} />
                  <Field k="Libellé" v={t.libelle} />
                  <Field k="Actif" v={t.is_active ? "Oui" : "Non"} />
                </div>
              </Card>

              <Card title="Tarification" icon={<BadgeDollarSign className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <Field k="Montant" v={Number(t.montant).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
                  <Field k="Devise" v={t.devise || "—"} />
                </div>
              </Card>
            </section>

            <aside className="space-y-6">
              <Card title="Liaison & métadonnées" icon={<Building2 className="h-4 w-4" />}>
                <ul className="text-sm space-y-1">
                  <li><b>Service :</b> {t.service?.name ?? (t.service_id ?? "—")}</li>
                  <li><b>Créé le :</b> {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</li>
                  <li><b>Mis à jour :</b> {t.updated_at ? new Date(t.updated_at).toLocaleString() : "—"}</li>
                  <li><b>ID :</b> <code className="text-xs">{t.id}</code></li>
                </ul>
              </Card>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />

      {/* Toast */}
      <Toast show={toast.show} onClose={() => setToast({ show: false, text: "" })}>
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">{toast.text}</span>
      </Toast>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">{icon}<h3 className="text-sm font-semibold">{title}</h3></div>
      {children}
    </section>
  );
}
function Field({ k, v, className="", icon }: { k: string; v: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="text-xs font-medium text-ink-600 flex items-center gap-1">{icon}{icon && <span className="sr-only">{k}</span>}<span>{k}</span></div>
      <div className="mt-1 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-sm">{v ?? "—"}</div>
    </div>
  );
}
function Toast({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div aria-live="polite" role="status" className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${show ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"}`}>
      <div className="flex items-center gap-2 rounded-xl border border-congo-green/30 bg-congo-greenL px-3 py-2 shadow-lg ring-1 ring-congo-green/20 text-congo-green">
        {children}
        <button onClick={onClose} aria-label="Fermer" className="ml-1 rounded-md p-1 hover:bg-ink-100 text-ink-600"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
