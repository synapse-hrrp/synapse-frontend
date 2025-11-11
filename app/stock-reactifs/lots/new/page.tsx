"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type ReagentMini = { id: number; name: string; sku: string };
type LocationMini = { id: number; name: string };

export default function LotNewPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [reagents, setReagents] = useState<ReagentMini[]>([]);
  const [locations, setLocations] = useState<LocationMini[]>([]);
  const [reagentId, setReagentId] = useState<number>(Number(sp?.get("reagent") || 0));

  const [f, setF] = useState({
    lot_code: "",
    received_at: "",
    expiry_date: "",
    quantity: "",
    location_id: 0,
    unit_cost: "",
    coa_url: "",
    reference: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const rr: any = await apiFetch(`/inventory/reagents`, { method: "GET" });
        setReagents(Array.isArray(rr?.data) ? rr.data : Array.isArray(rr) ? rr : []);
        const ll: any = await apiFetch(`/inventory/locations`, { method: "GET" });
        setLocations(Array.isArray(ll?.data) ? ll.data : Array.isArray(ll) ? ll : []);
      } catch {}
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reagentId) {
      alert("Sélectionne un réactif.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/inventory/reagents/${reagentId}/lots`, {
        method: "POST",
        body: {
          lot_code: f.lot_code.trim(),
          received_at: f.received_at || null,
          expiry_date: f.expiry_date || null,
          quantity: Number(f.quantity),
          location_id: f.location_id || null,
          unit_cost: f.unit_cost === "" ? null : Number(f.unit_cost),
          coa_url: f.coa_url || null,
          reference: f.reference || null,
        },
      });
      router.push(`/stock-reactifs/lots?reagent=${reagentId}&flash=created`);
    } catch (e: any) {
      alert(e?.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <form onSubmit={submit} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <h1 className="text-lg font-semibold">Nouveau lot</h1>
        <p className="text-sm text-ink-600">
          La création du lot génère automatiquement un mouvement <b>IN</b>.
        </p>

        <Field label="Réactif *">
          <select required value={reagentId} onChange={(e) => setReagentId(Number(e.target.value))} className="input">
            <option value={0}>— choisir —</option>
            {reagents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (SKU {r.sku})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Code lot *">
          <input
            required
            value={f.lot_code}
            onChange={(e) => setF((v) => ({ ...v, lot_code: e.target.value }))}
            className="input font-mono"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Reçu le">
            <input
              type="date"
              value={f.received_at}
              onChange={(e) => setF((v) => ({ ...v, received_at: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="Péremption">
            <input
              type="date"
              value={f.expiry_date}
              onChange={(e) => setF((v) => ({ ...v, expiry_date: e.target.value }))}
              className="input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Quantité *">
            <input
              required
              type="number"
              step="any"
              value={f.quantity}
              onChange={(e) => setF((v) => ({ ...v, quantity: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="Coût unitaire">
            <input
              type="number"
              step="any"
              value={f.unit_cost}
              onChange={(e) => setF((v) => ({ ...v, unit_cost: e.target.value }))}
              className="input"
            />
          </Field>
        </div>

        <Field label="Location">
          <select
            value={f.location_id}
            onChange={(e) => setF((v) => ({ ...v, location_id: Number(e.target.value) }))}
            className="input"
          >
            <option value={0}>—</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="COA URL">
          <input value={f.coa_url} onChange={(e) => setF((v) => ({ ...v, coa_url: e.target.value }))} className="input" />
        </Field>
        <Field label="Référence">
          <input
            value={f.reference}
            onChange={(e) => setF((v) => ({ ...v, reference: e.target.value }))}
            className="input"
          />
        </Field>

        <div className="flex gap-2">
          <button
            disabled={busy}
            className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Enregistrer
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-lg border px-3 py-2 text-sm">
            Annuler
          </button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid #e5e7eb;
            background: #fff;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            outline: none;
          }
          .input:focus {
            border-color: #16a34a;
            box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
          }
        `}</style>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-ink-600">{label}</span>
      {children}
    </label>
  );
}
