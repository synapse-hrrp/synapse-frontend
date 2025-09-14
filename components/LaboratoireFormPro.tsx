"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createLaboratoire, listPatientsPaginated, getToken, me } from "@/lib/api";
import { Check, ChevronRight, UserSearch, Beaker, ClipboardList, Loader2 } from "lucide-react";

type PatientRow = { id: string; numero_dossier: string; nom: string; prenom: string };

const steps = [
  { key: "patient", label: "Patient", icon: UserSearch },
  { key: "test", label: "Test labo", icon: Beaker },
  { key: "result", label: "Résultats (optionnel)", icon: ClipboardList },
] as const;

const MIN_CHARS = 2, PAGE_SIZE = 8, DEBOUNCE_MS = 220;

export default function LaboratoireFormPro() {
  const router = useRouter();

  // Garde
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace("/login?next=/laboratoire/new"); return; }
    me().catch(() => window.location.replace("/login?next=/laboratoire/new"));
  }, []);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Patient search (debounce + cache + abort)
  const [q, setQ] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientResults, setPatientResults] = useState<PatientRow[]>([]);
  const [recentPatients, setRecentPatients] = useState<PatientRow[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, PatientRow[]>>(new Map());

  useEffect(() => { // prefetch derniers patients
    (async () => {
      try {
        const res: any = await listPatientsPaginated({ page: 1, per_page: PAGE_SIZE });
        const rows: PatientRow[] = Array.isArray(res) ? res : (res.data ?? []);
        setRecentPatients(rows);
        setPatientResults(rows);
      } catch { setRecentPatients([]); }
    })();
  }, []);

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
        // @ts-ignore
        const res: any = await listPatientsPaginated({ page: 1, per_page: PAGE_SIZE, search: term, signal: ctrl.signal });
        const rows: PatientRow[] = Array.isArray(res) ? res : (res.data ?? []);
        cacheRef.current.set(term, rows);
        setPatientResults(rows);
      } catch (e: any) {
        if (e?.name !== "AbortError") setPatientResults([]);
      } finally { setLoadingPatients(false); }
    }, DEBOUNCE_MS);
    return () => clearTimeout(tid);
  }, [q, recentPatients]);

  // Champs Labo
  const [visiteId, setVisiteId] = useState("");
  const [testCode, setTestCode] = useState("");
  const [testName, setTestName] = useState("");
  const [specimen, setSpecimen] = useState("");
  const [status, setStatus] = useState<"pending"|"in_progress"|"validated"|"canceled">("pending");

  // Résultats (optionnels)
  const [resultValue, setResultValue] = useState("");
  const [unit, setUnit] = useState("");
  const [refRange, setRefRange] = useState("");
  const [resultJsonText, setResultJsonText] = useState(""); // JSON libre
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState("XAF");

  const progress = ((step + 1) / steps.length) * 100;
  const next = () => { if (step < steps.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const recap = useMemo(() => ({
    patient: selectedPatient ? `${selectedPatient.nom} ${selectedPatient.prenom} (${selectedPatient.numero_dossier})` : "—",
    test: testName ? `${testName} (${testCode || "—"})` : "—",
    status,
  }), [selectedPatient, testName, testCode, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient?.id) { alert("Sélectionne un patient."); return; }
    if (!testCode.trim() || !testName.trim()) { alert("test_code et test_name sont requis."); return; }

    let result_json: any = undefined;
    if (resultJsonText.trim()) {
      try { result_json = JSON.parse(resultJsonText); }
      catch { alert("Le JSON des résultats est invalide."); return; }
    }

    setBusy(true);
    try {
      await createLaboratoire({
        patient_id: selectedPatient.id,
        visite_id: visiteId.trim() || undefined,
        test_code: testCode.trim(),
        test_name: testName.trim(),
        specimen: specimen.trim() || undefined,
        status,
        result_value: resultValue.trim() || undefined,
        unit: unit.trim() || undefined,
        ref_range: refRange.trim() || undefined,
        result_json,
        price: price ? Number(price) : undefined,
        currency: currency || undefined,
      });
      router.replace("/laboratoire?flash=created");
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

            {/* Récap */}
            <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50 p-3 text-sm">
              <div className="font-medium text-ink-800">Récapitulatif</div>
              <div className="mt-1 space-y-1 text-ink-700">
                <div><b>Patient :</b> {recap.patient}</div>
                <div><b>Test :</b> {recap.test}</div>
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
                <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Ex : NGOMA, Pierre, HSP-2025-000123…" className={inputCls} />
                {loadingPatients && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-ink-400" />}
              </div>
              <div className="rounded-xl border border-ink-100 bg-white p-2">
                {patientResults.length === 0 ? (
                  <div className="p-3 text-sm text-ink-500">
                    {q.trim().length < MIN_CHARS ? "Tape au moins deux caractères…" : "Aucun résultat."}
                  </div>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {patientResults.map(p => (
                      <li key={p.id} className="py-2 px-2 flex items-center justify-between hover:bg-ink-50 rounded-lg">
                        <div className="text-sm">
                          <div className="font-medium">{p.nom} {p.prenom}</div>
                          <div className="text-ink-500 text-xs">{p.numero_dossier}</div>
                        </div>
                        <button type="button" onClick={()=>{ setSelectedPatient(p); setStep(1); }}
                          className="rounded-md bg-congo-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
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

        {/* Étape 2 : Test */}
        {step === 1 && (
          <Card title="Prescription du test" subtitle="Renseigne le code et le nom du test (requis)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Code du test *">
                <input className={inputCls} required value={testCode} onChange={(e)=>setTestCode(e.target.value)} placeholder="Ex : FBC, CRP, GLU" />
              </Field>
              <Field label="Nom du test *">
                <input className={inputCls} required value={testName} onChange={(e)=>setTestName(e.target.value)} placeholder="Ex : Numération formule, CRP" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <Field label="Specimen">
                <input className={inputCls} value={specimen} onChange={(e)=>setSpecimen(e.target.value)} placeholder="Ex : Sang total, Sérum, Urine…" />
              </Field>
              <Field label="Statut">
                <select className={inputCls} value={status} onChange={(e)=>setStatus(e.target.value as any)}>
                  <option value="pending">En attente</option>
                  <option value="in_progress">En cours</option>
                  <option value="validated">Validé</option>
                  <option value="canceled">Annulé</option>
                </select>
              </Field>
              <Field label="Visite (UUID, optionnel)">
                <input className={inputCls} value={visiteId} onChange={(e)=>setVisiteId(e.target.value)} placeholder="Ex: daf79e90-...-c7da" />
              </Field>
            </div>
          </Card>
        )}

        {/* Étape 3 : Résultats (optionnel) */}
        {step === 2 && (
          <Card title="Résultats & Facturation (optionnel)" subtitle="Tu peux laisser vide et valider plus tard">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Valeur">
                <input className={inputCls} value={resultValue} onChange={(e)=>setResultValue(e.target.value)} placeholder="Ex : 5.4" />
              </Field>
              <Field label="Unité">
                <input className={inputCls} value={unit} onChange={(e)=>setUnit(e.target.value)} placeholder="Ex : g/dL" />
              </Field>
              <Field label="Intervalle de réf.">
                <input className={inputCls} value={refRange} onChange={(e)=>setRefRange(e.target.value)} placeholder="Ex : 4.0 – 6.0" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <Field label="Prix">
                <input type="number" step="0.01" className={inputCls} value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="Ex : 2500" />
              </Field>
              <Field label="Devise">
                <input className={inputCls} value={currency} onChange={(e)=>setCurrency(e.target.value.toUpperCase())} placeholder="XAF" />
              </Field>
              <div />
            </div>

            <Field label="Résultats (JSON)">
              <textarea rows={4} className={inputCls} value={resultJsonText} onChange={(e)=>setResultJsonText(e.target.value)} placeholder='{"hgb": 12.2, "rbc": 4.8}' />
            </Field>
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
                  {busy ? "Enregistrement…" : "Créer l’examen"}
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
