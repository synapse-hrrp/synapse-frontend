// components/TarifFormPro.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createTarif,
  getToken,
  me,
  listAllServices,
} from "@/lib/api";
import {
  Check,
  ChevronRight,
  BadgeDollarSign,
  Building2,
  Tags,
} from "lucide-react";

/* ---------------- Types & helpers ---------------- */
type Payload = {
  code: string;
  libelle: string;
  montant: string;   // string d’input
  devise: string;
  is_active: boolean;
  service_id: string; // dropdown
};

type ServiceDTO = { id: number; slug?: string; name: string };

const steps = [
  { key: "identite", label: "Identification", icon: Tags },
  { key: "prix", label: "Prix & Devise", icon: BadgeDollarSign },
  { key: "liaison", label: "Service & Statut", icon: Building2 },
] as const;

function toNumberOrNull(v: string) {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" ? n : null;
}

/* ---------------- Component ---------------- */
export default function TarifFormPro() {
  const router = useRouter();

  // Garde simple
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login?next=/tarifs/new"); return; }
    me().catch(() => window.location.replace("/login?next=/tarifs/new"));
  }, []);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Payload>({
    code: "",
    libelle: "",
    montant: "",
    devise: "XAF",
    is_active: true,
    service_id: "",
  });

  // listes pour dropdowns
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // charge services
  useEffect(() => {
    (async () => {
      try {
        setLoadingLists(true);
        const svcRes = await listAllServices();
        const svcArr: ServiceDTO[] = Array.isArray(svcRes?.data) ? svcRes.data :
                                     (Array.isArray(svcRes) ? svcRes : []);
        setServices(svcArr);
      } catch {
        setServices([]);
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  const progress = ((step + 1) / steps.length) * 100;
  function upd<K extends keyof Payload>(k: K, v: Payload[K]) { setData(d => ({ ...d, [k]: v })); }
  function next() { if (step < steps.length - 1) setStep(step + 1); }
  function prev() { if (step > 0) setStep(step - 1); }

  const montantPreview = useMemo(() => {
    if (!data.montant) return "";
    const n = Number(data.montant);
    if (!Number.isFinite(n)) return "";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [data.montant]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const raw = {
        code: data.code.trim(),
        libelle: data.libelle.trim(),
        montant: Number(data.montant),
        devise: data.devise || "XAF",
        is_active: Boolean(data.is_active),
        service_id: toNumberOrNull(data.service_id),
      };
      await createTarif(raw);
      router.replace("/tarifs?flash=created");
    } catch (err: any) {
      alert(
        "Erreur: " +
          (err?.message || "inconnue") +
          "\n\nAstuce: 'Code', 'Libellé' et 'Montant' sont requis. 'Code' doit être unique."
      );
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
                    <button
                      type="button"
                      onClick={() => setStep(i)}
                      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition
                        ${active ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/30"
                                 : done ? "text-ink-700 hover:bg-ink-50"
                                        : "text-ink-500 hover:bg-ink-50"}`}
                    >
                      <span
                        className={`h-5 w-5 rounded-md flex items-center justify-center
                          ${active ? "bg-congo-green text-white"
                                   : done ? "bg-ink-200 text-ink-800"
                                          : "bg-ink-100 text-ink-600"}`}
                      >
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
                <div><b>Code :</b> {data.code || "—"}</div>
                <div><b>Libellé :</b> {data.libelle || "—"}</div>
                <div><b>Montant :</b> {montantPreview ? `${montantPreview} ${data.devise || ""}` : "—"}</div>
                <div><b>Actif :</b> {data.is_active ? "Oui" : "Non"}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Champs */}
      <section className="lg:col-span-2 space-y-6">
        {/* Identification */}
        {step === 0 && (
          <Card title="Identification" icon={<Tags className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Code" required>
                <input
                  className={inputCls}
                  value={data.code}
                  onChange={e => upd("code", e.target.value.toUpperCase())}
                  placeholder="CONSULTATION"
                />
              </Field>
              <Field label="Libellé" required>
                <input
                  className={inputCls}
                  value={data.libelle}
                  onChange={e => upd("libelle", e.target.value)}
                  placeholder="Consultation"
                />
              </Field>
            </div>
          </Card>
        )}

        {/* Prix & Devise */}
        {step === 1 && (
          <Card title="Prix & Devise" icon={<BadgeDollarSign className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Montant" required>
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={data.montant}
                  onChange={e => upd("montant", e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                  placeholder="5000.00"
                />
              </Field>
              <Field label="Devise" required>
                <input
                  className={inputCls}
                  value={data.devise}
                  onChange={e => upd("devise", e.target.value.toUpperCase())}
                  placeholder="XAF"
                />
              </Field>
            </div>
          </Card>
        )}

        {/* Service & Statut */}
        {step === 2 && (
          <Card title="Service & Statut" icon={<Building2 className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Service">
                <select
                  className={inputCls}
                  value={data.service_id}
                  onChange={(e) => upd("service_id", e.target.value)}
                  disabled={loadingLists}
                >
                  <option value="">{loadingLists ? "Chargement..." : "— Sélectionner —"}</option>
                  {services.map(s => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Actif">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={data.is_active}
                    onChange={(e) => upd("is_active", e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>{data.is_active ? "Actif" : "Inactif"}</span>
                </label>
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
                  className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
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
      <label className="block text-xs font-medium text-ink-600">{label} {required && <span className="text-congo-red">*</span>}</label>
      {children}
    </div>
  );
}
const inputCls =
  "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";
