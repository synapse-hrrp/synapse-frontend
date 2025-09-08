// app/patients/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getPatient, updatePatient } from "@/lib/api";
import { ArrowLeft, Check, ChevronRight, User, Phone, Calendar, Shield, Syringe, Heart, MapPin } from "lucide-react";

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
};

type Payload = {
  nom: string;
  prenom: string;
  date_naissance: string;
  lieu_naissance: string;
  age_reporte?: string;
  sexe: "M" | "F" | "X";
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

export default function PatientEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Payload | null>(null);

  // Garde + chargement
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/patients/${id}/edit`); return; }
    me().catch(() => window.location.replace(`/login?next=/patients/${id}/edit`));
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const raw: Patient = (await getPatient(id))?.data ?? (await getPatient(id));
        setData({
          nom: raw.nom || "",
          prenom: raw.prenom || "",
          date_naissance: raw.date_naissance || "",
          lieu_naissance: raw.lieu_naissance || "",
          age_reporte: raw.age_reporte != null ? String(raw.age_reporte) : "",
          sexe: (raw.sexe as any) || "M",
          nationalite: raw.nationalite || "",
          profession: raw.profession || "",
          adresse: raw.adresse || "",
          quartier: raw.quartier || "",
          telephone: raw.telephone || "",
          statut_matrimonial: (raw.statut_matrimonial as any) || "",
          proche_nom: raw.proche_nom || "",
          proche_tel: raw.proche_tel || "",
          groupe_sanguin: (raw.groupe_sanguin as any) || "",
          allergies: raw.allergies || "",
          assurance_id: raw.assurance_id || "",
          numero_assure: raw.numero_assure || "",
          is_active: !!raw.is_active,
        });
      } catch (e) {
        // ignore, on affichera un form vide si besoin
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const progress = ((step + 1) / steps.length) * 100;
  const ageAuto = useMemo(() => computeAge(data?.date_naissance || ""), [data?.date_naissance]);
  const ageAffiche = (data?.date_naissance ? ageAuto : (data?.age_reporte || "")) || "";

  function upd<K extends keyof Payload>(k: K, v: Payload[K]) {
    setData((d) => (d ? { ...d, [k]: v } : d));
  }

  function telMask(v: string) { return v.replace(/[^\d+ ]/g, ""); }
  function next() { if (step < steps.length - 1) setStep(step + 1); }
  function prev() { if (step > 0) setStep(step - 1); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    try {
      const raw = {
        nom: data.nom.trim(),
        prenom: data.prenom.trim(),
        date_naissance: data.date_naissance || null,
        lieu_naissance: data.lieu_naissance || null,
        age_reporte: data.date_naissance ? null : (data.age_reporte ? Number(data.age_reporte) : null),
        sexe: data.sexe as "M" | "F" | "X",
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
      const payload = nullifyEmpty(raw);
      await updatePatient(id, payload);
      router.replace(`/patients/${id}?flash=updated`);
    } catch (err: any) {
      alert("Erreur: " + (err?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Modifier le patient"
        subtitle="Mettre à jour les informations du dossier"
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Fil d’Ariane + actions */}
        <div className="mb-6 flex items-center justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/patients" className="hover:underline">Patients</Link></li>
              <li aria-hidden>/</li>
              <li><Link href={`/patients/${id}`} className="hover:underline">Détail</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Modifier</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2">
            <Link href={`/patients/${id}`} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Annuler
            </Link>
            <button form="patient-edit-form" type="submit"
              className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
              Enregistrer
            </button>
          </div>
        </div>

        {/* Form */}
        {loading || !data ? (
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />
        ) : (
          <form id="patient-edit-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Col. gauche : étapes */}
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
                          <button type="button" onClick={() => setStep(i)}
                            className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition
                              ${active ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/30" :
                                done ? "text-ink-700 hover:bg-ink-50" :
                                "text-ink-500 hover:bg-ink-50"}`}>
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

            {/* Col. droite : champs */}
            <section className="lg:col-span-2 space-y-6">
              {/* Étape 1 */}
              {step === 0 && (
                <Card title="Identité du patient" icon={<User className="h-4 w-4" />}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Nom" required>
                      <input className={inputCls} value={data.nom} onChange={e=>upd("nom", e.target.value.toUpperCase())} />
                    </Field>
                    <Field label="Prénom" required>
                      <input className={inputCls} value={data.prenom} onChange={e=>upd("prenom", e.target.value)} />
                    </Field>
                    <Field label="Sexe" required>
                      <select className={inputCls} value={data.sexe} onChange={e=>upd("sexe", e.target.value as any)}>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                        <option value="X">Non spécifié</option>
                      </select>
                    </Field>
                  </div>
                </Card>
              )}

              {/* Étape 2 */}
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
                      <input className={inputCls} value={data.lieu_naissance} onChange={e=>upd("lieu_naissance", e.target.value)} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <Field label="Téléphone" icon={<Phone className="h-4 w-4 text-ink-400" />}>
                      <input className={inputCls + " pl-9"} value={data.telephone} onChange={e=>upd("telephone", telMask(e.target.value))} />
                    </Field>
                    <Field label="Adresse">
                      <input className={inputCls} value={data.adresse} onChange={e=>upd("adresse", e.target.value)} />
                    </Field>
                    <Field label="Quartier">
                      <input className={inputCls} value={data.quartier} onChange={e=>upd("quartier", e.target.value)} />
                    </Field>
                  </div>
                </Card>
              )}

              {/* Étape 3 */}
              {step === 2 && (
                <Card title="Informations civiles" icon={<MapPin className="h-4 w-4" />}>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <Field label="Nationalité"><input className={inputCls} value={data.nationalite} onChange={e=>upd("nationalite", e.target.value)} /></Field>
                    <Field label="Profession"><input className={inputCls} value={data.profession} onChange={e=>upd("profession", e.target.value)} /></Field>
                    <Field label="Statut matrimonial">
                      <select className={inputCls} value={data.statut_matrimonial} onChange={e=>upd("statut_matrimonial", e.target.value as any)}>
                        <option value="">—</option><option value="celibataire">Célibataire</option><option value="marie">Marié(e)</option><option value="veuf">Veuf/Veuve</option><option value="divorce">Divorcé(e)</option>
                      </select>
                    </Field>
                    <Field label="Groupe sanguin">
                      <select className={inputCls} value={data.groupe_sanguin} onChange={e=>upd("groupe_sanguin", e.target.value as any)}>
                        <option value="">—</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g=> <option key={g} value={g}>{g}</option>)}
                      </select>
                    </Field>
                  </div>
                </Card>
              )}

              {/* Étape 4 */}
              {step === 3 && (
                <Card title="Personne à contacter & Assurance" icon={<Shield className="h-4 w-4" />}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Proche à prévenir"><input className={inputCls} value={data.proche_nom} onChange={e=>upd("proche_nom", e.target.value)} /></Field>
                    <Field label="Téléphone du proche"><input className={inputCls} value={data.proche_tel} onChange={e=>upd("proche_tel", telMask(e.target.value))} /></Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <Field label="Assurance (ID)"><input className={inputCls} value={data.assurance_id} onChange={e=>upd("assurance_id", e.target.value)} placeholder="UUID (optionnel)" /></Field>
                    <Field label="Numéro d’assuré"><input className={inputCls} value={data.numero_assure} onChange={e=>upd("numero_assure", e.target.value)} /></Field>
                    <Field label="Statut">
                      <select className={inputCls} value={data.is_active ? "actif" : "inactif"} onChange={e=>upd("is_active", e.target.value === "actif")}>
                        <option value="actif">Actif</option><option value="inactif">Inactif</option>
                      </select>
                    </Field>
                  </div>
                </Card>
              )}

              {/* Étape 5 */}
              {step === 4 && (
                <Card title="Allergies & Récapitulatif" icon={<Syringe className="h-4 w-4" />}>
                  <Field label="Allergies" className="sm:col-span-2">
                    <textarea rows={4} className={inputCls} value={data.allergies} onChange={e=>upd("allergies", e.target.value)} />
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

/* ---- UI helpers ---- */
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
      <label className="block text-xs font-medium text-ink-600">{label} {required && <span className="text-congo-red">*</span>}</label>
      {children}
    </div>
  );
}
const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";
