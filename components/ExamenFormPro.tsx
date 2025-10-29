"use client";

import { useLaboratoire } from "@/components/LabShell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getExamen,
  createExamen,
  updateExamen,
  listPatientsPaginated,
  listAllServices,
  listPersonnelsPaginated,
  listAllTarifs,
  listMedecinsPaginated,
} from "@/lib/api";
import { useAuthz } from "@/lib/authz";
import { Check, ChevronRight, Microscope, Users, UserCheck, FileText } from "lucide-react";

/* ---------------- Types ---------------- */

type Props = {
  examenId?: string;
  afterSavePath?: string;
  defaultServiceSlug?: string | null;
};

type Payload = {
  patient_id: string;
  service_slug?: string | null;

  type_origine: "interne" | "externe";
  prescripteur_externe?: string | null;
  reference_demande?: string | null;

  code_examen?: string | null;
  nom_examen?: string | null;
  prelevement?: string | null;
  statut: "en_attente" | "en_cours" | "termine" | "valide";

  valeur_resultat?: string | null;
  unite?: string | null;
  intervalle_reference?: string | null;

  prix?: string | number | null;
  devise?: string | null;

  demande_par?: number | null;
  date_demande?: string | null; // ISO
  valide_par?: number | null;
  date_validation?: string | null;
};

type ServiceDTO = { id?: number; slug: string; name: string };
type PersonnelMini = { id: number; full_name: string };

type TarifOption = {
  id: number | string;
  code: string;
  libelle: string;
  montant: number | string;
  devise: string | null;
  service_slug?: string | null;
};

const steps = [
  { key: "who", label: "Patient & Service", icon: Users },
  { key: "what", label: "Examen", icon: Microscope },
  { key: "result", label: "Résultat", icon: FileText },
  { key: "trace", label: "Traçabilité", icon: UserCheck },
] as const;

/* ---------------- Helpers ---------------- */

function nullifyEmpty<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === "" ? null : v;
  return out;
}
function arrify(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
}
function normalizeFromApi(raw: any): Payload {
  const it = raw ?? {};
  return {
    patient_id: String(it.patient_id ?? ""),
    service_slug: it.service_slug ?? null,
    type_origine: (it.type_origine ?? (it.service_slug ? "interne" : "externe")) as Payload["type_origine"],
    prescripteur_externe: it.prescripteur_externe ?? "",
    reference_demande: it.reference_demande ?? "",
    code_examen: it.code_examen ?? "",
    nom_examen: it.nom_examen ?? "",
    prelevement: it.prelevement ?? "",
    statut: (it.statut ?? "en_attente") as Payload["statut"],
    valeur_resultat: it.valeur_resultat ?? "",
    unite: it.unite ?? "",
    intervalle_reference: it.intervalle_reference ?? "",
    prix: it.prix ?? "",
    devise: it.devise ?? "XAF",
    demande_par: (typeof it.demande_par === "object" ? it.demande_par?.id : it.demande_par) ?? null,
    date_demande: it.date_demande ?? "",
    valide_par: (typeof it.valide_par === "object" ? it.valide_par?.id : it.valide_par) ?? null,
    date_validation: it.date_validation ?? "",
  };
}

/* ---------------- Component ---------------- */

