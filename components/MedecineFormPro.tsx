// components/MedecineFormPro.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createMedecine,
  getMedecine,
  updateMedecine,
  listPatientsPaginated,
  listVisitesPaginated,
  getVisite,
  listAllServices,
  getPatient,
} from "@/lib/api";
import { Check, ChevronRight, Stethoscope, Users, Activity, ClipboardList } from "lucide-react";

/* ---------------- Types ---------------- */
type Props = { medecineId?: string; afterSavePath?: string; };

type Payload = {
  patient_id: string | null;
  visite_id: string | null;
  service_id: number | string | null;

  date_acte?: string | null;
  motif?: string | null;
  diagnostic?: string | null;
  examen_clinique?: string | null;
  traitements?: string | null;
  observation?: string | null;

  tension_arterielle?: string | null;
  temperature?: number | null;
  frequence_cardiaque?: number | null;
  frequence_respiratoire?: number | null;

  statut?: "en_cours" | "clos";
};

type PatientMini = { id: string; nom?: string; prenom?: string; numero_dossier?: string };
type VisiteMini = { id: string; heure_arrivee?: string; patient_id?: string; service_id?: number | null; medecin_id?: number | null };
type ServiceDTO = { id: number | string; name: string; slug?: string };

/* ---------------- Helpers ---------------- */
const inputCls =
  "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

function arrify(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
}
function nullifyEmpty<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === "" ? null : v;
  return out;
}
function formatPatient(p: PatientMini) {
  const nom = `${p.nom || ""} ${p.prenom || ""}`.trim() || p.id;
  return p.numero_dossier ? `${nom} (${p.numero_dossier})` : nom;
}
function ensureInArray<T extends { id: any }>(arr: T[], item: T | null | undefined): T[] {
  if (!item) return arr;
  const exists = arr.some(a => String(a.id) === String(item.id));
  return exists ? arr : [...arr, item];
}

/* ---------------- Steps ---------------- */
const steps = [
  { key: "who", label: "Patient & Visite", icon: Users },
  { key: "clinique", label: "Clinique", icon: Stethoscope },
  { key: "vitals", label: "Signes vitaux", icon: Activity },
  { key: "meta", label: "Statut & méta", icon: ClipboardList },
] as const;

