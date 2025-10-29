// app/tarifs/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  getToken,
  me,
  getTarif,
  updateTarif,
  listAllServices,
} from "@/lib/api";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  BadgeDollarSign,
  Building2,
  Tags,
  ToggleRight,
} from "lucide-react";

type Payload = {
  code: string;
  libelle: string;
  montant: string;   // garder string pour l'input puis convertir
  devise: string;
  is_active: boolean;
  service_id: string; // dropdown -> string puis conversion number|null
};

type ServiceDTO = { id: number; slug?: string; name: string };

const steps = [
  { key: "identite", label: "Identification", icon: Tags },
  { key: "prix", label: "Prix & Devise", icon: BadgeDollarSign },
  { key: "liaison", label: "Service & Statut", icon: Building2 },
] as const;

/* ---------------- Helpers ---------------- */
function toNumberOrNull(v: string) {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" ? n : null;
}

/* ---------------- Page ---------------- */
export default function TarifEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Étapes UI
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Chargement fiche
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Payload | null>(null);

  // Listes dropdown
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Garde simple (auth)
  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.replace(`/login?next=/tarifs/${id}/edit`);
      return;
    }
    me().catch(() =>
      window.location.replace(`/login?next=/tarifs/${id}/edit`)
    );
  }, [id]);

  // Charge la fiche
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const raw: any = (await getTarif(id))?.data ?? (await getTarif(id));
        setData({
          code: raw.code ?? "",
          libelle: raw.libelle ?? "",
          montant: raw.montant != null ? String(raw.montant) : "",
          devise: raw.devise || "XAF",
          is_active: Boolean(raw.is_active ?? true),
          service_id: raw.service_id != null ? String(raw.service_id) : "",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Charge listes (services)
  useEffect(() => {
    (async () => {
      try {
        setLoadingLists(true);
        const svcRes = await listAllServices();
        const svcArr: ServiceDTO[] = Array.isArray(svcRes?.data)
          ? svcRes.data
          : Array.isArray(svcRes)
          ? svcRes
          : [];
        setServices(svcArr);
      } catch {
        setServices([]);
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  const progress = ((step + 1) / steps.length) * 100;
  function upd<K extends keyof Payload>(k: K, v: Payload[K]) {
    setData((d) => (d ? { ...d, [k]: v } : d));
  }
  function next() { if (step < steps.length - 1) setStep(step + 1); }
  function prev() { if (step > 0) setStep(step - 1); }

  const montantPreview = useMemo(() => {
    if (!data?.montant) return "";
    const n = Number(data.montant);
    if (!Number.isFinite(n)) return "";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [data?.montant]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
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
      await updateTarif(id, raw);
      router.replace(`/tarifs/${id}?flash=updated`);
    } catch (err: any) {
      alert("Erreur: " + (err?.message || "inconnue. Vérifiez les champs requis."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Modifier le tarif"
        subtitle="Mettre à jour les informations"
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Fil d’Ariane + actions */}
        <div className="mb-6 flex items-center justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/tarifs" className="hover:underline">Tarifs</Link></li>
              <li aria-hidden>/</li>
              <li><Link href={`/tarifs/${id}`} className="hover:underline">Détail</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Modifier</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={`/tarifs/${id}`}
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Annuler
            </Link>
            <button
              form="tarif-edit-form"
              type="submit"
              className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Enregistrer
            </button>
          </div>
        </div>

        {/* Form */}
        {loading || !data ? (
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />
        ) : (
          <form id="tarif-edit-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      const Icon = s.icon;
                      const active = i === step;
                      const done = i < step;
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
                        onChange={(e) => upd("code", e.target.value.toUpperCase())}
                        placeholder="CONSULTATION"
                      />
                    </Field>
                    <Field label="Libellé" required>
                      <input
                        className={inputCls}
                        value={data.libelle}
                        onChange={(e) => upd("libelle", e.target.value)}
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
                        onChange={(e) => upd("montant", e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                        placeholder="5000.00"
                      />
                    </Field>
                    <Field label="Devise" required>
                      <input
                        className={inputCls}
                        value={data.devise}
                        onChange={(e) => upd("devise", e.target.value.toUpperCase())}
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
                      <button
                        type="button"
                        onClick={() => upd("is_active", !data.is_active)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${data.is_active ? "border-green-200 bg-green-50 text-green-700" : "border-ink-200 bg-ink-50 text-ink-700"}`}
                        title={data.is_active ? "Actif" : "Inactif"}
                      >
                        <ToggleRight className="h-4 w-4" /> {data.is_active ? "Actif" : "Inactif"}
                      </button>
                    </Field>
                  </div>
                </Card>
              )}

              {/* Actions */}
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
                      // 🟢 Étapes intermédiaires : juste passer à la suivante
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                        onClick={next}
                      >
                        Suivant <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      // ✅ Dernière étape : enregistrement manuel (pas de "submit" auto)
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleSubmit}
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
        )}
      </main>

      <SiteFooter />
    </div>
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
