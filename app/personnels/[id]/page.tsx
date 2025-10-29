// app/personnels/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getPersonnel } from "@/lib/api";
import {
  ArrowLeft, Pencil, IdCard, Phone, Calendar, MapPin, Briefcase, Building2,
  CheckCircle2, X, Image as ImageIcon
} from "lucide-react";

/* ---------- Helpers image ---------- */
// même principe que sur la liste
const API_BASE_PUBLIC = process.env.NEXT_PUBLIC_API_BASE || "";
function publicUrlMaybe(path?: string | null) {
  if (!path) return "";
  const p = String(path);
  if (p.startsWith("http") || p.startsWith("blob:") || p.startsWith("data:")) return p;
  return `${API_BASE_PUBLIC.replace(/\/+$/, "")}${p}`;
}
function initialsOf(last?: string, first?: string) {
  const a = (last || "").trim().charAt(0).toUpperCase();
  const b = (first || "").trim().charAt(0).toUpperCase();
  return (a || "") + (b || "");
}

export default function PersonnelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sp = useSearchParams();

  const [p, setP] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });

  // Garde
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/personnels/${id}`); return; }
    me().catch(() => window.location.replace(`/login?next=/personnels/${id}`));
  }, [id]);

  // Flash
  useEffect(() => {
    const f = sp?.get("flash");
    if (f === "updated") {
      setToast({ show: true, text: "Fiche personnel mise à jour." });
      router.replace(`/personnels/${id}`, { scroll: false });
      const tid = setTimeout(() => setToast({ show: false, text: "" }), 3500);
      return () => clearTimeout(tid);
    }
  }, [sp, router, id]);

  useEffect(() => {
    (async () => {
      try {
        setBusy(true);
        const data = await getPersonnel(id);
        setP(data?.data ?? data);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || "Chargement impossible");
      } finally {
        setBusy(false);
      }
    })();
  }, [id]);

  // URLs images
  const avatarUrl = useMemo(() => publicUrlMaybe(p?.avatar_path), [p]);
  const extraUrl = useMemo(() => {
    try {
      const ex = p?.extra ?? null;
      const obj = typeof ex === "string" ? JSON.parse(ex) : ex;
      return publicUrlMaybe(obj?.extra_path);
    } catch {
      return "";
    }
  }, [p]);

  const displayName = p ? `${p.last_name ?? ""} ${p.first_name ?? ""}`.trim() : "";
  const initials = initialsOf(p?.last_name, p?.first_name);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title={displayName || "Détail personnel"}
        subtitle={p?.matricule ? `Matricule ${p.matricule}` : "Fiche & historique"}
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Fil d'Ariane + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/personnels" className="hover:underline">Personnels</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Détail</li>
            </ol>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/personnels" className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
            <Link href={`/personnels/${id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 inline-flex items-center gap-1">
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          </div>
        </div>

        {/* Contenu */}
        {busy && <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />}
        {!busy && err && <div className="rounded-xl border border-congo-red/30 bg-red-50 p-4 text-congo-red text-sm">{err}</div>}

        {!busy && p && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <section className="lg:col-span-2 space-y-6">
              <Card title="Identité" icon={<IdCard className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <Field k="Nom" v={p.last_name} />
                  <Field k="Prénom" v={p.first_name} />
                  <Field k="Sexe" v={p.sex || "—"} />
                  <Field k="Date de naissance" v={p.date_of_birth || "—"} />
                  <Field k="CIN" v={p.cin || "—"} />
                </div>
              </Card>

              <Card title="Coordonnées" icon={<MapPin className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <Field k="Téléphone alt." v={p.phone_alt || "—"} icon={<Phone className="h-3.5 w-3.5" />} />
                  <Field k="Adresse" v={p.address || "—"} />
                  <Field k="Ville" v={p.city || "—"} />
                  <Field k="Pays" v={p.country || "—"} />
                </div>
              </Card>

              <Card title="Emploi" icon={<Briefcase className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <Field k="Fonction" v={p.job_title || "—"} />
                  <Field k="Embauché le" v={p.hired_at || "—"} />
                  <Field k="Service ID" v={p.service_id ?? "—"} />
                </div>
              </Card>
            </section>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Avatar + nom */}
              <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName || "Avatar"}
                      className="h-20 w-20 rounded-full object-cover border border-ink-100"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-ink-200 text-ink-700 grid place-items-center text-lg font-bold">
                      {initials || "?"}
                    </div>
                  )}
                  <div>
                    <div className="text-base font-semibold">{displayName || "—"}</div>
                    <div className="text-xs text-ink-600">{p?.job_title || "—"}</div>
                    {p?.matricule && <div className="mt-1 text-xs text-ink-500">Matricule: <b>{p.matricule}</b></div>}
                  </div>
                </div>

                {extraUrl && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-ink-600">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Fichier “extra”
                    </div>
                    <img
                      src={extraUrl}
                      alt="Extra"
                      className="mt-2 w-full max-h-56 object-cover rounded-lg border border-ink-100"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </section>

              <Card title="Liens & fichiers" icon={<Building2 className="h-4 w-4" />}>
                <ul className="text-sm space-y-1">
                  <li><b>User ID :</b> {p.user_id}</li>
                  <li><b>Avatar :</b> {p.avatar_path || "—"}</li>
                  <li><b>Extra :</b> <code className="text-xs">{p.extra ? (typeof p.extra === "string" ? p.extra : JSON.stringify(p.extra)) : "—"}</code></li>
                  <li><b>Créé le :</b> {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</li>
                  <li><b>Mis à jour :</b> {p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}</li>
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
