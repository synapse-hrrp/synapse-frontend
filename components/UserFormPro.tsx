// components/UserFormPro.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, getToken, me } from "@/lib/api";
import { useEffect } from "react";
import { Check, ChevronRight, User, Lock, Phone, Mail, Shield } from "lucide-react";

type Payload = {
  name: string;
  email: string;
  phone: string;
  is_active: string; // "actif" | "inactif" (UI) -> bool
  password: string;
  confirm: string;
};

const steps = [
  { key: "identite", label: "Identité", icon: User },
  { key: "contact", label: "Contact & Statut", icon: Phone },
  { key: "securite", label: "Sécurité", icon: Shield },
] as const;

export default function UserFormPro() {
  const router = useRouter();

  // Garde
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login?next=/users/new"); return; }
    me().catch(() => window.location.replace("/login?next=/users/new"));
  }, []);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Payload>({
    name: "",
    email: "",
    phone: "",
    is_active: "actif",
    password: "",
    confirm: "",
  });

  const progress = ((step + 1) / steps.length) * 100;
  function upd<K extends keyof Payload>(k: K, v: Payload[K]) { setData(d => ({ ...d, [k]: v })); }
  function next() { if (step < steps.length - 1) setStep(step + 1); }
  function prev() { if (step > 0) setStep(step - 1); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.password || data.password.length < 4) { alert("Mot de passe trop court (≥4 caractères)."); return; }
    if (data.password !== data.confirm) { alert("Les mots de passe ne correspondent pas."); return; }
    setBusy(true);
    try {
      const payload = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim() || null,
        is_active: data.is_active === "actif",
        password: data.password,
      };
      await createUser(payload);
      router.replace("/users?flash=created");
    } catch (err: any) {
      alert("Erreur: " + (err?.message || "inconnue"));
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
          </div>
        </div>
      </aside>

      {/* Champs */}
      <section className="lg:col-span-2 space-y-6">
        {step === 0 && (
          <Card title="Identité" icon={<User className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom complet" required>
                <input className={inputCls} value={data.name} onChange={e=>upd("name", e.target.value)} placeholder="Ex : Admin Démo" />
              </Field>
              <Field label="E-mail" required icon={<Mail className="h-4 w-4 text-ink-400" />}>
                <input type="email" className={inputCls + " pl-9"} value={data.email} onChange={e=>upd("email", e.target.value)} placeholder="admin@hopital.cg" />
              </Field>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card title="Contact & Statut" icon={<Phone className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Téléphone">
                <input className={inputCls} value={data.phone} onChange={e=>upd("phone", e.target.value.replace(/[^\d+ ]/g,""))} placeholder="+242 06 000 0000" />
              </Field>
              <Field label="Statut">
                <select className={inputCls} value={data.is_active} onChange={e=>upd("is_active", e.target.value as any)}>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </Field>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card title="Sécurité" icon={<Lock className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Mot de passe" required>
                <input type="password" className={inputCls} value={data.password} onChange={e=>upd("password", e.target.value)} placeholder="≥ 4 caractères" />
              </Field>
              <Field label="Confirmer le mot de passe" required>
                <input type="password" className={inputCls} value={data.confirm} onChange={e=>upd("confirm", e.target.value)} />
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
                  {busy ? "Enregistrement…" : "Créer l’utilisateur"}
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
function Field({ label, required, icon, className, children }: { label: string; required?: boolean; icon?: React.ReactNode; className?: string; children: React.ReactNode; }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-ink-600">{label} {required && <span className="text-congo-red">*</span>}</label>
      <div className="relative">{icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}{children}</div>
    </div>
  );
}
const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";
