// components/MedecinFormPro.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createMedecin, updateMedecin, getMedecin,
  listPersonnelsPaginated
} from "@/lib/api";
import { useRouter } from "next/navigation";
import { Check, User, Stethoscope } from "lucide-react";

type Props = {
  medecinId?: string | number;
  afterSavePath?: string;
};

type Payload = {
  personnel_id: number | "" ;
  numero_ordre: string;
  specialite: string;
  grade?: string;
};

type PersonnelMini = { id: number; full_name: string };

export default function MedecinFormPro({ medecinId, afterSavePath = "/medecin" }: Props) {
  const router = useRouter();
  const isEdit = !!medecinId;

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<Payload>({
    personnel_id: "",
    numero_ordre: "",
    specialite: "",
    grade: "",
  });

  const [personnels, setPersonnels] = useState<PersonnelMini[]>([]);
  const [pQ, setPQ] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const res: any = await getMedecin(String(medecinId));
        const raw = res?.data ?? res;
        setData({
          personnel_id: Number(raw.personnel_id) || "",
          numero_ordre: raw.numero_ordre || "",
          specialite: raw.specialite || "",
          grade: raw.grade || "",
        });
      } catch (e: any) {
        setError(e?.message || "Impossible de charger le médecin.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, medecinId]);

  // Charger personnels (dropdown) + recherche
  useEffect(() => {
    let abo = false;
    (async () => {
      try {
        const res: any = await listPersonnelsPaginated({ page: 1, per_page: 200, search: pQ });
        const arr = Array.isArray(res) ? res : (res.data ?? []);
        const mapped: PersonnelMini[] = arr.map((p: any) => ({
          id: Number(p.id),
          full_name:
            p.full_name ||
            `${p.last_name || ""} ${p.first_name || ""}`.trim() ||
            String(p.id),
        }));
        if (!abo) setPersonnels(mapped);
      } catch {
        if (!abo) setPersonnels([]);
      }
    })();
    return () => { abo = true; };
  }, [pQ]);

  function upd<K extends keyof Payload>(k: K, v: Payload[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        personnel_id: typeof data.personnel_id === "number" ? data.personnel_id : Number(data.personnel_id),
        numero_ordre: data.numero_ordre.trim(),
        specialite: data.specialite.trim(),
        grade: data.grade?.trim() || null,
      };
      if (isEdit) {
        await updateMedecin(String(medecinId), payload);
      } else {
        await createMedecin(payload);
      }
      router.replace(afterSavePath + (isEdit ? "?flash=updated" : "?flash=created"));
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  const progress = useMemo(() => 100, []);

  if (loading) return <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm animate-pulse h-40" />;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <aside className="lg:col-span-1">
        <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden sticky top-20">
          <div className="h-1 bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
          <div className="p-4">
            <div className="mb-3 text-sm font-semibold">{isEdit ? "Édition d’un médecin" : "Nouveau médecin"}</div>
            <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
              <div className="h-full bg-congo-green transition-all" style={{ width: `${progress}%` }} />
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-congo-red/30 bg-[color:var(--color-congo-red)]/10 p-2.5 text-sm text-congo-red">
                {error}
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="lg:col-span-2 space-y-6">
        <Card title="Identification" icon={<User className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Personnel (médecin)" required>
              <input
                className={inputCls}
                placeholder="Rechercher un personnel…"
                value={pQ}
                onChange={(e) => setPQ(e.target.value)}
              />
              <select
                className={inputCls + " mt-2"}
                value={String(data.personnel_id ?? "")}
                onChange={(e) => upd("personnel_id", e.target.value ? Number(e.target.value) : "")}
                required
              >
                <option value="">— Sélectionner —</option>
                {personnels.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
              <p className="text-xs text-ink-500 mt-1">Cette liste provient de /admin/personnels.</p>
            </Field>

            <Field label="Numéro d’ordre" required>
              <input className={inputCls} value={data.numero_ordre} onChange={(e) => upd("numero_ordre", e.target.value)} placeholder="ex: CGO-12345" />
            </Field>
          </div>
        </Card>

        <Card title="Spécialité" icon={<Stethoscope className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Spécialité" required>
              <input className={inputCls} value={data.specialite} onChange={(e) => upd("specialite", e.target.value)} placeholder="Cardiologie, Pédiatrie…" />
            </Field>
            <Field label="Grade">
              <input className={inputCls} value={data.grade ?? ""} onChange={(e) => upd("grade", e.target.value)} placeholder="Assistant, Chef de clinique…" />
            </Field>
          </div>
        </Card>

        <div className="sticky bottom-4 z-10">
          <div className="rounded-xl bg-white/90 backdrop-blur border border-ink-100 shadow p-3 flex items-center justify-end">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
              {busy ? "Enregistrement…" : <>Enregistrer <Check className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">{icon}<h3 className="text-sm font-semibold">{title}</h3></div>
      {children}
    </section>
  );
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">
        {label} {required && <span className="text-congo-red">*</span>}
      </label>
      {children}
    </div>
  );
}
const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";
