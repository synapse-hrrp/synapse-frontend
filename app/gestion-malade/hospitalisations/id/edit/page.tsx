"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, getHospitalisation, updateHospitalisation } from "@/lib/api";

const inputCls =
  "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

// union stricte pour éviter l'avertissement sur "statut"
type StatutHosp = "en_cours" | "transfere" | "sorti" | "annule";

type Hosp = {
  id: string;
  patient_id: string;
  service_slug?: string | null;
  admission_no?: string | null;

  unite?: string | null;
  chambre?: string | null;
  lit?: string | null;

  // On autorise string|number|null dans le state (input texte),
  // mais on convertira en number|null au submit.
  medecin_traitant_id?: string | number | null;

  motif_admission?: string | null;
  diagnostic_entree?: string | null;
  diagnostic_sortie?: string | null;

  date_admission?: string | null;
  date_sortie_prevue?: string | null;
  date_sortie_reelle?: string | null;

  statut: StatutHosp;
  prix?: number | string | null;
  devise?: string | null;
};

export default function HospEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.replace(
        `/login?next=/gestion-malade/hospitalisations/${params.id}/edit`
      );
      return;
    }
    me().catch(() =>
      window.location.replace(
        `/login?next=/gestion-malade/hospitalisations/${params.id}/edit`
      )
    );
  }, [params.id]);

  const [item, setItem] = useState<Hosp | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getHospitalisation(params.id);
        // sécurité : s’assurer que statut retombe dans l’union
        const statut: StatutHosp = (data?.statut as StatutHosp) ?? "en_cours";
        setItem({ ...data, statut });
      } catch {
        /* noop */
      }
    })();
  }, [params.id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setBusy(true);
    try {
      // conversions propres
      const medId =
        item.medecin_traitant_id === "" || item.medecin_traitant_id == null
          ? null
          : Number(item.medecin_traitant_id);
      const prixNum =
        item.prix === "" || item.prix == null ? null : Number(item.prix as any);

      await updateHospitalisation(params.id, {
        patient_id: item.patient_id,
        service_slug: item.service_slug || null,
        admission_no: item.admission_no || null,

        unite: item.unite || null,
        chambre: item.chambre || null,
        lit: item.lit || null,

        medecin_traitant_id: Number.isNaN(medId) ? null : medId,

        motif_admission: item.motif_admission || null,
        diagnostic_entree: item.diagnostic_entree || null,
        diagnostic_sortie: item.diagnostic_sortie || null,

        date_admission: item.date_admission || null,
        date_sortie_prevue: item.date_sortie_prevue || null,
        date_sortie_reelle: item.date_sortie_reelle || null,

        statut: item.statut as StatutHosp,

        prix: prixNum,
        devise: item.devise || "XAF",
      });

      router.replace("/gestion-malade/hospitalisations?flash=updated");
    } catch (e: any) {
      alert("Erreur: " + (e?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Modifier hospitalisation" subtitle={`ID: ${params.id}`} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {!item ? (
          <p>Chargement…</p>
        ) : (
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-4"
          >
            <Field label="Patient ID">
              <input
                className={inputCls}
                value={item.patient_id}
                onChange={(e) =>
                  setItem((i) => (i ? { ...i, patient_id: e.target.value } : i))
                }
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Service">
                <input
                  className={inputCls}
                  value={item.service_slug || ""}
                  onChange={(e) =>
                    setItem((i) => (i ? { ...i, service_slug: e.target.value } : i))
                  }
                />
              </Field>
              <Field label="Admission #">
                <input
                  className={inputCls}
                  value={item.admission_no || ""}
                  onChange={(e) =>
                    setItem((i) => (i ? { ...i, admission_no: e.target.value } : i))
                  }
                />
              </Field>
              <Field label="Médecin traitant ID">
                <input
                  className={inputCls}
                  value={String(item.medecin_traitant_id ?? "")}
                  onChange={(e) =>
                    setItem((i) =>
                      i ? { ...i, medecin_traitant_id: e.target.value } : i
                    )
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Unité">
                <input
                  className={inputCls}
                  value={item.unite || ""}
                  onChange={(e) =>
                    setItem((i) => (i ? { ...i, unite: e.target.value } : i))
                  }
                />
              </Field>
              <Field label="Chambre">
                <input
                  className={inputCls}
                  value={item.chambre || ""}
                  onChange={(e) =>
                    setItem((i) => (i ? { ...i, chambre: e.target.value } : i))
                  }
                />
              </Field>
              <Field label="Lit">
                <input
                  className={inputCls}
                  value={item.lit || ""}
                  onChange={(e) =>
                    setItem((i) => (i ? { ...i, lit: e.target.value } : i))
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Date admission">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={
                    item.date_admission
                      ? new Date(item.date_admission).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setItem((i) =>
                      i
                        ? {
                            ...i,
                            date_admission: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          }
                        : i
                    )
                  }
                />
              </Field>
              <Field label="Sortie prévue">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={
                    item.date_sortie_prevue
                      ? new Date(item.date_sortie_prevue).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setItem((i) =>
                      i
                        ? {
                            ...i,
                            date_sortie_prevue: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          }
                        : i
                    )
                  }
                />
              </Field>
              <Field label="Sortie réelle">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={
                    item.date_sortie_reelle
                      ? new Date(item.date_sortie_reelle).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setItem((i) =>
                      i
                        ? {
                            ...i,
                            date_sortie_reelle: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          }
                        : i
                    )
                  }
                />
              </Field>
            </div>

            <Field label="Motif">
              <input
                className={inputCls}
                value={item.motif_admission || ""}
                onChange={(e) =>
                  setItem((i) => (i ? { ...i, motif_admission: e.target.value } : i))
                }
              />
            </Field>

            <Field label="Diagnostic d'entrée">
              <textarea
                className={inputCls}
                rows={3}
                value={item.diagnostic_entree || ""}
                onChange={(e) =>
                  setItem((i) =>
                    i ? { ...i, diagnostic_entree: e.target.value } : i
                  )
                }
              />
            </Field>

            <Field label="Diagnostic de sortie">
              <textarea
                className={inputCls}
                rows={3}
                value={item.diagnostic_sortie || ""}
                onChange={(e) =>
                  setItem((i) =>
                    i ? { ...i, diagnostic_sortie: e.target.value } : i
                  )
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Prix">
                <input
                  type="number"
                  step="0.01"
                  className={inputCls}
                  value={String(item.prix ?? "")}
                  onChange={(e) =>
                    setItem((i) => (i ? { ...i, prix: e.target.value } : i))
                  }
                />
              </Field>
              <Field label="Devise">
                <input
                  className={inputCls}
                  value={item.devise || "XAF"}
                  onChange={(e) =>
                    setItem((i) => (i ? { ...i, devise: e.target.value } : i))
                  }
                />
              </Field>
            </div>

            <Field label="Statut">
              <select
                className={inputCls}
                value={item.statut}
                onChange={(e) =>
                  setItem((i) =>
                    i
                      ? { ...i, statut: e.target.value as StatutHosp }
                      : i
                  )
                }
              >
                <option value="en_cours">en_cours</option>
                <option value="transfere">transfere</option>
                <option value="sorti">sorti</option>
                <option value="annule">annule</option>
              </select>
            </Field>

            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {busy ? "Sauvegarde…" : "Enregistrer les modifications"}
              </button>
            </div>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">{label}</label>
      {children}
    </div>
  );
}
