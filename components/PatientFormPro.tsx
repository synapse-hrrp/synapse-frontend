// components/PatientFormPro.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getPatient, createPatient, updatePatient } from "@/lib/api";
import { Check, ChevronRight, User, MapPin, Phone, Briefcase, FileText } from "lucide-react";

/* ---------------- Types ---------------- */

type Props = {
  /** si présent => mode édition (et on charge depuis l'API sauf si initialData fourni) */
  patientId?: string;
  /** si fourni, on évite un fetch et on préremplit directement */
  initialData?: any;
  /** où rediriger après sauvegarde */
  afterSavePath?: string;
};

type PatientPayload = {
  // Identité
  nom: string;
  prenom: string;
  date_naissance: string;                 // "YYYY-MM-DD" | ""
  lieu_naissance: string;
  age_reporte?: string;                   // texte/nombre (libre)
  sexe: "M" | "F" | "X";
  nationalite: string;
  profession: string;

  // Adresse & contact
  adresse: string;
  quartier: string;
  telephone: string;

  // État civil
  statut_matrimonial: "celibataire" | "marie" | "veuf" | "divorce" | "";

  // Proche
  proche_nom: string;
  proche_tel: string;

  // Médical
  groupe_sanguin: "A+"|"A-"|"B+"|"B-"|"AB+"|"AB-"|"O+"|"O-"|"";
  allergies: string;

  // Assurance
  assurance_id?: string;
  numero_assure?: string;

  // Divers
  numero_dossier?: string;
  is_active: boolean;
};

const steps = [
  { key: "identite",  label: "Identité",               icon: User },
  { key: "contact",   label: "Contact & Adresse",      icon: Phone },
  { key: "etatcivil", label: "État civil & Proche",    icon: Briefcase },
  { key: "medical",   label: "Infos médicales",        icon: FileText },
] as const;

/* ---------------- Helpers ---------------- */

function onlyDatePart(v?: string | null): string {
  if (!v) return "";
  // accepte "YYYY-MM-DD" ou timestamp "YYYY-MM-DDTHH:mm:ss..."
  const m = String(v).match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : "";
}

function normalizeFromApi(raw: any): PatientPayload {
  const it = raw ?? {};
  return {
    nom: it.nom ?? "",
    prenom: it.prenom ?? "",
    date_naissance: onlyDatePart(it.date_naissance),
    lieu_naissance: it.lieu_naissance ?? "",
    age_reporte: it.age_reporte != null ? String(it.age_reporte) : "",
    sexe: (it.sexe ?? "X") as "M" | "F" | "X",
    nationalite: it.nationalite ?? "",
    profession: it.profession ?? "",
    adresse: it.adresse ?? "",
    quartier: it.quartier ?? "",
    telephone: it.telephone ?? "",
    statut_matrimonial: (it.statut_matrimonial ?? "") as PatientPayload["statut_matrimonial"],
    proche_nom: it.proche_nom ?? "",
    proche_tel: it.proche_tel ?? "",
    groupe_sanguin: (it.groupe_sanguin ?? "") as PatientPayload["groupe_sanguin"],
    allergies: it.allergies ?? "",
    assurance_id: it.assurance_id ?? "",
    numero_assure: it.numero_assure ?? "",
    numero_dossier: it.numero_dossier ?? "",
    is_active: Boolean(it.is_active ?? true),
  };
}

function nullifyEmpty<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" || v === undefined ? null : v;
  }
  return out;
}

/* ---------------- Component ---------------- */

