// components/PatientFormPro.tsx
"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, User, Phone, Calendar, Shield, Syringe, Heart, MapPin } from "lucide-react";
import { createPatient } from "@/lib/api";
import { useRouter } from "next/navigation";

type Payload = {
  nom: string;
  prenom: string;
  date_naissance: string;                 // "YYYY-MM-DD" ou ""
  lieu_naissance: string;
  age_reporte?: string;                   // saisie libre, on convertit en number
  sexe: "M" | "F";                        // (ajoute "X" si votre back l’utilise)
  nationalite: string;
  profession: string;
  adresse: string;
  quartier: string;
  telephone: string;
  statut_matrimonial: "celibataire" | "marie" | "veuf" | "divorce" | "";
  proche_nom: string;
  proche_tel: string;
  groupe_sanguin: "A+"|"A-"|"B+"|"B-"|"AB+"|"AB-"|"O+"|"O-"|"";
  allergies: string;
  assurance_id?: string;
  numero_assure?: string;
  is_active: boolean;
};

const steps = [
  { key: "identite", label: "Identité", icon: User },
  { key: "naissance_contact", label: "Naissance & Contact", icon: Calendar },
  { key: "infos_civiles", label: "Infos civiles", icon: MapPin },
  { key: "proche_assurance", label: "Proche & Assurance", icon: Shield },
  { key: "allergies_recap", label: "Allergies & Récap", icon: Heart },
] as const;

function computeAge(dateISO?: string) {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

function nullifyEmpty<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === undefined) out[k] = null;
    else out[k] = v;
  }
  return out;
}

