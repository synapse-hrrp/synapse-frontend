// app/medecines/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getMedecine } from "@/lib/api";
import {
  ArrowLeft, Pencil, IdCard, ClipboardList, Activity, Stethoscope,
  CheckCircle2, X
} from "lucide-react";

// ⬇️ on permet d'afficher du contenu riche (string ou ReactNode)
function Field({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-ink-600">{k}</div>
      <div className="mt-1 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-sm">{v ?? "—"}</div>
    </div>
  );
}

// Helpers d'affichage des relations (avec fallbacks élégants)
function labelPatient(p?: any, patient_id?: string | null): string {
  if (p) {
    const nom = String(p.nom ?? p.last_name ?? "").trim();
    const prenom = String(p.prenom ?? p.first_name ?? "").trim();
    const base = (nom || prenom) ? `${nom} ${prenom}`.trim() : String(p.id ?? "");
    return p.numero_dossier ? `${base} (${p.numero_dossier})` : (base || String(patient_id ?? "—"));
  }
  return String(patient_id ?? "—");
}
function labelService(s?: any, service_id?: string | number | null): string {
  if (s) {
    const name = String(s.name ?? s.libelle ?? s.label ?? "").trim();
    const code = String(s.code ?? "").trim();
    const base = name || code || String(s.id ?? "");
    return base || String(service_id ?? "—");
  }
  return service_id != null && service_id !== "" ? String(service_id) : "—";
}

// ⬇️ Rendu riche pour la visite : Numéro/Date + Motif + Hypothèse
function renderVisite(v?: any, visite_id?: string | null): React.ReactNode {
  if (!v) return String(visite_id ?? "—");

  const num = String(v.numero ?? v.reference ?? "").trim();
  const dt = v.date ?? v.date_visite ?? v.created_at;
  const dtStr = dt ? new Date(dt).toLocaleString() : "";

  // Champs possibles selon l’API
  const motif = String(v.motif ?? v.motif_consultation ?? "").trim();
  const hypothese = String(
    v.hypothese ??
    v.hypothese_diagnostic ??
    v.diagnostic_presume ??
    ""
  ).trim();

  const ligne1 = [num || null, dtStr || null].filter(Boolean).join(" — ");

  return (
    <div className="space-y-0.5">
      <div>{ligne1 || "—"}</div>
      {(motif || hypothese) && (
        <div className="text-ink-700">
          {motif && <span><b>Motif&nbsp;:</b> {motif}</span>}
          {motif && hypothese && <span>{' '}•{' '}</span>}
          {hypothese && <span><b>Hypothèse&nbsp;:</b> {hypothese}</span>}
        </div>
      )}
    </div>
  );
}

export default function MedecineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sp = useSearchParams();

  const [item, setItem] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });

  // Flash
  useEffect(() => {
    const f = sp?.get("flash");
    if (f === "updated") {
      setToast({ show: true, text: "Acte médical mis à jour." });
      router.replace(`/medecines/${id}`, { scroll: false });
      const tid = setTimeout(() => setToast({ show: false, text: "" }), 3500);
      return () => clearTimeout(tid);
    }
  }, [sp, router, id]);

  // Chargement (robuste aux différentes formes de payload)
  useEffect(() => {
    (async () => {
      try {
        setBusy(true);
        const raw = await getMedecine(id);
        const data =
          raw?.data?.data ?? // cas {data:{data:{...}}}
          raw?.data ??       // cas {data:{...}}
          raw ?? null;       // cas {...}
        setItem(data);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || "Chargement impossible");
      } finally {
        setBusy(false);
      }
    })();
  }, [id]);

  const soignantNom = useMemo(
    () => (item?.soignant ? `${item.soignant.first_name ?? ""} ${item.soignant.last_name ?? ""}`.trim() : "—"),
    [item]
  );

  // Libellés relations
  const patientText = useMemo(
    () => labelPatient(item?.patient, item?.patient_id),
    [item]
  );
  const serviceText = useMemo(
    () => labelService(item?.service, item?.service_id),
    [item]
  );
  const visiteNode = useMemo(
    () => renderVisite(item?.visite, item?.visite_id),
    [item]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Détail acte médical"
        subtitle={item?.id ? `#${item.id}` : "Fiche & historique"}
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/medecines" className="hover:underline">Médecine</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Détail</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/medecines" className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
            <Link href={`/medecines/${id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 inline-flex items-center gap-1">
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          </div>
        </div>

        {busy && <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />}
        {!busy && err && <div className="rounded-xl border border-congo-red/30 bg-red-50 p-4 text-congo-red text-sm">{err}</div>}

        {!busy && item && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-6">
              <Card title="Général" icon={<IdCard className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <Field k="Date de l’acte" v={item.date_acte ? new Date(item.date_acte).toLocaleString() : "—"} />
                  <Field k="Statut" v={item.statut ?? "—"} />

                  {/* ⬇️ Données liées au lieu des IDs */}
                  <Field
                    k="Service"
                    v={
                      item?.service?.id ? (
                        <span title={String(item.service.id)}>{serviceText}</span>
                      ) : serviceText
                    }
                  />
                  <Field
                    k="Patient"
                    v={
                      item?.patient?.id ? (
                        <Link href={`/patients/${item.patient.id}`} className="hover:underline" title={`#${item.patient.id}`}>
                          {patientText}
                        </Link>
                      ) : patientText
                    }
                  />
                  <Field
                    k="Visite"
                    v={
                      item?.visite?.id ? (
                        <span title={String(item.visite.id)}>{visiteNode}</span>
                      ) : visiteNode
                    }
                  />
                  <Field k="Soignant" v={soignantNom} />
                </div>
              </Card>

              <Card title="Clinique" icon={<Stethoscope className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <Field k="Motif" v={item.motif ?? "—"} />
                  <Field k="Diagnostic" v={item.diagnostic ?? "—"} />
                  <Field k="Examen clinique" v={item.examen_clinique ?? "—"} />
                  <Field k="Traitements" v={item.traitements ?? "—"} />
                  <Field k="Observation" v={item.observation ?? "—"} />
                </div>
              </Card>

              <Card title="Signes vitaux" icon={<Activity className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                  <Field k="TA" v={item.tension_arterielle ?? "—"} />
                  <Field k="Température" v={item.temperature != null ? `${item.temperature} °C` : "—"} />
                  <Field k="Fréq. cardiaque" v={item.frequence_cardiaque ?? "—"} />
                  <Field k="Fréq. respiratoire" v={item.frequence_respiratoire ?? "—"} />
                </div>
              </Card>
            </section>

            <aside className="space-y-6">
              <Card title="Métadonnées" icon={<ClipboardList className="h-4 w-4" />}>
                <ul className="text-sm space-y-1">
                  <li><b>ID :</b> {item.id}</li>
                  <li><b>Créé le :</b> {item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</li>
                  <li><b>Mis à jour :</b> {item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}</li>
                </ul>
              </Card>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />

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
