// app/medecines/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getMedecine, updateMedecine } from "@/lib/api";
import { ArrowLeft, Save, Stethoscope, ChevronRight } from "lucide-react";

type Payload = {
  patient_id?: string | null;
  visite_id?: string | null;
  service_id?: string | number | null;
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

const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

function nullifyEmpty<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === "" ? null : v;
  return out;
}

export default function MedecineEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const raw: any = (await getMedecine(id)) ?? {};
        const r = raw?.data ?? raw;
        setData({
          patient_id: r.patient_id ?? "",
          visite_id: r.visite_id ?? "",
          service_id: r.service_id ?? "",
          date_acte: r.date_acte ? r.date_acte.slice(0, 16) : "", // iso → input datetime-local
          motif: r.motif ?? "",
          diagnostic: r.diagnostic ?? "",
          examen_clinique: r.examen_clinique ?? "",
          traitements: r.traitements ?? "",
          observation: r.observation ?? "",
          tension_arterielle: r.tension_arterielle ?? "",
          temperature: r.temperature ?? null,
          frequence_cardiaque: r.frequence_cardiaque ?? null,
          frequence_respiratoire: r.frequence_respiratoire ?? null,
          statut: r.statut ?? "en_cours",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function upd<K extends keyof Payload>(k: K, v: Payload[K]) {
    setData((d) => (d ? { ...d, [k]: v } : d));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    try {
      const payload = { ...data } as any;
      delete payload.soignant_id; // 🔒 jamais depuis le client
      await updateMedecine(id, nullifyEmpty(payload));
      router.replace(`/medecines/${id}?flash=updated`);
    } catch (e: any) {
      alert("Mise à jour impossible : " + (e?.message || "vérifiez les champs"));
    } finally { setBusy(false); }
  }

  const title = useMemo(() => `Modifier acte #${id}`, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title={title} subtitle="Mettre à jour l'enregistrement" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/medecines" className="hover:underline">Médecine</Link></li>
              <li aria-hidden>/</li>
              <li><Link href={`/medecines/${id}`} className="hover:underline">Détail</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Modifier</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2">
            <Link href={`/medecines/${id}`} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Annuler
            </Link>
            <button form="medecine-edit-form" type="submit" className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 inline-flex items-center gap-1">
              <Save className="h-4 w-4" /> Enregistrer
            </button>
          </div>
        </div>

        {loading || !data ? (
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />
        ) : (
          <form id="medecine-edit-form" onSubmit={onSubmit} className="space-y-6">
            <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Informations</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-ink-600">Patient ID</label>
                  <input className={inputCls} value={data.patient_id ?? ""} onChange={(e) => upd("patient_id", e.target.value || null)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-600">Visite ID</label>
                  <input className={inputCls} value={data.visite_id ?? ""} onChange={(e) => upd("visite_id", e.target.value || null)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-600">Service ID</label>
                  <input className={inputCls} value={String(data.service_id ?? "")} onChange={(e) => upd("service_id", e.target.value || null)} />
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-600">Date de l’acte</label>
                  <input type="datetime-local" className={inputCls} value={data.date_acte ?? ""} onChange={(e) => upd("date_acte", e.target.value || null)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink-600">Motif</label>
                  <input className={inputCls} value={data.motif ?? ""} onChange={(e) => upd("motif", e.target.value || null)} />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs font-medium text-ink-600">Diagnostic</label>
                  <textarea rows={3} className={inputCls} value={data.diagnostic ?? ""} onChange={(e) => upd("diagnostic", e.target.value || null)} />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs font-medium text-ink-600">Examen clinique</label>
                  <textarea rows={3} className={inputCls} value={data.examen_clinique ?? ""} onChange={(e) => upd("examen_clinique", e.target.value || null)} />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs font-medium text-ink-600">Traitements</label>
                  <textarea rows={3} className={inputCls} value={data.traitements ?? ""} onChange={(e) => upd("traitements", e.target.value || null)} />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs font-medium text-ink-600">Observation</label>
                  <textarea rows={3} className={inputCls} value={data.observation ?? ""} onChange={(e) => upd("observation", e.target.value || null)} />
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-600">Tension artérielle</label>
                  <input className={inputCls} value={data.tension_arterielle ?? ""} onChange={(e) => upd("tension_arterielle", e.target.value || null)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-600">Température (°C)</label>
                  <input type="number" step="0.1" className={inputCls} value={data.temperature ?? ("" as any)} onChange={(e) => upd("temperature", e.target.value === "" ? null : Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-600">Fréquence cardiaque</label>
                  <input type="number" className={inputCls} value={data.frequence_cardiaque ?? ("" as any)} onChange={(e) => upd("frequence_cardiaque", e.target.value === "" ? null : Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-600">Fréquence respiratoire</label>
                  <input type="number" className={inputCls} value={data.frequence_respiratoire ?? ("" as any)} onChange={(e) => upd("frequence_respiratoire", e.target.value === "" ? null : Number(e.target.value))} />
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-600">Statut</label>
                  <select className={inputCls} value={data.statut ?? "en_cours"} onChange={(e) => upd("statut", e.target.value as any)}>
                    <option value="en_cours">en_cours</option>
                    <option value="clos">clos</option>
                  </select>
                </div>
              </div>
            </section>

            <div className="sticky bottom-4 z-10">
              <div className="rounded-xl bg-white/90 backdrop-blur border border-ink-100 shadow p-3 flex items-center justify-end gap-2">
                <Link href={`/medecines/${id}`} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50">
                  Annuler
                </Link>
                <button type="submit" disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                  <span>Enregistrer</span> <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
