"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createVisite,
  listAllServices,
  listAllTarifs,
  listPatientsPaginated,
  listMedecinsPaginated,
  getToken,
  me,
  type ServiceDTO
} from "@/lib/api";
import {
  Check,
  ChevronRight,
  UserSearch,
  ClipboardList,
  Building2,
  Loader2,
  Stethoscope,
  WalletMinimal,
  ShieldCheck,
} from "lucide-react";

/* ---------------- TYPES ---------------- */
type PatientRow = { id: string; numero_dossier: string; nom: string; prenom: string };

type MedecinDTO = {
  id: number;
  personnel?: {
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

type MedecinMini = { id: number; name: string };

type TarifDTO = {
  id: string | number;
  code?: string;
  libelle?: string;
  montant?: number | string;
  devise?: string | null;
  service_slug?: string | null;
  [k: string]: any;
};

/** Données d’amorçage optionnelles (duplication / édition simplifiée) */
type InitialData = {
  selectedPatient?: { id: string; numero_dossier?: string; nom?: string; prenom?: string } | null;
  service_id?: number | "";
  service_slug?: string | null;
  motif?: string;
  hypothese?: string;
  affectation_id?: string | null;
  medecin_id?: number | "";
  medecin_nom?: string;
  tarif_code?: string;
  montant_prevu?: number | string | null;
  devise?: string | null;
  statut?: "EN_ATTENTE" | "A_ENCAISSER" | "PAYEE" | "CLOTUREE";
};

/* ---------------- CONSTANTS ---------------- */
const steps = [
  { key: "patient",  label: "Patient",          icon: UserSearch },
  { key: "service",  label: "Service",          icon: Building2 },
  { key: "motif",    label: "Motif",            icon: ClipboardList },
  { key: "medecin",  label: "Intervenant",      icon: Stethoscope },
  { key: "tarif",    label: "Tarification",     icon: WalletMinimal },
  { key: "statut",   label: "Statut & résumé",  icon: ShieldCheck },
] as const;

const MIN_CHARS = 2;
const PAGE_SIZE = 8;
const DEBOUNCE_MS = 220;

/* ---------------- HELPERS ---------------- */
function arrify<T = any>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];
  if (Array.isArray(res?.data)) return res.data as T[];
  if (Array.isArray(res?.data?.data)) return res.data.data as T[];
  return [];
}
function nullIfEmpty<T = any>(v: T): T | null | undefined {
  if (v === "") return null;
  return v;
}

/* ---------------- UI HELPERS ---------------- */
function Card({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
      </div>
      {subtitle && <p className="text-xs text-ink-600 -mt-2 mb-3">{subtitle}</p>}
      {children}
    </section>
  );
}
function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-ink-600">
        {label} {required && <span className="text-congo-red">*</span>}
      </label>
      {children}
    </div>
  );
}
const inputCls =
  "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