export default function ExamenFormPro({
  examenId,
  afterSavePath = "/laboratoire/examens",
  defaultServiceSlug = null,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(examenId);
  const { canAny } = useAuthz();
  const { caps } = useLaboratoire();

  const allowCreate = canAny(["examen.request.create"]) || caps.examens.requestCreate;
  const allowWrite = canAny(["examen.result.write"]) || caps.examens.resultWrite;
  const canSubmit = isEdit ? allowWrite : allowCreate;

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<Payload>({
    patient_id: "",
    service_slug: defaultServiceSlug ?? null,
    type_origine: defaultServiceSlug ? "interne" : "externe",
    prescripteur_externe: "",
    reference_demande: "",
    code_examen: "",
    nom_examen: "",
    prelevement: "",
    statut: "en_attente",
    valeur_resultat: "",
    unite: "",
    intervalle_reference: "",
    prix: "",
    devise: "XAF",
    demande_par: null,
    date_demande: "",
    valide_par: null,
    date_validation: "",
  });

  // Dropdown data
  const [patients, setPatients] = useState<any[]>([]);
  const [pQ, setPQ] = useState("");
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [personnels, setPersonnels] = useState<PersonnelMini[]>([]);
  const [medecins, setMedecins] = useState<Array<{ id: number; label: string }>>([]);

  // Tarifs
  const [tQ, setTQ] = useState("");
  const [tarifs, setTarifs] = useState<TarifOption[]>([]);
  const [tarifLoading, setTarifLoading] = useState(false);

  // Charger l’examen si édition
  useEffect(() => {
    if (!isEdit || !examenId) return;
    let abo = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res: any = await getExamen(examenId);
        const raw = res?.data ?? res;
        if (!abo) setData(normalizeFromApi(raw));
      } catch (e: any) {
        if (!abo) setError(e?.message || "Impossible de charger l'examen.");
      } finally {
        if (!abo) setLoading(false);
      }
    })();
    return () => { abo = true; };
  }, [isEdit, examenId]);

  // Services + personnels
  useEffect(() => {
    let abo = false;
    (async () => {
      try {
        const [svcRes, perRes] = await Promise.all([
          listAllServices(),
          listPersonnelsPaginated({ page: 1, per_page: 200 }),
        ]);
        if (!abo) {
          const svcArr = arrify(svcRes) as ServiceDTO[];
          setServices(
            svcArr.filter((s) => !!s.slug).map((s) => ({ slug: s.slug, name: s.name, id: s.id }))
          );

          const perArr = arrify(perRes);
          setPersonnels(
            perArr.map((p: any) => ({
              id: Number(p.id),
              full_name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || String(p.id),
            }))
          );
        }
      } catch {
        if (!abo) { setServices([]); setPersonnels([]); }
      }
    })();
    return () => { abo = true; };
  }, []);

  // Médecins (demandé par)
  useEffect(() => {
    let abo = false;
    (async () => {
      try {
        const res = await listMedecinsPaginated({ page: 1, per_page: 200 });
        const arr = Array.isArray(res) ? res : res?.data ?? res?.data?.data ?? [];
        const mapped = arr.map((m: any) => {
          const label =
            m.full_name ||
            m.nom_complet ||
            m.personnel?.full_name ||
            [m.personnel?.first_name, m.personnel?.last_name].filter(Boolean).join(" ") ||
            String(m.id);
          return { id: Number(m.id), label };
        });
        if (!abo) setMedecins(mapped);
      } catch {
        if (!abo) setMedecins([]);
      }
    })();
    return () => { abo = true; };
  }, []);

  // Recherche patients
  useEffect(() => {
    let abo = false;
    (async () => {
      try {
        const res: any = await listPatientsPaginated({ search: pQ, page: 1, per_page: 10 });
        const items = Array.isArray(res) ? res : res.data ?? res?.data?.data ?? [];
        if (!abo) setPatients(items);
      } catch {
        if (!abo) setPatients([]);
      }
    })();
    return () => { abo = true; };
  }, [pQ]);

  // Charger tarifs actifs (filtrés par service)
  useEffect(() => {
    let abo = false;
    (async () => {
      try {
        setTarifLoading(true);
        const arr = await listAllTarifs({
          only_active: 1,
          sort: "code",
          dir: "asc",
          service: data.service_slug || "",
          per_page: 200,
        });

        const mapped = arr
          .filter((t: any) => !data.service_slug || t.service_slug === data.service_slug)
          .sort((a: any, b: any) => String(a.code || "").localeCompare(String(b.code || "")))
          .map((it: any) => ({
            id: it.id,
            code: it.code,
            libelle: it.libelle ?? it.code,
            montant: it.montant,
            devise: it.devise ?? "XAF",
            service_slug: it.service_slug ?? null,
          }));

        if (!abo) setTarifs(mapped);
      } catch {
        if (!abo) setTarifs([]);
      } finally {
        if (!abo) setTarifLoading(false);
      }
    })();
    return () => { abo = true; };
  }, [data.service_slug]);

  // Aligner origine sur service + masquer/vider champs internes si externe
  useEffect(() => {
    const nextType: Payload["type_origine"] = data.service_slug ? "interne" : "externe";
    if (data.type_origine !== nextType) {
      setData((d) => ({ ...d, type_origine: nextType }));
    }
    if (nextType === "interne" && (data.prescripteur_externe ?? "") !== "") {
      setData((d) => ({ ...d, prescripteur_externe: "" }));
    }
    if (nextType === "externe" && (data.demande_par !== null)) {
      setData((d) => ({ ...d, demande_par: null })); // ⬅️ vide le demandeur quand externe
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.service_slug]);

  // Sélection d’un tarif -> auto-remplissage
  function onPickTarif(code: string) {
    upd("code_examen", code || "");
    const found = tarifs.find((t) => t.code === code);
    if (found) {
      upd("nom_examen", found.libelle || "");
      const montantNum =
        typeof found.montant === "string" ? Number(found.montant) : (found.montant ?? 0);
      upd("prix", isNaN(montantNum) ? null : montantNum);
      upd("devise", found.devise || "XAF");
    } else {
      upd("nom_examen", "");
      upd("prix", null);
      upd("devise", "XAF");
    }
  }

  function upd<K extends keyof Payload>(k: K, v: Payload[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  const progress = ((step + 1) / steps.length) * 100;
  const next = () => { if (step < steps.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  // champs autorisés à l’update (dates gérées auto côté back)
  const UPDATE_ALLOWED: (keyof Payload)[] = [
    "code_examen",
    "nom_examen",
    "prelevement",
    "statut",
    "valeur_resultat",
    "unite",
    "intervalle_reference",
    "demande_par",
    "valide_par",
    // @ts-ignore
    "resultat_json",
    "prix",
    "devise",
  ];

  function cleanForUpdate(d: any) {
    const out: any = {};
    for (const k of UPDATE_ALLOWED) {
      if (typeof d[k] !== "undefined") out[k] = d[k];
    }
    Object.keys(out).forEach((k) => {
      if (out[k] === "" || typeof out[k] === "undefined") delete out[k];
    });
    return out;
  }

  // Enregistrer
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);

    try {
      if (isEdit && examenId) {
        const raw = nullifyEmpty({ ...data });
        const payload = cleanForUpdate(raw);
        delete (payload as any).date_demande;     // dates auto côté back
        delete (payload as any).date_validation;  // idem
        await updateExamen(examenId, payload);
      } else {
        const payload: any = nullifyEmpty({ ...data });
        delete payload.type_origine;
        delete payload.date_demande;
        delete payload.date_validation;
        delete payload.valide_par; // ⬅️ jamais envoyé en création
        await createExamen(payload);
      }

      router.replace(afterSavePath);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l’enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  if (isEdit && !allowWrite) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm">
        <div className="text-lg font-semibold text-ink-900">Accès limité</div>
        <p className="text-sm text-ink-600 mt-1">Vous n’avez pas la permission de modifier les examens.</p>
      </div>
    );
  }
  if (!isEdit && !allowCreate) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-6 text-center shadow-sm">
        <div className="text-lg font-semibold text-ink-900">Accès limité</div>
        <p className="text-sm text-ink-600 mt-1">Vous n’avez pas la permission de créer des examens.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm animate-pulse h-40" />;
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Étapes */}
      <aside className="lg:col-span-1">
        <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden sticky top-20">
          <div className="h-1 bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
          <div className="p-4">
            <div className="mb-3 text-sm font-semibold">{isEdit ? "Édition d’un examen" : "Nouvel examen"}</div>
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
                      ${active ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/30" : done ? "text-ink-700 hover:bg-ink-50" : "text-ink-500 hover:bg-ink-50"}`}
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

            {error && (
              <div className="mt-4 rounded-lg border border-congo-red/30 bg-[color:var(--color-congo-red)]/10 p-2.5 text-sm text-congo-red">
                {error}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Champs */}
      <section className="lg:col-span-2 space-y-6">
        {/* Patient & Service */}
        {step === 0 && (
          <Card title="Patient & Service" icon={<Users className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Patient */}
              <Field label="Patient" required>
                <input
                  className={inputCls}
                  placeholder="Rechercher par nom / n° dossier…"
                  value={pQ}
                  onChange={(e) => setPQ(e.target.value)}
                />
                <select
                  className={inputCls + " mt-2"}
                  value={data.patient_id}
                  onChange={(e) => upd("patient_id", e.target.value)}
                  required
                >
                  <option value="">— Choisir un patient —</option>
                  {patients.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {`${p.nom || ""} ${p.prenom || ""}`.trim()} {p.numero_dossier ? `(${p.numero_dossier})` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Service */}
              <Field label="Service demandeur">
                <select
                  className={inputCls}
                  value={data.service_slug ?? ""}
                  onChange={(e) => upd("service_slug", e.target.value || null)}
                >
                  <option value="">— (Labo) —</option>
                  {services.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-500 mt-1">Vide = “Labo” (externe). Renseigne un service pour une demande interne.</p>
              </Field>

              {/* Origine / Prescripteur / Référence */}
              <Field label="Origine">
                <select
                  className={inputCls}
                  value={data.type_origine}
                  onChange={(e) => {
                    const val = e.target.value as Payload["type_origine"];
                    setData((d) => ({
                      ...d,
                      type_origine: val,
                      ...(val === "interne" ? { prescripteur_externe: "" } : { demande_par: null }),
                    }));
                  }}
                >
                  <option value="interne">interne</option>
                  <option value="externe">externe</option>
                </select>
                <p className="text-xs text-ink-500 mt-1">Si un service est sélectionné, l’origine sera considérée comme “interne”.</p>
              </Field>

              {data.type_origine === "externe" && (
                <Field label="Prescripteur externe">
                  <input
                    className={inputCls}
                    value={data.prescripteur_externe ?? ""}
                    onChange={(e) => upd("prescripteur_externe", e.target.value)}
                  />
                </Field>
              )}

              <Field label="Référence demande">
                <input
                  className={inputCls}
                  value={data.reference_demande ?? ""}
                  onChange={(e) => upd("reference_demande", e.target.value)}
                />
              </Field>
            </div>
          </Card>
        )}

        {/* Examen */}
        {step === 1 && (
          <Card title="Examen" icon={<Microscope className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Rechercher un tarif">
                <input
                  className={inputCls}
                  value={tQ}
                  onChange={(e) => setTQ(e.target.value)}
                  placeholder="code ou libellé…"
                />
              </Field>

              <Field label="Code tarif (Examen)" required>
                <select
                  className={inputCls}
                  value={data.code_examen ?? ""}
                  onChange={(e) => onPickTarif(e.target.value)}
                  required
                >
                  <option value="">— Sélectionner —</option>
                  {tarifs
                    .filter((t) =>
                      tQ ? (`${t.code} ${t.libelle}`.toLowerCase().includes(tQ.toLowerCase())) : true
                    )
                    .map((t) => (
                      <option key={t.id} value={t.code}>
                        {t.code} — {t.libelle}
                      </option>
                    ))}
                </select>
                {tarifLoading && <div className="text-xs mt-1 text-ink-500">Chargement des tarifs…</div>}
              </Field>

              <Field label="Nom examen">
                <input
                  className={inputCls}
                  value={data.nom_examen ?? ""}
                  onChange={(e) => upd("nom_examen", e.target.value)}
                />
              </Field>

              <Field label="Prélèvement">
                <input
                  className={inputCls}
                  value={data.prelevement ?? ""}
                  onChange={(e) => upd("prelevement", e.target.value)}
                />
              </Field>

              <Field label="Statut">
                <select
                  className={inputCls}
                  value={data.statut}
                  onChange={(e) => upd("statut", e.target.value as Payload["statut"])}
                >
                  <option value="en_attente">en_attente</option>
                  <option value="en_cours">en_cours</option>
                  <option value="termine">termine</option>
                  <option value="valide">valide</option>
                </select>
              </Field>

              <Field label="Prix">
                <input
                  className={inputCls}
                  type="number"
                  step="0.01"
                  value={String(data.prix ?? "")}
                  onChange={(e) => upd("prix", e.target.value === "" ? null : Number(e.target.value))}
                />
              </Field>

              <Field label="Devise">
                <input
                  className={inputCls}
                  value={data.devise ?? ""}
                  onChange={(e) => upd("devise", e.target.value)}
                  placeholder="XAF"
                />
              </Field>
            </div>
          </Card>
        )}

        {/* Résultat */}
        {step === 2 && (
          <Card title="Résultat" icon={<FileText className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Valeur">
                <input className={inputCls} value={data.valeur_resultat ?? ""} onChange={(e) => upd("valeur_resultat", e.target.value)} />
              </Field>
              <Field label="Unité">
                <input className={inputCls} value={data.unite ?? ""} onChange={(e) => upd("unite", e.target.value)} />
              </Field>
              <Field label="Intervalle de référence">
                <input className={inputCls} value={data.intervalle_reference ?? ""} onChange={(e) => upd("intervalle_reference", e.target.value)} />
              </Field>
            </div>
          </Card>
        )}

        {/* Traçabilité */}
        {step === 3 && (
          <Card title="Traçabilité" icon={<UserCheck className="h-4 w-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ⬇️ Demandé par + date -> seulement si ORIGINE = interne */}
              {data.type_origine === "interne" && (
                <>
                  <Field label="Demandé par (médecin)">
                    <select
                      className={inputCls}
                      value={String(data.demande_par ?? "")}
                      onChange={(e) => upd("demande_par", e.target.value === "" ? null : Number(e.target.value))}
                    >
                      <option value="">—</option>
                      {medecins.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Date de demande (auto)">
                    <input
                      className={inputCls}
                      value={data.date_demande ? new Date(data.date_demande).toLocaleString() : "—"}
                      readOnly
                    />
                  </Field>
                </>
              )}

              {/* ⬇️ Validé par + date -> visibles UNIQUEMENT en ÉDITION */}
              {isEdit && (
                <>
                  <Field label="Validé par (personnel)">
                    <select
                      className={inputCls}
                      value={String(data.valide_par ?? "")}
                      onChange={(e) => upd("valide_par", e.target.value === "" ? null : Number(e.target.value))}
                    >
                      <option value="">—</option>
                      {personnels.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || p.id}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Date de validation (auto)">
                    <input
                      className={inputCls}
                      value={data.date_validation ? new Date(data.date_validation).toLocaleString() : "—"}
                      readOnly
                    />
                  </Field>
                </>
              )}
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
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  onClick={next}
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
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

/* --- UI helpers --- */
function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}
function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
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