export default function PatientFormPro({
  patientId,
  initialData,
  afterSavePath = "/reception/patients",
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(patientId);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit && !initialData);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<PatientPayload>(() =>
    initialData ? normalizeFromApi(initialData) : {
      nom: "", prenom: "", date_naissance: "", lieu_naissance: "", age_reporte: "",
      sexe: "X", nationalite: "", profession: "",
      adresse: "", quartier: "", telephone: "",
      statut_matrimonial: "", proche_nom: "", proche_tel: "",
      groupe_sanguin: "", allergies: "",
      assurance_id: "", numero_assure: "", numero_dossier: "",
      is_active: true,
    }
  );

  // Charger depuis l'API en édition si pas d'initialData
  useEffect(() => {
    if (!isEdit || !patientId || initialData) return;
    let abo = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res: any = await getPatient(patientId);
        const raw = res?.data?.data ?? res?.data ?? res;
        if (!abo) setData(normalizeFromApi(raw));
      } catch (e: any) {
        if (!abo) setError(e?.message || "Impossible de charger le patient.");
      } finally {
        if (!abo) setLoading(false);
      }
    })();
    return () => { abo = true; };
  }, [isEdit, patientId, initialData]);

  function upd<K extends keyof PatientPayload>(k: K, v: PatientPayload[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  const age = useMemo(() => {
    if (!data.date_naissance) return data.age_reporte || "—";
    const d = new Date(data.date_naissance + "T00:00:00");
    if (isNaN(d.getTime())) return data.age_reporte || "—";
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a >= 0 ? String(a) : (data.age_reporte || "—");
  }, [data.date_naissance, data.age_reporte]);

  const progress = ((step + 1) / steps.length) * 100;
  const next = () => setStep(s => Math.min(steps.length - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      // Nettoyage : strings vides -> null (Laravel)
      const payload = nullifyEmpty({ ...data });

      if (isEdit && patientId) await updatePatient(patientId, payload);
      else await createPatient(payload);

      router.replace(afterSavePath);
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
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Étapes */}
      <aside className="lg:col-span-1">
        <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden sticky top-20">
          <div className="h-1 bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
          <div className="p-4">
            <div className="mb-3 text-sm font-semibold">{isEdit ? "Édition" : "Nouveau patient"}</div>
            <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
              <div className="h-full bg-congo-green transition-all" style={{ width: `${progress}%` }} />
            </div>
            <ul className="mt-4 space-y-1">
              {steps.map((s, i) => {
                const Icon = s.icon; const active = i === step; const done = i < step;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => setStep(i)}
                      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition
                        ${active ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/30"
                                 : done ? "text-ink-700 hover:bg-ink-50"
                                        : "text-ink-500 hover:bg-ink-50"}`}
                    >
                      <span className={`h-5 w-5 rounded-md flex items-center justify-center
                        ${active ? "bg-congo-green text-white"
                                 : done ? "bg-ink-200 text-ink-800"
                                        : "bg-ink-100 text-ink-600"}`}>
                        {done ? <Check className="h-3 w-3" /> : <Icon className="h-3.5 w-3.5" />}
                      </span>
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Résumé */}
            <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50 p-3 text-sm">
              <div className="font-medium text-ink-800">Résumé</div>
              <div className="mt-1 space-y-1 text-ink-700">
                <div><b>Nom :</b> {(data.nom || "—") + " " + (data.prenom || "")}</div>
                <div><b>Âge :</b> {age}</div>
                <div><b>Téléphone :</b> {data.telephone || "—"}</div>
                <div><b>Groupe :</b> {data.groupe_sanguin || "—"}</div>
              </div>
            </div>

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
        {/* Identité */}
        {step === 0 && (
          <Card title="Identité" icon={<User className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Nom" required>
                <input className={inputCls} value={data.nom} onChange={e => upd("nom", e.target.value.toUpperCase())} placeholder="NGOMA" required />
              </Field>
              <Field label="Prénom" required>
                <input className={inputCls} value={data.prenom} onChange={e => upd("prenom", e.target.value)} placeholder="Pierre" required />
              </Field>
              <Field label="Sexe" required>
                <select className={inputCls} value={data.sexe} onChange={e => upd("sexe", e.target.value as any)} required>
                  <option value="M">M</option>
                  <option value="F">F</option>
                  <option value="X">X</option>
                </select>
              </Field>

              <Field label="Date de naissance">
                <input type="date" className={inputCls} value={data.date_naissance} onChange={e => upd("date_naissance", e.target.value)} />
              </Field>
              <Field label="Âge reporté (texte)">
                <input className={inputCls} value={data.age_reporte ?? ""} onChange={e => upd("age_reporte", e.target.value)} placeholder="ex: 34" />
              </Field>
              <Field label="Lieu de naissance">
                <input className={inputCls} value={data.lieu_naissance} onChange={e => upd("lieu_naissance", e.target.value)} />
              </Field>

              <Field label="Nationalité">
                <input className={inputCls} value={data.nationalite} onChange={e => upd("nationalite", e.target.value)} />
              </Field>
              <Field label="Profession">
                <input className={inputCls} value={data.profession} onChange={e => upd("profession", e.target.value)} />
              </Field>
              <Field label="Actif ?">
                <select className={inputCls} value={String(data.is_active)} onChange={e => upd("is_active", e.target.value === "true")}>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </Field>
            </div>
          </Card>
        )}

        {/* Contact & Adresse */}
        {step === 1 && (
          <Card title="Contact & Adresse" icon={<MapPin className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Téléphone">
                <input className={inputCls} value={data.telephone} onChange={e => upd("telephone", e.target.value)} placeholder="+242 06 000 0000" />
              </Field>
              <Field label="Adresse">
                <input className={inputCls} value={data.adresse} onChange={e => upd("adresse", e.target.value)} />
              </Field>
              <Field label="Quartier">
                <input className={inputCls} value={data.quartier} onChange={e => upd("quartier", e.target.value)} />
              </Field>
              <Field label="N° dossier">
                <input className={inputCls} value={data.numero_dossier ?? ""} onChange={e => upd("numero_dossier", e.target.value)} placeholder="D-0001" />
              </Field>
            </div>
          </Card>
        )}

        {/* État civil & Proche */}
        {step === 2 && (
          <Card title="État civil & Proche" icon={<Briefcase className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Statut matrimonial">
                <select className={inputCls} value={data.statut_matrimonial} onChange={e => upd("statut_matrimonial", e.target.value as any)}>
                  <option value="">—</option>
                  <option value="celibataire">Célibataire</option>
                  <option value="marie">Marié(e)</option>
                  <option value="veuf">Veuf/Veuve</option>
                  <option value="divorce">Divorcé(e)</option>
                </select>
              </Field>
              <Field label="Nom du proche">
                <input className={inputCls} value={data.proche_nom} onChange={e => upd("proche_nom", e.target.value)} />
              </Field>
              <Field label="Téléphone du proche">
                <input className={inputCls} value={data.proche_tel} onChange={e => upd("proche_tel", e.target.value)} />
              </Field>
            </div>
          </Card>
        )}

        {/* Infos médicales */}
        {step === 3 && (
          <Card title="Informations médicales" icon={<FileText className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Groupe sanguin">
                <select className={inputCls} value={data.groupe_sanguin} onChange={e => upd("groupe_sanguin", e.target.value as any)}>
                  <option value="">—</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                </select>
              </Field>
              <Field label="Allergies">
                <input className={inputCls} value={data.allergies} onChange={e => upd("allergies", e.target.value)} placeholder="Aucune / Pénicilline / …" />
              </Field>
              <Field label="Assurance (ID)">
                <input className={inputCls} value={data.assurance_id ?? ""} onChange={e => upd("assurance_id", e.target.value)} />
              </Field>
              <Field label="Numéro assuré">
                <input className={inputCls} value={data.numero_assure ?? ""} onChange={e => upd("numero_assure", e.target.value)} />
              </Field>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="sticky bottom-4 z-10">
          <div className="rounded-xl bg-white/90 backdrop-blur border border-ink-100 shadow p-3 flex items-center justify-between">
            <div className="text-xs text-ink-600">Étape <b>{step + 1}</b> / {steps.length}</div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button type="button" className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50" onClick={prev}>
                  Précédent
                </button>
              )}
              {step < steps.length - 1 ? (
                <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700" onClick={next}>
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={busy} className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                  {busy ? "Enregistrement…" : (isEdit ? "Mettre à jour" : "Enregistrer")}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-congo-red">{error}</p>}
      </section>
    </form>
  );
}

/* ---------------- UI helpers ---------------- */

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">{icon}<h3 className="text-sm font-semibold">{title}</h3></div>
      {children}
    </section>
  );
}
function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode; }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-ink-600">
        {label} {required && <span className="text-congo-red">*</span>}
      </label>
      {children}
    </div>
  );
}
const inputCls =
  "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";
