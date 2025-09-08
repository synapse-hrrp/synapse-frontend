// app/patients/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getPatient } from "@/lib/api";
import { ArrowLeft, Pencil, IdCard, Phone, Calendar, Droplets, Shield, MapPin, CheckCircle2, X } from "lucide-react";

type Patient = {
  id: string;
  numero_dossier: string;
  nom: string;
  prenom: string;
  date_naissance?: string | null;
  age_reporte?: number | null;
  lieu_naissance?: string | null;
  sexe?: "M"|"F"|"X"|null;
  nationalite?: string | null;
  profession?: string | null;
  adresse?: string | null;
  quartier?: string | null;
  telephone?: string | null;
  statut_matrimonial?: string | null;
  proche_nom?: string | null;
  proche_tel?: string | null;
  groupe_sanguin?: "A+"|"A-"|"B+"|"B-"|"AB+"|"AB-"|"O+"|"O-"|null;
  allergies?: string | null;
  assurance_id?: string | null;
  numero_assure?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

function ageFrom(dob?: string | null, fallback?: number | null) {
  if (dob) {
    const d = new Date(dob + "T00:00:00");
    if (!isNaN(d.getTime())) {
      const now = new Date();
      let a = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
      return a >= 0 ? a : "—";
    }
  }
  return fallback ?? "—";
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sp = useSearchParams();

  const [p, setP] = useState<Patient | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });

  // Garde
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/patients/${id}`); return; }
    me().catch(() => window.location.replace(`/login?next=/patients/${id}`));
  }, [id]);

  // Flash
  useEffect(() => {
    const f = sp?.get("flash");
    if (f === "updated") {
      setToast({ show: true, text: "Patient modifié avec succès." });
      router.replace(`/patients/${id}`, { scroll: false });
      const tid = setTimeout(() => setToast({ show: false, text: "" }), 3500);
      return () => clearTimeout(tid);
    }
  }, [sp, router, id]);

  useEffect(() => {
    (async () => {
      try {
        setBusy(true);
        const data = await getPatient(id);
        setP(data?.data ?? data); // support des 2 formats
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || "Chargement impossible");
      } finally {
        setBusy(false);
      }
    })();
  }, [id]);

  const age = useMemo(() => ageFrom(p?.date_naissance, p?.age_reporte), [p]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title={p ? `${p.nom ?? ""} ${p.prenom ?? ""}`.trim() || "Détail patient" : "Détail patient"}
        subtitle={p?.numero_dossier ? `Dossier ${p.numero_dossier}` : "Informations et historique"}
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Fil d'Ariane + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/patients" className="hover:underline">Patients</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Détail</li>
            </ol>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/patients" className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
            <Link href={`/patients/${id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 inline-flex items-center gap-1">
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          </div>
        </div>

        {/* Contenu */}
        {busy && <Skeleton />}

        {!busy && err && (
          <div className="rounded-xl border border-congo-red/30 bg-red-50 p-4 text-congo-red text-sm">{err}</div>
        )}

        {!busy && p && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-6">
              <Card title="Identité" icon={<IdCard className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <Field k="Nom" v={p.nom} />
                  <Field k="Prénom" v={p.prenom} />
                  <Field k="Sexe" v={p.sexe || "—"} />
                  <Field k="Âge" v={String(age)} />
                  <Field k="Date de naissance" v={p.date_naissance || "—"} />
                  <Field k="Lieu de naissance" v={p.lieu_naissance || "—"} className="sm:col-span-2" />
                </div>
              </Card>

              <Card title="Coordonnées & Civil" icon={<MapPin className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <Field k="Téléphone" v={p.telephone || "—"} icon={<Phone className="h-3.5 w-3.5" />} />
                  <Field k="Adresse" v={p.adresse || "—"} />
                  <Field k="Quartier" v={p.quartier || "—"} />
                  <Field k="Nationalité" v={p.nationalite || "—"} />
                  <Field k="Profession" v={p.profession || "—"} />
                  <Field k="Statut matrimonial" v={p.statut_matrimonial || "—"} />
                  <Field k="Proche à prévenir" v={p.proche_nom || "—"} />
                  <Field k="Tel. du proche" v={p.proche_tel || "—"} />
                </div>
              </Card>

              <Card title="Médical" icon={<Droplets className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <Field k="Groupe sanguin" v={p.groupe_sanguin || "—"} />
                  <div className="sm:col-span-2">
                    <div className="text-xs font-medium text-ink-600">Allergies</div>
                    <div className="mt-1 rounded-lg border border-ink-100 bg-ink-50 p-3 text-sm min-h-[46px]">
                      {p.allergies?.trim() || "—"}
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            <aside className="space-y-6">
              <Card title="Dossier & statut" icon={<Calendar className="h-4 w-4" />}>
                <ul className="text-sm space-y-2">
                  <li><b>N° dossier : </b><span className="font-mono">{p.numero_dossier}</span></li>
                  <li><b>Statut : </b>
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${p.is_active ? "bg-congo-greenL text-congo-green" : "bg-ink-200 text-ink-700"}`}>
                      {p.is_active ? "Actif" : "Inactif"}
                    </span>
                  </li>
                  <li><b>Créé le : </b>{p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</li>
                  <li><b>Mis à jour : </b>{p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}</li>
                </ul>
              </Card>

              <Card title="Assurance" icon={<Shield className="h-4 w-4" />}>
                <ul className="text-sm space-y-1">
                  <li><b>Assurance ID : </b>{p.assurance_id || "—"}</li>
                  <li><b>N° assuré : </b>{p.numero_assure || "—"}</li>
                </ul>
              </Card>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />

      {/* Toast succès */}
      <Toast show={toast.show} onClose={() => setToast({ show: false, text: "" })}>
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">{toast.text}</span>
      </Toast>
    </div>
  );
}

/* ------ UI helpers ------ */

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}
function Field({ k, v, className="", icon }: { k: string; v: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="text-xs font-medium text-ink-600 flex items-center gap-1">
        {icon}{icon && <span className="sr-only">{k}</span>}
        <span>{k}</span>
      </div>
      <div className="mt-1 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-sm">{v}</div>
    </div>
  );
}
function Skeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
      {[...Array(3)].map((_,i)=>(
        <div key={i} className={`rounded-2xl border border-ink-100 bg-white p-5 ${i<2?"lg:col-span-1":"lg:col-span-1"}`}>
          <div className="h-4 w-32 bg-ink-100 rounded mb-4" />
          {[...Array(4)].map((__,j)=>(<div key={j} className="h-9 bg-ink-100 rounded mb-2" />))}
        </div>
      ))}
    </div>
  );
}
function Toast({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div aria-live="polite" role="status"
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${show ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"}`}>
      <div className="flex items-center gap-2 rounded-xl border border-congo-green/30 bg-congo-greenL px-3 py-2 shadow-lg ring-1 ring-congo-green/20 text-congo-green">
        {children}
        <button onClick={onClose} aria-label="Fermer" className="ml-1 rounded-md p-1 hover:bg-ink-100 text-ink-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