/* ---------------- Component ---------------- */
export default function MedecineFormPro({ medecineId, afterSavePath = "/medecines" }: Props) {
  const router = useRouter();
  const isEdit = Boolean(medecineId);

  // State
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<Payload>({
    patient_id: null,
    visite_id: null,
    service_id: null,
    date_acte: "",
    motif: "",
    diagnostic: "",
    examen_clinique: "",
    traitements: "",
    observation: "",
    tension_arterielle: "",
    temperature: null,
    frequence_cardiaque: null,
    frequence_respiratoire: null,
    statut: "en_cours",
  });

  // Dropdowns
  const [pQ, setPQ] = useState(""); // recherche patients
  const [patients, setPatients] = useState<PatientMini[]>([]);
  const [visites, setVisites] = useState<VisiteMini[]>([]);
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [soignantNom, setSoignantNom] = useState<string>("—"); // dérivé de la visite (read-only)

  function upd<K extends keyof Payload>(k: K, v: Payload[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  /* ------ Charger fiche en édition + injecter valeurs dans les listes ------ */
  useEffect(() => {
    if (!isEdit || !medecineId) return;
    let abo = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res: any = await getMedecine(medecineId);
        const it = res?.data ?? res ?? {};

        const toDT = (s?: string | null) => (s ? String(s).slice(0, 16) : "");

        // Pré-remplissage du form
        const next: Payload = {
          patient_id: it.patient_id ?? null,
          visite_id: it.visite_id ?? null,
          service_id: it.service_id ?? null,
          date_acte: toDT(it.date_acte),
          motif: it.motif ?? "",
          diagnostic: it.diagnostic ?? "",
          examen_clinique: it.examen_clinique ?? "",
          traitements: it.traitements ?? "",
          observation: it.observation ?? "",
          tension_arterielle: it.tension_arterielle ?? "",
          temperature: it.temperature ?? null,
          frequence_cardiaque: it.frequence_cardiaque ?? null,
          frequence_respiratoire: it.frequence_respiratoire ?? null,
          statut: (it.statut ?? "en_cours") as any,
        };
        if (!abo) setData(next);

        // Soignant (lecture seule)
        const nom =
          it?.soignant?.full_name ||
          `${it?.soignant?.first_name || ""} ${it?.soignant?.last_name || ""}`.trim() ||
          "—";
        if (!abo) setSoignantNom(nom);

        // ⚠️ Assurer que les selects contiennent les valeurs courantes

        // 1) Patient courant
        if (next.patient_id) {
          try {
            const P: any = await getPatient(String(next.patient_id));
            const pr = P?.data ?? P ?? {};
            const patientItem: PatientMini = {
              id: String(pr.id ?? next.patient_id),
              nom: pr.nom ?? pr.last_name ?? "",
              prenom: pr.prenom ?? pr.first_name ?? "",
              numero_dossier: pr.numero_dossier ?? undefined,
            };
            if (!abo) setPatients(prev => ensureInArray(prev, patientItem));
          } catch {
            // en dernier recours on met un placeholder
            if (!abo) setPatients(prev => ensureInArray(prev, { id: String(next.patient_id) }));
          }
        }

        // 2) Visite courante
        if (next.visite_id) {
          try {
            const V: any = await getVisite(String(next.visite_id));
            const vr = V?.data ?? V ?? {};
            const visitItem: VisiteMini = {
              id: String(vr.id ?? next.visite_id),
              patient_id: vr.patient_id ?? next.patient_id ?? undefined,
              service_id: vr.service_id ?? null,
              heure_arrivee: vr.heure_arrivee ?? null,
            };
            if (!abo) setVisites(prev => ensureInArray(prev, visitItem));
            // si service non défini sur le form, prends celui de la visite
            if (!abo && !next.service_id && vr.service_id) {
              setData(d => ({ ...d, service_id: vr.service_id }));
            }
          } catch {
            if (!abo) setVisites(prev => ensureInArray(prev, { id: String(next.visite_id) }));
          }
        }
      } catch (e: any) {
        if (!abo) setError(e?.message || "Impossible de charger l'acte.");
      } finally {
        if (!abo) setLoading(false);
      }
    })();
    return () => { abo = true; };
  }, [isEdit, medecineId]);

  /* ------ Services (pour dropdown) ------ */
  useEffect(() => {
    let abo = false;
    (async () => {
      try {
        const raw = await listAllServices();
        const arr: ServiceDTO[] = arrify(raw).map((s: any) => ({
          id: s.id, name: s.name, slug: s.slug,
        }));
        // Si le service courant n'est pas dans la liste (pagination/filtre), on l'injecte en placeholder
        const withSelected = (curId?: number | string | null) => {
          if (!curId) return arr;
          const exists = arr.some(s => String(s.id) === String(curId));
          return exists ? arr : [...arr, { id: curId, name: String(curId), slug: undefined }];
        };
        if (!abo) setServices(withSelected(data.service_id));
      } catch {
        if (!abo) setServices(prev => prev);
      }
    })();
    return () => { abo = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.service_id]);

  /* ------ Patients: recherche live ------ */
  useEffect(() => {
    let abo = false;
    (async () => {
      try {
        const res: any = await listPatientsPaginated({ page: 1, per_page: 10, search: pQ });
        const arr = arrify(res) as PatientMini[];
        // Conserver l’item sélectionné même s’il n’est pas dans la recherche courante
        const merged = data.patient_id
          ? ensureInArray(arr, patients.find(p => String(p.id) === String(data.patient_id)) || patients.find(() => false) as any)
          : arr;
        if (!abo) setPatients(merged);
      } catch {
        if (!abo) setPatients(prev => prev);
      }
    })();
    return () => { abo = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pQ]);

  /* ------ Visites: liées au patient sélectionné ------ */
  useEffect(() => {
    let abo = false;
    (async () => {
      if (!data.patient_id) { if (!abo) setVisites([]); return; }
      try {
        const res: any = await listVisitesPaginated({ page: 1, per_page: 50, search: "" });
        const all = arrify(res) as VisiteMini[];
        const filtered = all.filter(v => String(v.patient_id) === String(data.patient_id));
        // Conserver la visite sélectionnée si elle n’apparait pas
        const merged = data.visite_id
          ? ensureInArray(filtered, visites.find(v => String(v.id) === String(data.visite_id)))
          : filtered;
        if (!abo) setVisites(merged);
      } catch {
        if (!abo) setVisites(prev => prev);
      }
    })();
    return () => { abo = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.patient_id]);

  /* ------ Quand on choisit une visite: afficher le soignant (dérivé) et proposer son service ------ */
  useEffect(() => {
    let abo = false;
    (async () => {
      if (!data.visite_id) { if (!abo) setSoignantNom("—"); return; }
      try {
        const v: any = await getVisite(String(data.visite_id));
        const R = v?.data ?? v ?? {};
        const nom =
          R.medecin_nom ||
          R.soignant_nom ||
          `${R.medecin?.first_name || ""} ${R.medecin?.last_name || ""}`.trim() ||
          "—";
        if (!abo) {
          setSoignantNom(nom);
          if (!data.service_id && R.service_id) setData(d => ({ ...d, service_id: R.service_id }));
          // injecte la visite choisie si absente (cas de patient switch)
          setVisites(prev => ensureInArray(prev, {
            id: String(R.id ?? data.visite_id),
            patient_id: R.patient_id ?? data.patient_id ?? undefined,
            service_id: R.service_id ?? null,
            heure_arrivee: R.heure_arrivee ?? null,
          }));
        }
      } catch {
        if (!abo) setSoignantNom("—");
      }
    })();
    return () => { abo = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.visite_id]);

  /* ------ Actions ------ */
  const progress = ((step + 1) / steps.length) * 100;
  const next = () => { if (step < steps.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const payload: any = nullifyEmpty({ ...data });
      delete payload.soignant_id; // 🔒 imposé par la visite côté back

      if (isEdit && medecineId) {
        await updateMedecine(medecineId, payload);
        router.replace(`/medecines/${medecineId}?flash=updated`);
      } else {
        await createMedecine(payload);
        router.replace(`${afterSavePath}?flash=created`);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l’enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm animate-pulse h-40" />;
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Étapes */}
      <aside className="lg:col-span-1">
        <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden sticky top-20">
          <div className="h-1 bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
          <div className="p-4">
            <div className="mb-3 text-sm font-semibold">{isEdit ? "Édition d’un acte" : "Nouvel acte médical"}</div>
            <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
              <div className="h-full bg-congo-green transition-all" style={{ width: `${progress}%` }} />
            </div>
            <ul className="mt-4 space-y-1">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const active = i === step;
                const done = i < step;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => setStep(i)}
                      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition
                        ${active ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/30" : done ? "text-ink-700 hover:bg-ink-50" : "text-ink-500 hover:bg-ink-50"}`}
                    >
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

            {error && (
              <div className="mt-4 rounded-lg border border-congo-red/30 bg-[color:var(--color-congo-red)]/10 p-2.5 text-sm text-congo-red">
                {error}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Champs */}
      <section className="lg:col-span-2 space-y-6">
        {/* Step 1: Patient & Visite */}
        {step === 0 && (
          <Card title="Patient & Visite" icon={<Users className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Patient */}
              <Field label="Rechercher un patient">
                <input
                  className={inputCls}
                  placeholder="nom / prénom / n° dossier…"
                  value={pQ}
                  onChange={(e) => setPQ(e.target.value)}
                />
              </Field>
              <Field label="Patient" required>
                <select
                  className={inputCls}
                  value={String(data.patient_id ?? "")}
                  onChange={(e) => {
                    const pid = e.target.value || null;
                    setVisites([]);               // reset visites list
                    upd("patient_id", pid);
                    upd("visite_id", null);       // force re-sélection
                  }}
                  required
                >
                  <option value="">— Sélectionner —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{formatPatient(p)}</option>
                  ))}
                </select>
              </Field>

              {/* Visite du patient */}
              <Field label="Visite (du patient choisi)">
                <select
                  className={inputCls}
                  value={String(data.visite_id ?? "")}
                  onChange={(e) => upd("visite_id", e.target.value || null)}
                >
                  <option value="">— Sélectionner —</option>
                  {visites.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.heure_arrivee ? new Date(v.heure_arrivee).toLocaleString() : v.id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-500 mt-1">Le soignant est déduit automatiquement de la visite.</p>
                <div className="mt-1 text-xs text-ink-700"><b>Soignant (lecture seule):</b> {soignantNom}</div>
              </Field>

              {/* Service (optionnel si déduit par la visite) */}
              <Field label="Service (optionnel)">
                <select
                  className={inputCls}
                  value={String(data.service_id ?? "")}
                  onChange={(e) => upd("service_id", e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">—</option>
                  {services.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </Field>

              {/* Date */}
              <Field label="Date de l’acte">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={data.date_acte ?? ""}
                  onChange={(e) => upd("date_acte", e.target.value || null)}
                />
              </Field>
            </div>
          </Card>
        )}

        {/* Step 2: Clinique */}
        {step === 1 && (
          <Card title="Clinique" icon={<Stethoscope className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Motif">
                <input className={inputCls} value={data.motif ?? ""} onChange={(e) => upd("motif", e.target.value || null)} />
              </Field>
              <Field label="Diagnostic">
                <input className={inputCls} value={data.diagnostic ?? ""} onChange={(e) => upd("diagnostic", e.target.value || null)} />
              </Field>
              <Field label="Examen clinique" className="sm:col-span-2">
                <textarea rows={3} className={inputCls} value={data.examen_clinique ?? ""} onChange={(e) => upd("examen_clinique", e.target.value || null)} />
              </Field>
              <Field label="Traitements" className="sm:col-span-2">
                <textarea rows={3} className={inputCls} value={data.traitements ?? ""} onChange={(e) => upd("traitements", e.target.value || null)} />
              </Field>
              <Field label="Observation" className="sm:col-span-2">
                <textarea rows={3} className={inputCls} value={data.observation ?? ""} onChange={(e) => upd("observation", e.target.value || null)} />
              </Field>
            </div>
          </Card>
        )}

        {/* Step 3: Signes vitaux */}
        {step === 2 && (
          <Card title="Signes vitaux" icon={<Activity className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="Tension artérielle">
                <input className={inputCls} value={data.tension_arterielle ?? ""} onChange={(e) => upd("tension_arterielle", e.target.value || null)} placeholder="120/80" />
              </Field>
              <Field label="Température (°C)">
                <input type="number" step="0.1" className={inputCls} value={data.temperature ?? ("" as any)} onChange={(e) => upd("temperature", e.target.value === "" ? null : Number(e.target.value))} />
              </Field>
              <Field label="Fréq. cardiaque">
                <input type="number" className={inputCls} value={data.frequence_cardiaque ?? ("" as any)} onChange={(e) => upd("frequence_cardiaque", e.target.value === "" ? null : Number(e.target.value))} />
              </Field>
              <Field label="Fréq. respiratoire">
                <input type="number" className={inputCls} value={data.frequence_respiratoire ?? ("" as any)} onChange={(e) => upd("frequence_respiratoire", e.target.value === "" ? null : Number(e.target.value))} />
              </Field>
            </div>
          </Card>
        )}

        {/* Step 4: Statut / Actions */}
        {step === 3 && (
          <Card title="Statut & méta" icon={<ClipboardList className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Statut">
                <select
                  className={inputCls}
                  value={data.statut ?? "en_cours"}
                  onChange={(e) => upd("statut", e.target.value as any)}
                >
                  <option value="en_cours">en_cours</option>
                  <option value="clos">clos</option>
                </select>
              </Field>
            </div>
          </Card>
        )}

        {/* Barre d’actions */}
        <div className="sticky bottom-4 z-10">
          <div className="rounded-xl bg-white/90 backdrop-blur border border-ink-100 shadow p-3 flex items-center justify-between">
            <div className="text-xs text-ink-600">
              Étape <b>{step + 1}</b> / {steps.length}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50"
                  onClick={prev}
                >
                  Précédent
                </button>
              )}
              {step < steps.length - 1 ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  onClick={next}
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {busy ? "Enregistrement…" : "Enregistrer"} <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}

/* --- UI helpers --- */
function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">{icon}<h3 className="text-sm font-semibold">{title}</h3></div>
      {children}
    </section>
  );
}
function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-ink-600">
        {label} {required && <span className="text-congo-red">*</span>}
      </label>
      {children}
    </div>
  );
}
