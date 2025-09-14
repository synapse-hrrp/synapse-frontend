"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getPansement, updatePansement, PansementDTO, getToken, me } from "@/lib/api";

const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

export default function EditPansementPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/pansements/${params.id}/edit`); return; }
    me().catch(() => window.location.replace(`/login?next=/pansements/${params.id}/edit`));
  }, [params.id]);

  const [item, setItem] = useState<PansementDTO | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try { setItem(await getPansement(params.id)); } catch {}
    })();
  }, [params.id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setBusy(true);
    try {
      const payload = {
        type: item.type || null,
        observation: item.observation || null,
        etat_plaque: item.etat_plaque || null,
        produits_utilises: item.produits_utilises || null,
        status: item.status || "en_cours",
        date_soin: item.date_soin || null,
      };
      await updatePansement(params.id, payload);
      router.replace("/pansements?flash=updated");
    } catch (e: any) {
      alert("Erreur: " + (e?.message || "inconnue"));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Modifier pansement" subtitle={`ID: ${params.id}`} logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-4xl px-4 py-8">
        {!item ? <p>Chargement…</p> : (
          <form onSubmit={onSubmit} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-4">
            <Field label="Type de pansement">
              <input className={inputCls} value={item.type || ""} onChange={e=>setItem(i=>i ? {...i, type: e.target.value} : i)} />
            </Field>
            <Field label="Statut">
              <select
                className={inputCls}
                value={item.status || "en_cours"}
                onChange={e=>setItem(i=>i ? {...i, status: e.target.value as any} : i)}
              >
                <option value="planifie">Planifié</option>
                <option value="en_cours">En cours</option>
                <option value="clos">Clos</option>
                <option value="annule">Annulé</option>
              </select>
 
            </Field>
            <Field label="État de la plaie">
              <input className={inputCls} value={item.etat_plaque || ""} onChange={e=>setItem(i=>i ? {...i, etat_plaque: e.target.value} : i)} />
            </Field>
            <Field label="Produits utilisés">
              <input className={inputCls} value={item.produits_utilises || ""} onChange={e=>setItem(i=>i ? {...i, produits_utilises: e.target.value} : i)} />
            </Field>
            <Field label="Observation">
              <textarea className={inputCls} rows={4} value={item.observation || ""} onChange={e=>setItem(i=>i ? {...i, observation: e.target.value} : i)} />
            </Field>
            <Field label="Date/heure du soin">
              <input
                type="datetime-local"
                className={inputCls}
                value={item.date_soin ? new Date(item.date_soin).toISOString().slice(0,16) : ""}
                onChange={e=>setItem(i=>i ? {...i, date_soin: e.target.value ? new Date(e.target.value).toISOString() : null} : i)}
              />
            </Field>

            <div className="pt-2">
              <button type="submit" disabled={busy} className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
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

function Field({ label, children }: { label: string; children: React.ReactNode; }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">{label}</label>
      {children}
    </div>
  );
}
