"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getToken, me, createHospitalisation } from "@/lib/api";

const inputCls =
  "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

// union stricte pour le statut
type StatutHosp = "en_cours" | "transfere" | "sorti" | "annule";

type Payload = {
  patient_id: string;
  service_slug?: string | null;
  admission_no?: string | null;
  unite?: string | null;
  chambre?: string | null;
  lit?: string | null;
  medecin_traitant_id?: number | null; // ← attendu par l’API après conversion
  motif_admission?: string | null;
  diagnostic_entree?: string | null;
  diagnostic_sortie?: string | null;
  date_admission?: string | null;       // ISO
  date_sortie_prevue?: string | null;   // ISO
  date_sortie_reelle?: string | null;   // ISO
  statut?: StatutHosp;
  prix?: number | null;
  devise?: string | null;
};

// état de formulaire (avant conversion)
type FormState = {
  patient_id: string;
  service_slug: string | null;
  admission_no: string | null;
  unite: string | null;
  chambre: string | null;
  lit: string | null;
  medecin_traitant_id: string; // ← input texte
  motif_admission: string | null;
  diagnostic_entree: string | null;
  diagnostic_sortie: string | null;
  date_admission: string | null;      // ISO
  date_sortie_prevue: string | null;  // ISO
  date_sortie_reelle: string | null;  // ISO
  statut: StatutHosp;
  prix: string; // ← input texte
  devise: string | null;
};

export default function NewHospitalisationPage() {
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.replace(`/login?next=/gestion-malade/hospitalisations/new`);
      return;
    }
    me().catch(() =>
      window.location.replace(`/login?next=/gestion-malade/hospitalisations/new`)
    );
  }, []);

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>({
    patient_id: "",
    service_slug: "",
    admission_no: "",
    unite: "",
    chambre: "",
    lit: "",
    medecin_traitant_id: "", // string depuis l’input
    motif_admission: "",
    diagnostic_entree: "",
    diagnostic_sortie: "",
    date_admission: null,
    date_sortie_prevue: null,
    date_sortie_reelle: null,
    statut: "en_cours",
    prix: "",
    devise: "XAF",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // conversions sûres
      const medStr = form.medecin_traitant_id?.trim() ?? "";
      const medNum = medStr === "" ? null : Number(medStr);
      const medecin_traitant_id = Number.isNaN(medNum) ? null : medNum;

      const prixNum =
        form.prix.trim() === "" ? null : Number(form.prix.replace(",", "."));
      const prix = Number.isNaN(prixNum) ? null : prixNum;

      const payload: Payload = {
        patient_id: form.patient_id.trim(),
        service_slug: form.service_slug?.trim() || null,
        admission_no: form.admission_no?.trim() || null,
        unite: form.unite?.trim() || null,
        chambre: form.chambre?.trim() || null,
        lit: form.lit?.trim() || null,
        medecin_traitant_id,
        motif_admission: form.motif_admission?.trim() || null,
        diagnostic_entree: form.diagnostic_entree?.trim() || null,
        diagnostic_sortie: form.diagnostic_sortie?.trim() || null,
        date_admission: form.date_admission || null,
        date_sortie_prevue: form.date_sortie_prevue || null,
        date_sortie_reelle: form.date_sortie_reelle || null,
        statut: form.statut || "en_cours",
        prix,
        devise: (form.devise || "XAF") as string,
      };

      if (!payload.patient_id) {
        throw new Error("Le champ Patient ID est requis.");
      }

      await createHospitalisation(payload);
      router.replace("/gestion-malade/hospitalisations?flash=created");
    } catch (e: any) {
      alert("Erreur: " + (e?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Nouvelle hospitalisation"
        subtitle="Créer une admission / séjour"
      />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Gestion — Malade</li>
            <li aria-hidden>/</li>
            <li>Hospitalisations</li>
            <li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Nouveau</li>
          </ol>
        </nav>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-4"
        >
          <Field label="Patient ID">
            <input
              className={inputCls}
              value={form.patient_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, patient_id: e.target.value }))
              }
              required
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Service">
              <input
                className={inputCls}
                value={form.service_slug || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, service_slug: e.target.value }))
                }
              />
            </Field>
            <Field label="Admission #">
              <input
                className={inputCls}
                value={form.admission_no || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, admission_no: e.target.value }))
                }
              />
            </Field>
            <Field label="Médecin traitant ID">
              <input
                className={inputCls}
                value={form.medecin_traitant_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    medecin_traitant_id: e.target.value,
                  }))
                }
                inputMode="numeric"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Unité">
              <input
                className={inputCls}
                value={form.unite || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unite: e.target.value }))
                }
              />
            </Field>
            <Field label="Chambre">
              <input
                className={inputCls}
                value={form.chambre || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, chambre: e.target.value }))
                }
              />
            </Field>
            <Field label="Lit">
              <input
                className={inputCls}
                value={form.lit || ""}
                onChange={(e) => setForm((f) => ({ ...f, lit: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Date admission">
              <input
                type="datetime-local"
                className={inputCls}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    date_admission: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  }))
                }
              />
            </Field>
            <Field label="Sortie prévue">
              <input
                type="datetime-local"
                className={inputCls}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    date_sortie_prevue: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  }))
                }
              />
            </Field>
            <Field label="Sortie réelle">
              <input
                type="datetime-local"
                className={inputCls}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    date_sortie_reelle: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  }))
                }
              />
            </Field>
          </div>

          <Field label="Motif d’admission">
            <input
              className={inputCls}
              value={form.motif_admission || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, motif_admission: e.target.value }))
              }
            />
          </Field>

          <Field label="Diagnostic d'entrée">
            <textarea
              className={inputCls}
              rows={3}
              value={form.diagnostic_entree || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, diagnostic_entree: e.target.value }))
              }
            />
          </Field>

          <Field label="Diagnostic de sortie">
            <textarea
              className={inputCls}
              rows={3}
              value={form.diagnostic_sortie || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, diagnostic_sortie: e.target.value }))
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix">
              <input
                type="number"
                step="0.01"
                className={inputCls}
                value={form.prix}
                onChange={(e) =>
                  setForm((f) => ({ ...f, prix: e.target.value }))
                }
              />
            </Field>
            <Field label="Devise">
              <input
                className={inputCls}
                value={form.devise || "XAF"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, devise: e.target.value }))
                }
              />
            </Field>
          </div>

          <Field label="Statut">
            <select
              className={inputCls}
              value={form.statut}
              onChange={(e) =>
                setForm((f) => ({ ...f, statut: e.target.value as StatutHosp }))
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
              {busy ? "Création…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">{label}</label>
      {children}
    </div>
  );
}