/* ---------------- COMPONENT ---------------- */
export default function VisiteFormPro({ initialData }: { initialData?: InitialData }) {
  const router = useRouter();

  // Auth check
  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.replace("/login?next=/reception/visites/new");
      return;
    }
    me().catch(() => window.location.replace("/login?next=/reception/visites/new"));
  }, []);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  /* ---------- PATIENT ---------- */
  const [q, setQ] = useState("");
  const [patientResults, setPatientResults] = useState<PatientRow[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [recentPatients, setRecentPatients] = useState<PatientRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, PatientRow[]>>(new Map());

  /* ---------- SERVICES ---------- */
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [serviceId, setServiceId] = useState<number | "">("");
  const [servicesReady, setServicesReady] = useState(false);

  const selectedService = useMemo(
    () => services.find((s) => Number(serviceId) === Number((s as any).id)),
    [services, serviceId]
  );
  const selectedServiceSlug = (selectedService as any)?.slug ?? "";

  /* ---------- MOTIF ---------- */
  const [motif, setMotif] = useState("");
  const [hypothese, setHypothese] = useState("");
  const [affectationId, setAffectationId] = useState<string>("");

  /* ---------- MÉDECIN (pas d’agent côté UI) ---------- */
  const [medecins, setMedecins] = useState<MedecinMini[]>([]);
  const [medecinId, setMedecinId] = useState<number | "">("");
  const [medecinNom, setMedecinNom] = useState<string>("");

  /* ---------- TARIFS ---------- */
  const [tarifs, setTarifs] = useState<TarifDTO[]>([]);
  const [tarifCode, setTarifCode] = useState<string>(""); // ⚠️ code, pas id
  const [montant, setMontant] = useState<string>("");
  const [devise, setDevise] = useState<string>("");
  const [tQ, setTQ] = useState("");
  const [tarifsReady, setTarifsReady] = useState(false);

  /* ---------- STATUT ---------- */
  const statutOptions = [
    { value: "EN_ATTENTE", label: "En attente" },
    { value: "A_ENCAISSER", label: "À encaisser" },
    { value: "PAYEE", label: "Payée" },
    { value: "CLOTUREE", label: "Clôturée" },
  ] as const;
  const [statut, setStatut] =
    useState<(typeof statutOptions)[number]["value"]>("EN_ATTENTE");

  /* ---------- INIT DATA (listes) ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await listPatientsPaginated({ page: 1, per_page: PAGE_SIZE });
        const rows = arrify<PatientRow>(res);
        setRecentPatients(rows);
        setPatientResults(rows);
      } catch {
        setRecentPatients([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const svcArr = arrify<ServiceDTO>(await listAllServices());
        setServices(svcArr.filter((s) => (s as any).is_active !== false));
      } catch {
        setServices([]);
      } finally {
        setServicesReady(true);
      }

      try {
        const raw = await listMedecinsPaginated({ page: 1, per_page: 200 });
        const medArr = arrify<MedecinDTO>(raw);
        const mapped: MedecinMini[] = medArr.map((m) => {
          const label =
            m.personnel?.full_name ||
            [m.personnel?.first_name, m.personnel?.last_name].filter(Boolean).join(" ").trim() ||
            `Médecin #${m.id}`;
          return { id: Number(m.id), name: label };
        });
        setMedecins(mapped);
      } catch {
        setMedecins([]);
      }
    })();
  }, []);

  // Rafraîchir tarifs selon service (par slug)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = arrify<TarifDTO>(
          await listAllTarifs({
            only_active: 1,
            sort: "code",
            dir: "asc",
            service: selectedServiceSlug || "",
          })
        );
        const filtered = selectedServiceSlug
          ? all.filter((t) => (t as any).service_slug === selectedServiceSlug)
          : all;
        if (!cancelled) setTarifs(filtered);
      } catch {
        if (!cancelled) setTarifs([]);
      } finally {
        if (!cancelled) setTarifsReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedServiceSlug]);

  /* ---------- SEARCH PATIENTS ---------- */
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
        const res = await listPatientsPaginated({
          page: 1,
          per_page: PAGE_SIZE,
          search: term,
          signal: ctrl.signal,
        });
        const rows = arrify<PatientRow>(res);
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

  /* ---------- SNAPSHOT NOM MÉDECIN ---------- */
  useEffect(() => {
    if (medecinId && !medecinNom) {
      const n = medecins.find((m) => m.id === Number(medecinId))?.name;
      if (n) setMedecinNom(n);
    }
  }, [medecinId, medecinNom, medecins]);

  /* ---------- PRÉ-REMPLISSAGE initialData ---------- */
  useEffect(() => {
    if (!initialData) return;

    // Patient déjà connu
    if (initialData.selectedPatient) {
      // cast au type PatientRow
      const p = initialData.selectedPatient as any as PatientRow;
      setSelectedPatient({
        id: p.id,
        numero_dossier: p.numero_dossier || "",
        nom: p.nom || "",
        prenom: p.prenom || "",
      });
    }

    // Service : on privilégie l'id si fourni, sinon on résout via slug quand la liste est prête
    if (typeof initialData.service_id !== "undefined" && initialData.service_id !== null) {
      setServiceId(initialData.service_id || "");
    } else if (initialData.service_slug && servicesReady) {
      const svc = services.find((s: any) => s.slug === initialData.service_slug);
      if (svc) setServiceId(Number((svc as any).id));
    }

    if (typeof initialData.motif === "string") setMotif(initialData.motif);
    if (typeof initialData.hypothese === "string") setHypothese(initialData.hypothese);
    if (typeof initialData.affectation_id === "string") setAffectationId(initialData.affectation_id || "");

    if (typeof initialData.medecin_id !== "undefined") setMedecinId(initialData.medecin_id || "");
    if (typeof initialData.medecin_nom === "string") setMedecinNom(initialData.medecin_nom || "");

    if (typeof initialData.tarif_code === "string") setTarifCode(initialData.tarif_code || "");
    if (typeof initialData.montant_prevu !== "undefined" && initialData.montant_prevu !== null) {
      setMontant(String(initialData.montant_prevu));
    }
    if (typeof initialData.devise === "string") setDevise(initialData.devise || "XAF");

    if (typeof initialData.statut === "string") setStatut(initialData.statut as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, servicesReady]);

  /* ---------- TARIF PICK ---------- */
  function onPickTarif(code: string) {
    setTarifCode(code);
    const found = tarifs.find((t) => String(t.code || "") === code);
    if (found) {
      const n =
        typeof found.montant === "string"
          ? Number(found.montant)
          : (found.montant ?? 0);
      setMontant(Number.isFinite(n) ? String(n) : "");
      setDevise((found.devise || "XAF") as string);
    } else {
      setMontant("");
      setDevise("");
    }
  }

  /* ---------- SUBMIT ---------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedPatient?.id) { alert("Sélectionne un patient."); setStep(0); return; }
    if (!serviceId) { alert("Choisis un service."); setStep(1); return; }
    if (!motif.trim()) { alert("Le motif est requis."); setStep(2); return; }

    // On envoie le SLUG de service (le back convertit en id et valide facilement les tarifs)
    const svcSlug =
      (services.find((s: any) => Number(s.id) === Number(serviceId)) as any)?.slug || null;

    setBusy(true);
    try {
      await createVisite({
        patient_id: selectedPatient.id,

        // ✅ VisiteStoreRequest: service_id OU service_slug (on choisit slug)
        service_slug: svcSlug ?? undefined,

        // Migration: medecin_id -> table medecins
        medecin_id: medecinId ? Number(medecinId) : null,
        medecin_nom: nullIfEmpty(medecinNom) ?? undefined,

        // ✅ on passe le CODE, le back résout tarif_id
        tarif_code: nullIfEmpty(tarifCode) ?? undefined,

        // Laisse le modèle gérer devise/du si vide
        montant_prevu: montant ? Number(montant) : null,
        devise: devise?.trim() ? devise.trim() : undefined,

        plaintes_motif: motif.trim(),
        hypothese_diagnostic: nullIfEmpty(hypothese.trim()) ?? undefined,
        affectation_id: nullIfEmpty(affectationId) ?? undefined,

        create_affectation: true,

        statut,
      });
      router.replace("/reception/visites?flash=created");
    } catch (err: any) {
      alert("Erreur: " + (err?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  const progress = ((step + 1) / steps.length) * 100;
  const next = () => { if (step < steps.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const recap = useMemo(() => ({
    patient: selectedPatient ? `${selectedPatient.nom} ${selectedPatient.prenom} (${selectedPatient.numero_dossier})` : "—",
    service: serviceId ? (services.find(s => (s as any).id === Number(serviceId))?.name || serviceId) : "—",
    motif: motif || "—",
    medecin: medecinNom || (medecinId ? `#${medecinId}` : "—"),
    tarif: tarifCode || "—",
    montant: montant || "—",
    devise: devise || "—",
    statut,
  }), [selectedPatient, serviceId, services, motif, medecinId, medecinNom, tarifCode, montant, devise, statut]);

  /* ---------- RENDU COMPLET ---------- */
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
                const Icon = s.icon as any;
                const active = i === step;
                const done = i < step;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => setStep(i)}
                      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition
                        ${active ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/30" :
                          done ? "text-ink-700 hover:bg-ink-50" : "text-ink-500 hover:bg-ink-50"}`}
                    >
                      <span
                        className={`h-5 w-5 rounded-md flex items-center justify-center
                          ${active ? "bg-congo-green text-white" : done ? "bg-ink-200 text-ink-800" : "bg-ink-100 text-ink-600"}`}
                      >
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
                <div><b>Service :</b> {recap.service}</div>
                <div><b>Motif :</b> {recap.motif}</div>
                <div><b>Médecin :</b> {recap.medecin}</div>
                <div><b>Tarif :</b> {recap.tarif}</div>
                <div><b>Montant :</b> {recap.montant} {recap.devise}</div>
                <div><b>Statut :</b> {recap.statut}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenu */}
      <section className="lg:col-span-2 space-y-6">
        {/* Étape 1 : Patient */}
        {step === 0 && (
          <Card
            title="Sélection du patient"
            subtitle={`Recherche (min. ${MIN_CHARS} caractères) par nom, prénom ou n° de dossier`}
            icon={<UserSearch className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ex : NGOMA, Pierre, HSP-2025-000123…"
                  className={inputCls}
                  aria-label="Rechercher un patient"
                />
                {loadingPatients && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-ink-400" />
                )}
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
                    {patientResults.map((p) => (
                      <li
                        key={p.id}
                        className="py-2 px-2 flex items-center justify-between hover:bg-ink-50 rounded-lg"
                      >
                        <div className="text-sm">
                          <div className="font-medium">
                            {p.nom} {p.prenom}
                          </div>
                          <div className="text-ink-500 text-xs">{p.numero_dossier}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatient(p);
                            setStep(1);
                          }}
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

        {/* Étape 2 : Service */}
        {step === 1 && (
          <Card title="Service d’orientation" subtitle="Choisis le service concerné" icon={<Building2 className="h-4 w-4" />}>
            <select
              className={inputCls}
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— Choisir un service —</option>
              {services.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Card>
        )}

        {/* Étape 3 : Motif */}
        {step === 2 && (
          <Card title="Motif / Plaintes" subtitle="Décris brièvement la raison de la visite" icon={<ClipboardList className="h-4 w-4" />}>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Motif" required>
                <textarea
                  rows={4}
                  className={inputCls}
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Ex : Pansement de contrôle"
                />
              </Field>
              <Field label="Hypothèse diagnostique">
                <textarea
                  rows={3}
                  className={inputCls}
                  value={hypothese}
                  onChange={(e) => setHypothese(e.target.value)}
                  placeholder="Optionnel"
                />
              </Field>
              <Field label="Affectation (UUID)">
                <input
                  className={inputCls}
                  value={affectationId}
                  onChange={(e) => setAffectationId(e.target.value)}
                  placeholder="Optionnel"
                />
              </Field>
            </div>
          </Card>
        )}

        {/* Étape 4 : Intervenant */}
        {step === 3 && (
          <Card title="Intervenant" subtitle="Sélectionne le médecin (table medecins → relation personnel)" icon={<Stethoscope className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Médecin">
                <select
                  className={inputCls}
                  value={String(medecinId || "")}
                  onChange={(e) => setMedecinId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">—</option>
                  {medecins.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nom médecin (snapshot)">
                <input
                  className={inputCls}
                  value={medecinNom}
                  onChange={(e) => setMedecinNom(e.target.value)}
                  placeholder="(pré-rempli si médecin choisi)"
                />
              </Field>
            </div>
          </Card>
        )}

        {/* Étape 5 : Tarification */}
        {step === 4 && (
          <Card title="Tarification" subtitle="Choisis un code tarif ; le montant et la devise seront proposés" icon={<WalletMinimal className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Recherche tarif">
                <input
                  className={inputCls}
                  value={tQ}
                  onChange={(e) => setTQ(e.target.value)}
                  placeholder="code ou libellé…"
                />
              </Field>

              <Field label="Code tarif">
                <select
                  className={inputCls}
                  value={tarifCode}
                  onChange={(e) => onPickTarif(e.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  {tarifs
                    .filter((t) =>
                      tQ ? (`${t.code ?? ""} ${t.libelle ?? ""}`.toLowerCase().includes(tQ.toLowerCase())) : true
                    )
                    .sort((a, b) => String(a.code || "").localeCompare(String(b.code || "")))
                    .map((t) => (
                      <option key={(t.id ?? t.code) as any} value={t.code || ""}>
                        {t.code} — {t.libelle || t.code}
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Montant">
                <input
                  className={inputCls}
                  type="number"
                  step="0.01"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Devise">
                <input
                  className={inputCls}
                  value={devise}
                  onChange={(e) => setDevise(e.target.value)}
                  placeholder="XAF"
                />
              </Field>
            </div>
          </Card>
        )}

        {/* Étape 6 : Statut & résumé */}
        {step === 5 && (
          <Card title="Statut & résumé" icon={<ShieldCheck className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Statut">
                <select
                  className={inputCls}
                  value={statut}
                  onChange={(e) => setStatut(e.target.value as (typeof statutOptions)[number]["value"])}
                >
                  {statutOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
              <div className="text-sm text-ink-600 p-2">
                Vérifie le récapitulatif dans la colonne de gauche avant de valider.
              </div>
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
  );
}
