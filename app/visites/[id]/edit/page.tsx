// app/visites/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getVisite, updateVisite, listServices, listPatientsPaginated, ServiceDTO } from "@/lib/api";
import { ArrowLeft, Check, ChevronRight, UserSearch, Building2, ClipboardList } from "lucide-react";

type PatientRow = { id: string; numero_dossier: string; nom: string; prenom: string };

const steps = [
  { key: "patient", label: "Patient", icon: UserSearch },
  { key: "service", label: "Service", icon: Building2 },
  { key: "motif", label: "Motif", icon: ClipboardList },
] as const;

export default function VisiteEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [serviceId, setServiceId] = useState<number | "">("");
  const [motif, setMotif] = useState("");

  const [q, setQ] = useState("");
  const [patientResults, setPatientResults] = useState<PatientRow[]>([]);
  const [services, setServices] = useState<ServiceDTO[]>([]);

  // Garde
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/visites/${id}/edit`); return; }
    me().catch(() => window.location.replace(`/login?next=/visites/${id}/edit`));
  }, [id]);

  // Charger services + visite
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const rawS = await listServices();
        const arr: ServiceDTO[] = Array.isArray(rawS) ? rawS : (rawS.data ?? rawS ?? []);
        setServices(arr.filter(s => s.is_active !== false));

        const v = (await getVisite(id)) as any;
        const visite = v?.data ?? v;
        setMotif(visite.plaintes_motif || "");
        setServiceId(visite.service_id || visite.service?.id || "");
        if (visite.patient) {
          setSelectedPatient({
            id: visite.patient.id,
            nom: visite.patient.nom,
            prenom: visite.patient.prenom,
            numero_dossier: visite.patient.numero_dossier || "",
          });
        } else {
          // fallback minimal si pas d'inclusion
          setSelectedPatient({ id: visite.patient_id, nom: "", prenom: "", numero_dossier: "" });
        }
      } finally { setLoading(false); }
    })();
  }, [id]);

  // Recherche patients
  useEffect(() => {
    const tid = setTimeout(async () => {
      if (!q.trim()) { setPatientResults([]); return; }
      try {
        const res: any = await listPatientsPaginated({ page: 1, per_page: 8, search: q.trim() });
        setPatientResults(Array.isArray(res) ? res : (res.data ?? []));
      } catch { setPatientResults([]); }
    }, 250);
    return () => clearTimeout(tid);
  }, [q]);

  function next() { if (step < steps.length - 1) setStep(step + 1); }
  function prev() { if (step > 0) setStep(step - 1); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient?.id) { alert("Sélectionne un patient."); return; }
    if (!serviceId) { alert("Choisis un service."); return; }
    if (!motif.trim()) { alert("Le motif est requis."); return; }
    setBusy(true);
    try {
      await updateVisite(id, {
        patient_id: selectedPatient.id,
        service_id: Number(serviceId),
        plaintes_motif: motif.trim(),
      });
      router.replace(`/visites/${id}`); // retour détail
    } catch (err: any) {
      alert("Erreur: " + (err?.message || "inconnue"));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Modifier la visite"
        subtitle="Mettre à jour les informations"
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/visites" className="hover:underline">Visites</Link></li>
              <li aria-hidden>/</li>
              <li><Link href={`/visites/${id}`} className="hover:underline">Détail</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Modifier</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2">
            <Link href={`/visites/${id}`} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Annuler
            </Link>
            <button form="visite-edit-form" type="submit" className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
              Enregistrer
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />
        ) : (
          <form id="visite-edit-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Étapes */}
            <aside className="lg:col-span-1">
              <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden sticky top-20">
                <div className="h-1 bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
                <div className="p-4">
                  <div className="mb-3 text-sm font-semibold">Progression</div>
                  <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
                    <div className="h-full bg-congo-green transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
                  </div>
                  <ul className="mt-4 space-y-1">
                    {steps.map((s, i) => {
                      const Icon = s.icon; const active = i === step; const done = i < step;
                      return (
                        <li key={s.key}>
                          <button type="button" onClick={() => setStep(i)}
                            className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition
                              ${active ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/30" :
                                done ? "text-ink-700 hover:bg-ink-50" : "text-ink-500 hover:bg-ink-50"}`}>
                            <span className={`h-5 w-5 rounded-md flex items-center justify-center
                              ${active ? "bg-congo-green text-white" : done ? "bg-ink-200 text-ink-800" : "bg-ink-100 text-ink-600"}`}>
                              {done ? <Check className="h-3 w-3" /> : <Icon className="h-3.5 w-3.5" />}
                            </span>
                            {s.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </aside>

            {/* Champs */}
            <section className="lg:col-span-2 space-y-6">
              {step === 0 && (
                <Card title="Sélection du patient" subtitle="Recherche par nom, prénom ou n° de dossier">
                  <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Ex : NGOMA, Pierre, HSP-..." className={inputCls} />
                  <div className="rounded-xl border border-ink-100 bg-white p-2 mt-2">
                    {patientResults.length === 0 ? (
                      <div className="p-3 text-sm text-ink-500">Tape pour chercher un patient…</div>
                    ) : (
                      <ul className="divide-y divide-ink-100">
                        {patientResults.map(p => (
                          <li key={p.id} className="py-2 px-2 flex items-center justify-between">
                            <div className="text-sm">
                              <div className="font-medium">{p.nom} {p.prenom}</div>
                              <div className="text-ink-500 text-xs">{p.numero_dossier}</div>
                            </div>
                            <button type="button" onClick={()=>{ setSelectedPatient(p); next(); }}
                              className="rounded-md bg-congo-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                              Sélectionner
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {selectedPatient && <p className="text-sm text-ink-700 mt-2">Sélection : <b>{selectedPatient.nom} {selectedPatient.prenom}</b> ({selectedPatient.numero_dossier || selectedPatient.id})</p>}
                </Card>
              )}

              {step === 1 && (
                <Card title="Service d’orientation" subtitle="Choisis le service concerné">
                  <select className={inputCls} value={serviceId} onChange={e=>setServiceId(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">— Choisir un service —</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Card>
              )}

              {step === 2 && (
                <Card title="Motif / Plaintes" subtitle="Décris brièvement la raison de la visite">
                  <textarea rows={5} className={inputCls} value={motif} onChange={e=>setMotif(e.target.value)} placeholder="Ex : Pansement de contrôle" />
                </Card>
              )}

              {/* Actions */}
              <div className="sticky bottom-4 z-10">
                <div className="rounded-xl bg-white/90 backdrop-blur border border-ink-100 shadow p-3 flex items-center justify-between">
                  <div className="text-xs text-ink-600">Étape <b>{step + 1}</b> / {steps.length}</div>
                  <div className="flex items-center gap-2">
                    {step > 0 && <button type="button" className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50" onClick={prev}>Précédent</button>}
                    {step < steps.length - 1 ? (
                      <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700" onClick={next}>
                        Suivant <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button type="submit" disabled={busy} className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                        {busy ? "Enregistrement…" : "Enregistrer les modifications"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </form>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode; }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
        {subtitle && <p className="text-xs text-ink-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";
