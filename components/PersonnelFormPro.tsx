// components/PersonnelFormPro.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPersonnel, getToken, me } from "@/lib/api";
import { Check, ChevronRight, User, Phone, Calendar, Building2, Briefcase, MapPin } from "lucide-react";
import { useEffect } from "react";

type Payload = {
  user_id: string;           // requis (lié à users.id)
  matricule: string;         // requis
  first_name: string;
  last_name: string;
  sex: "M"|"F";
  date_of_birth: string;     // YYYY-MM-DD | ""
  cin: string;
  phone_alt: string;
  address: string;
  city: string;
  country: string;
  job_title: string;
  hired_at: string;          // YYYY-MM-DD | ""
  service_id: string;        // id numérique, string ici puis converti
  avatar_path: string;
  extra: string;             // JSON facultatif (stringifié)
};

const steps = [
  { key: "identite", label: "Identité", icon: User },
  { key: "coordonnees", label: "Coordonnées", icon: MapPin },
  { key: "emploi", label: "Emploi & Service", icon: Briefcase },
  { key: "fichiers", label: "Avatar & Extra", icon: Building2 },
] as const;

export default function PersonnelFormPro() {
  const router = useRouter();

  // Garde simple
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login?next=/personnels/new"); return; }
    me().catch(() => window.location.replace("/login?next=/personnels/new"));
  }, []);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Payload>({
    user_id: "",
    matricule: "",
    first_name: "",
    last_name: "",
    sex: "M",
    date_of_birth: "",
    cin: "",
    phone_alt: "",
    address: "",
    city: "",
    country: "Congo",
    job_title: "",
    hired_at: "",
    service_id: "",
    avatar_path: "",
    extra: "",
  });

  const progress = ((step + 1) / steps.length) * 100;
  function upd<K extends keyof Payload>(k: K, v: Payload[K]) { setData(d => ({ ...d, [k]: v })); }
  function telMask(v: string) { return v.replace(/[^\d+ ]/g, ""); }
  function next() { if (step < steps.length - 1) setStep(step + 1); }
  function prev() { if (step > 0) setStep(step - 1); }
  const age = useMemo(() => {
    if (!data.date_of_birth) return "";
    const d = new Date(data.date_of_birth);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a >= 0 ? a : "";
  }, [data.date_of_birth]);

  function toNumberOrNull(v: string) {
    const n = Number(v);
    return Number.isFinite(n) && v !== "" ? n : null;
  }
  function nullifyEmpty<T extends Record<string, any>>(obj: T): T {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) out[k] = (v === "" || v === undefined) ? null : v;
    return out;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // payload aligné migration
      const raw = {
        user_id: Number(data.user_id),               // requis
        matricule: data.matricule.trim(),            // requis
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        sex: data.sex as "M"|"F",
        date_of_birth: data.date_of_birth || null,
        cin: data.cin || null,
        phone_alt: data.phone_alt || null,
        address: data.address || null,
        city: data.city || null,
        country: data.country || null,
        job_title: data.job_title || null,
        hired_at: data.hired_at || null,
        service_id: toNumberOrNull(data.service_id),
        avatar_path: data.avatar_path || null,
        extra: data.extra ? JSON.parse(data.extra) : null,
      };
      await createPersonnel(nullifyEmpty(raw));
      router.replace("/personnels?flash=created");
    } catch (err: any) {
      alert("Erreur: " + (err?.message || "inconnue") + "\n\nAstuce: user_id et matricule sont requis, cin unique.");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Étapes */}
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

            {/* résumé */}
            <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50 p-3 text-sm">
              <div className="font-medium text-ink-800">Résumé</div>
              <div className="mt-1 space-y-1 text-ink-700">
                <div><b>Nom :</b> {data.last_name || "—"} {data.first_name || ""}</div>
                <div><b>Matricule :</b> {data.matricule || "—"}</div>
                <div><b>Âge :</b> {age || "—"}</div>
                <div><b>Fonction :</b> {data.job_title || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Champs */}
      <section className="lg:col-span-2 space-y-6">
        {/* Identité */}
        {step === 0 && (
          <Card title="Identité" icon={<User className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <Field label="User ID (users.id)" required>
                <input className={inputCls} value={data.user_id} onChange={e=>upd("user_id", e.target.value)} placeholder="ex: 1" />
              </Field>
              <Field label="Matricule" required className="sm:col-span-2">
                <input className={inputCls} value={data.matricule} onChange={e=>upd("matricule", e.target.value.toUpperCase())} placeholder="HOSP-0001" />
              </Field>
              <Field label="Nom" required>
                <input className={inputCls} value={data.last_name} onChange={e=>upd("last_name", e.target.value.toUpperCase())} placeholder="NGOMA" />
              </Field>
              <Field label="Prénom" required>
                <input className={inputCls} value={data.first_name} onChange={e=>upd("first_name", e.target.value)} placeholder="Pierre" />
              </Field>
              <Field label="Sexe">
                <select className={inputCls} value={data.sex} onChange={e=>upd("sex", e.target.value as any)}>
                  <option value="M">M</option><option value="F">F</option>
                </select>
              </Field>
              <Field label="Date de naissance">
                <input type="date" className={inputCls} value={data.date_of_birth} onChange={e=>upd("date_of_birth", e.target.value)} />
              </Field>
              <Field label="CIN">
                <input className={inputCls} value={data.cin} onChange={e=>upd("cin", e.target.value)} placeholder="Carte d'identité" />
              </Field>
            </div>
          </Card>
        )}

        {/* Coordonnées */}
        {step === 1 && (
          <Card title="Coordonnées" icon={<MapPin className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Téléphone (alt)">
                <input className={inputCls} value={data.phone_alt} onChange={e=>upd("phone_alt", telMask(e.target.value))} placeholder="+242 06 000 0000" />
              </Field>
              <Field label="Adresse"><input className={inputCls} value={data.address} onChange={e=>upd("address", e.target.value)} /></Field>
              <Field label="Ville"><input className={inputCls} value={data.city} onChange={e=>upd("city", e.target.value)} /></Field>
              <Field label="Pays"><input className={inputCls} value={data.country} onChange={e=>upd("country", e.target.value)} /></Field>
            </div>
          </Card>
        )}

        {/* Emploi & Service */}
        {step === 2 && (
          <Card title="Emploi & Service" icon={<Briefcase className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Fonction"><input className={inputCls} value={data.job_title} onChange={e=>upd("job_title", e.target.value)} placeholder="Infirmier, Pharmacien…" /></Field>
              <Field label="Date d’embauche"><input type="date" className={inputCls} value={data.hired_at} onChange={e=>upd("hired_at", e.target.value)} /></Field>
              <Field label="Service ID"><input className={inputCls} value={data.service_id} onChange={e=>upd("service_id", e.target.value)} placeholder="ID service (optionnel)" /></Field>
            </div>
          </Card>
        )}

        {/* Avatar & Extra */}
        {step === 3 && (
          <Card title="Avatar & Extra" icon={<Building2 className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Avatar (chemin relatif)">
                <input className={inputCls} value={data.avatar_path} onChange={e=>upd("avatar_path", e.target.value)} placeholder="/storage/avatars/123.jpg" />
              </Field>
              <Field label="Extra (JSON)">
                <textarea rows={4} className={inputCls} value={data.extra} onChange={e=>upd("extra", e.target.value)} placeholder='{"badge":"or"}' />
              </Field>
            </div>
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
                  {busy ? "Enregistrement…" : "Enregistrer"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </form>
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
function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode; }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-ink-600">{label} {required && <span className="text-congo-red">*</span>}</label>
      {children}
    </div>
  );
}
const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";