export default function PatientFormPro() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Payload>({
    nom: "",
    prenom: "",
    date_naissance: "",
    lieu_naissance: "",
    age_reporte: "",
    sexe: "M",
    nationalite: "Congolaise",
    profession: "",
    adresse: "",
    quartier: "",
    telephone: "+242 ",
    statut_matrimonial: "",
    proche_nom: "",
    proche_tel: "+242 ",
    groupe_sanguin: "",
    allergies: "",
    assurance_id: "",
    numero_assure: "",
    is_active: true,
  });

  const progress = ((step + 1) / steps.length) * 100;
  const ageAuto = useMemo(() => computeAge(data.date_naissance), [data.date_naissance]);
  const ageAffiche = data.date_naissance ? ageAuto : (data.age_reporte || "");

  function upd<K extends keyof Payload>(k: K, v: Payload[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function telMask(v: string) {
    return v.replace(/[^\d+ ]/g, "");
  }

  function next() { if (step < steps.length - 1) setStep(step + 1); }
  function prev() { if (step > 0) setStep(step - 1); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Payload aligné migration (null si vide, number pour age_reporte)
      const payloadRaw = {
        nom: data.nom.trim(),
        prenom: data.prenom.trim(),
        date_naissance: data.date_naissance || null,
        lieu_naissance: data.lieu_naissance || null,
        age_reporte: data.date_naissance ? null : (data.age_reporte ? Number(data.age_reporte) : null),
        sexe: data.sexe as "M" | "F", // ajoute "X" si besoin
        nationalite: data.nationalite || null,
        profession: data.profession || null,
        adresse: data.adresse || null,
        quartier: data.quartier || null,
        telephone: data.telephone || null,
        statut_matrimonial: data.statut_matrimonial || null,
        proche_nom: data.proche_nom || null,
        proche_tel: data.proche_tel || null,
        groupe_sanguin: data.groupe_sanguin || null,
        allergies: data.allergies || null,
        assurance_id: data.assurance_id || null,
        numero_assure: data.numero_assure || null,
        is_active: !!data.is_active,
      };
      const payload = nullifyEmpty(payloadRaw);

      await createPatient(payload);

      // ✅ Redirection vers la liste + “flash message”
      router.replace("/patients?flash=created");
    } catch (err: any) {
      alert("Erreur: " + (err?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Colonne gauche : étapes & progression */}
      <aside className="lg:col-span-1">
        <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden sticky top-20">
          <div className="h-1 bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
          <div className="p-4">
            <div className="mb-3 text-sm font-semibold">Progression</div>
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
                        ${active ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/30" :
                          done ? "text-ink-700 hover:bg-ink-50" :
                          "text-ink-500 hover:bg-ink-50"}`}
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

            {/* Résumé live */}
            <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50 p-3 text-sm">
              <div className="font-medium text-ink-800">Résumé</div>
              <div className="mt-1 space-y-1 text-ink-700">
                <div><b>Patient :</b> {data.nom || "—"} {data.prenom || ""}</div>
                <div><b>Âge :</b> {ageAffiche || "—"}</div>
                <div><b>Sexe :</b> {data.sexe}</div>
                <div><b>Groupe :</b> {data.groupe_sanguin || "—"}</div>
                <div><b>Tél :</b> {data.telephone.trim() || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Colonne droite : contenu des étapes */}
      <section className="lg:col-span-2 space-y-6">
        {/* Étape 1 : Identité */}
        {step === 0 && (
          <Card title="Identité du patient" icon={<User className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Nom" required>
                <input className={inputCls} value={data.nom} onChange={e=>upd("nom", e.target.value.toUpperCase())} placeholder="NGOMA" />
              </Field>
              <Field label="Prénom" required>
                <input className={inputCls} value={data.prenom} onChange={e=>upd("prenom", e.target.value)} placeholder="Pierre" />
              </Field>
              <Field label="Sexe" required>
                <select className={inputCls} value={data.sexe} onChange={e=>upd("sexe", e.target.value as "M"|"F")}>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                  {/* <option value="X">Non spécifié</option> */}
                </select>
              </Field>
            </div>
          </Card>
        )}

        {/* Étape 2 : Naissance & Contact */}
        {step === 1 && (
          <Card title="Naissance & Contact" icon={<Calendar className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="Date de naissance">
                <input type="date" className={inputCls} value={data.date_naissance} onChange={e=>upd("date_naissance", e.target.value)} />
              </Field>
              <Field label="Âge (auto ou reporté)">
                <input disabled className="mt-1 w-full rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-sm" value={ageAffiche} placeholder="—" />
                {!data.date_naissance && (
                  <input type="number" min={0} className={inputCls + " mt-2"} value={data.age_reporte} onChange={e=>upd("age_reporte", e.target.value)} placeholder="Âge reporté" />
                )}
              </Field>
              <Field label="Lieu de naissance" className="sm:col-span-2">
                <input className={inputCls} value={data.lieu_naissance} onChange={e=>upd("lieu_naissance", e.target.value)} placeholder="Ville, pays" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <Field label="Téléphone" required icon={<Phone className="h-4 w-4 text-ink-400" />}>
                <input className={inputCls + " pl-9"} value={data.telephone} onChange={e=>upd("telephone", telMask(e.target.value))} placeholder="+242 06 000 0000" />
              </Field>
              <Field label="Adresse">
                <input className={inputCls} value={data.adresse} onChange={e=>upd("adresse", e.target.value)} placeholder="Rue, n°, complément" />
              </Field>
              <Field label="Quartier">
                <input className={inputCls} value={data.quartier} onChange={e=>upd("quartier", e.target.value)} placeholder="Ex : Talangaï" />
              </Field>
            </div>
          </Card>
        )}

        {/* Étape 3 : Infos civiles */}
        {step === 2 && (
          <Card title="Informations civiles" icon={<MapPin className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="Nationalité">
                <input className={inputCls} value={data.nationalite} onChange={e=>upd("nationalite", e.target.value)} />
              </Field>
              <Field label="Profession">
                <input className={inputCls} value={data.profession} onChange={e=>upd("profession", e.target.value)} />
              </Field>
              <Field label="Statut matrimonial">
                <select className={inputCls} value={data.statut_matrimonial} onChange={e=>upd("statut_matrimonial", e.target.value as any)}>
                  <option value="">—</option>
                  <option value="celibataire">Célibataire</option>
                  <option value="marie">Marié(e)</option>
                  <option value="veuf">Veuf/Veuve</option>
                  <option value="divorce">Divorcé(e)</option>
                </select>
              </Field>
              <Field label="Groupe sanguin">
                <select className={inputCls} value={data.groupe_sanguin} onChange={e=>upd("groupe_sanguin", e.target.value as any)}>
                  <option value="">—</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g=> <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
            </div>
          </Card>
        )}

        {/* Étape 4 : Proche & Assurance */}
        {step === 3 && (
          <Card title="Personne à contacter & Assurance" icon={<Shield className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Proche à prévenir">
                <input className={inputCls} value={data.proche_nom} onChange={e=>upd("proche_nom", e.target.value)} placeholder="Nom complet" />
              </Field>
              <Field label="Téléphone du proche">
                <input className={inputCls} value={data.proche_tel} onChange={e=>upd("proche_tel", telMask(e.target.value))} placeholder="+242 06 000 0000" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <Field label="Assurance (ID)">
                <input className={inputCls} value={data.assurance_id} onChange={e=>upd("assurance_id", e.target.value)} placeholder="UUID assurance (optionnel)" />
              </Field>
              <Field label="Numéro d’assuré">
                <input className={inputCls} value={data.numero_assure} onChange={e=>upd("numero_assure", e.target.value)} placeholder="N° de police" />
              </Field>
              <Field label="Statut">
                <select className={inputCls} value={data.is_active ? "actif" : "inactif"} onChange={e=>upd("is_active", e.target.value === "actif")}>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </Field>
            </div>
          </Card>
        )}

        {/* Étape 5 : Allergies & Récap */}
        {step === 4 && (
          <Card title="Allergies & Récapitulatif" icon={<Syringe className="h-4 w-4" />}>
            <Field label="Allergies" className="sm:col-span-2">
              <textarea rows={4} className={inputCls} value={data.allergies} onChange={e=>upd("allergies", e.target.value)} placeholder="Ex : pénicilline, arachide…" />
            </Field>

            <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50 p-4 text-sm">
              <div className="font-semibold text-ink-800 mb-1">Récapitulatif</div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-ink-700">
                <li><b>Nom:</b> {data.nom || "—"} {data.prenom || ""}</li>
                <li><b>Âge:</b> {ageAffiche || "—"}</li>
                <li><b>Sexe:</b> {data.sexe}</li>
                <li><b>Tél:</b> {data.telephone || "—"}</li>
                <li><b>Adresse:</b> {data.adresse || "—"} ({data.quartier || "—"})</li>
                <li><b>Groupe sanguin:</b> {data.groupe_sanguin || "—"}</li>
              </ul>
              <p className="mt-2 text-ink-600 text-xs">
                Le <b>numéro de dossier</b> sera généré automatiquement côté serveur.
              </p>
            </div>
          </Card>
        )}

        {/* Actions navigation */}
        <div className="sticky bottom-4 z-10">
          <div className="rounded-xl bg-white/90 backdrop-blur border border-ink-100 shadow p-3 flex items-center justify-between">
            <div className="text-xs text-ink-600">
              Étape <b>{step + 1}</b> / {steps.length}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button type="button" className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50" onClick={prev}>
                  Précédent
                </button>
              )}
              {step < steps.length - 1 ? (
                <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-congo-green/30" onClick={next}>
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-congo-green/30 disabled:opacity-60"
                >
                  {busy ? "Enregistrement…" : "Enregistrer le patient"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}

/* ------------------- UI helpers ------------------- */

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

function Field({ label, required, icon, className, children }: { label: string; required?: boolean; icon?: React.ReactNode; className?: string; children: React.ReactNode; }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-ink-600">
        {label} {required && <span className="text-congo-red">*</span>}
      </label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";
