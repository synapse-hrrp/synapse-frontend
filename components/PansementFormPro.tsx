// components/PansementFormPro.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPansement, listPatientsPaginated, getToken, me } from "@/lib/api";
import { Check, ChevronRight, UserSearch, ClipboardList, Loader2 } from "lucide-react";

type PatientRow = { id: string; numero_dossier: string; nom: string; prenom: string };

const steps = [
  { key: "patient", label: "Patient", icon: UserSearch },
  { key: "details", label: "Détails du soin", icon: ClipboardList },
] as const;

const MIN_CHARS = 2;
const PAGE_SIZE = 8;
const DEBOUNCE_MS = 220;

export default function PansementFormPro() {
  const router = useRouter();

  // Garde d’accès
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login?next=/pansements/new"); return; }
    me().catch(() => window.location.replace("/login?next=/pansements/new"));
  }, []);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Patient (recherche ultra-rapide)
  const [q, setQ] = useState("");
  const [patientResults, setPatientResults] = useState<PatientRow[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [recentPatients, setRecentPatients] = useState<PatientRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, PatientRow[]>>(new Map());

  // Champs Pansement
  const [type, setType] = useState("");
  const [observation, setObservation] = useState("");
  const [etat, setEtat] = useState("");
  const [produits, setProduits] = useState("");
  const [dateSoin, setDateSoin] = useState(""); // ISO-8601 (input type="datetime-local")
  const [status, setStatus] = useState<"en_cours" | "termine" | "annule">("en_cours");

  // Précharger quelques patients
  useEffect(() => {
    (async () => {
      try {
        const res: any = await listPatientsPaginated({ page: 1, per_page: PAGE_SIZE });
        const rows: PatientRow[] = Array.isArray(res) ? res : (res.data ?? []);
        setRecentPatients(rows);
        setPatientResults(rows);
      } catch { setRecentPatients([]); }
    })();
  }, []);

  // Recherche patients (debounce + annulation + cache)
  useEffect(() => {
    const term = q.trim();

    if (term.length < MIN_CHARS) {
      if (abortRef.current) abortRef.current.abort();
      setLoadingPatients(false);
      setPatientResults(recentPatients);
      return;
    }

    const cached = cacheRef.current.get(term);
    if (cached) setPatientResults(cached);

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoadingPatients(true);
    const tid = setTimeout(async () => {
      try {
        const res: any = await listPatientsPaginated({ page: 1, per_page: PAGE_SIZE, search: term, signal: ctrl.signal as any });
        const rows: PatientRow[] = Array.isArray(res) ? res : (res.data ?? []);
        cacheRef.current.set(term, rows);
        setPatientResults(rows);
      } catch (e: any) {
        if (e?.name !== "AbortError") setPatientResults([]);
      } finally {
        setLoadingPatients(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(tid);
  }, [q, recentPatients]);

  const progress = ((step + 1) / steps.length) * 100;
  const next = () => { if (step < steps.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient?.id) { alert("Sélectionne un patient."); return; }
    if (!type.trim() && !observation.trim()) { alert("Renseigne au moins le type ou l’observation."); return; }

    setBusy(true);
    try {
      await createPansement({
        patient_id: selectedPatient.id,
        // visite_id: (optionnel) le back la déduira si absente
        type: type.trim() || null,
        observation: observation.trim() || null,
        etat_plaque: etat.trim() || null,
        produits_utilises: produits.trim() || null,
        status,
        date_soin: dateSoin ? new Date(dateSoin).toISOString() : undefined,
      });

      // flash + redirection
      router.replace("/pansements?flash=created");
    } catch (err: any) {
      alert("Erreur: " + (err?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  const recap = useMemo(() => ({
    patient: selectedPatient ? `${selectedPatient.nom} ${selectedPatient.prenom} (${selectedPatient.numero_dossier})` : "—",
    type: type || "—",
    status,
  }), [selectedPatient, type, status]);

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

            {/* Récap */}
            <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50 p-3 text-sm">
              <div className="font-medium text-ink-800">Récapitulatif</div>
              <div className="mt-1 space-y-1 text-ink-700">
                <div><b>Patient :</b> {recap.patient}</div>
                <div><b>Type :</b> {recap.type}</div>
                <div><b>Statut :</b> {recap.status}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenu */}
      <section className="lg:col-span-2 space-y-6">
        {/* Étape 1 : Patient */}
        {step === 0 && (
          <Card title="Sélection du patient" subtitle={`Recherche (min. ${MIN_CHARS} caractères) par nom, prénom ou n° de dossier`}>
            <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e)=>setQ(e.target.value)}
                  placeholder="Ex : NGOMA, Pierre, HSP-2025-000123…"
                  className={inputCls}
                  aria-label="Rechercher un patient"
                />
                {loadingPatients && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-ink-400" />}
              </div>

              <div className="rounded-xl border border-ink-100 bg-white p-2">
                {patientResults.length === 0 ? (
                  <div className="p-3 text-sm text-ink-500">
                    {q.trim().length < MIN_CHARS
                      ? "Tape au moins deux caractères pour commencer la recherche…"
                      : "Aucun résultat."}
                  </div>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {patientResults.map(p => (
                      <li key={p.id} className="py-2 px-2 flex items-center justify-between hover:bg-ink-50 rounded-lg">
                        <div className="text-sm">
                          <div className="font-medium">{p.nom} {p.prenom}</div>
                          <div className="text-ink-500 text-xs">{p.numero_dossier}</div>
                        </div>
                        <button
                          type="button"
                          onClick={()=>{ setSelectedPatient(p); setStep(1); }}
                          className="rounded-md bg-congo-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                        >
                          Sélectionner
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedPatient && (
                <div className="text-sm text-ink-700">
                  Sélection : <b>{selectedPatient.nom} {selectedPatient.prenom}</b> ({selectedPatient.numero_dossier})
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Étape 2 : Détails */}
        {step === 1 && (
          <Card title="Détails du pansement" subtitle="Le soignant et la dernière visite seront déduits automatiquement si besoin">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Type de pansement">
                <input className={inputCls} value={type} onChange={(e)=>setType(e.target.value)} placeholder="Ex : Pansement simple" />
              </Field>
              <Field label="Statut">
                <select className={inputCls} value={status} onChange={(e)=>setStatus(e.target.value as any)}>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminé</option>
                  <option value="annule">Annulé</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="État de la plaie">
                <input className={inputCls} value={etat} onChange={(e)=>setEtat(e.target.value)} placeholder="Ex : propre, peu exsudative…" />
              </Field>
              <Field label="Produits utilisés">
                <input className={inputCls} value={produits} onChange={(e)=>setProduits(e.target.value)} placeholder="Ex : Bétadine, gaze stérile…" />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-4">
              <Field label="Observation">
                <textarea className={inputCls} rows={4} value={observation} onChange={(e)=>setObservation(e.target.value)} placeholder="Consignes, remarques…" />
              </Field>
              <Field label="Date/heure du soin (optionnel)">
                <input type="datetime-local" className={inputCls} value={dateSoin} onChange={(e)=>setDateSoin(e.target.value)} />
              </Field>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="sticky bottom-4 z-10">
          <div className="rounded-xl bg-white/90 backdrop-blur border border-ink-100 shadow p-3 flex items-center justify-between">
            <div className="text-xs text-ink-600">Étape <b>{step + 1}</b> / {steps.length}</div>
            <div className="flex items-center gap-2">
              {step > 0 && <button type="button" className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50" onClick={()=>setStep(step-1)}>Précédent</button>}
              {step < steps.length - 1 ? (
                <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700" onClick={()=>setStep(step+1)}>
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={busy} className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                  {busy ? "Enregistrement…" : "Enregistrer le pansement"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode; }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
        {subtitle && <p className="text-xs text-ink-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode; }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">{label}</label>
      {children}
    </div>
  );
}
const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";
