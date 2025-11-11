"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type LocationDTO = {
  id: number;
  name: string;
  path?: string | null;
  is_cold_chain: boolean;
  temp_range_min: number | null;
  temp_range_max: number | null;
};

export default function LocationEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id as string);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: "",
    path: "",
    is_cold_chain: false,
    temp_range_min: "",
    temp_range_max: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const r: any = await apiFetch(`/inventory/locations/${id}`, { method: "GET" });
        const d: LocationDTO = Array.isArray(r) ? r[0] : r;
        setF({
          name: d?.name ?? "",
          path: d?.path ?? "",
          is_cold_chain: !!d?.is_cold_chain,
          temp_range_min: d?.temp_range_min != null ? String(d.temp_range_min) : "",
          temp_range_max: d?.temp_range_max != null ? String(d.temp_range_max) : "",
        });
      } catch (e: any) {
        alert("Chargement impossible : " + (e?.message || "inconnue"));
      }
    })();
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch(`/inventory/locations/${id}`, {
        method: "PATCH",
        body: {
          name: f.name.trim(),
          path: f.path || null,
          is_cold_chain: !!f.is_cold_chain,
          temp_range_min: f.temp_range_min === "" ? null : Number(f.temp_range_min),
          temp_range_max: f.temp_range_max === "" ? null : Number(f.temp_range_max),
        },
      });
      router.push("/stock-reactifs/locations");
    } catch (e: any) {
      alert(e?.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <form onSubmit={submit} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <h1 className="text-lg font-semibold">Modifier location</h1>
        <Field label="Nom *">
          <input
            required
            value={f.name}
            onChange={(e) => setF((v) => ({ ...v, name: e.target.value }))}
            className="input"
          />
        </Field>
        <Field label="Chemin">
          <input value={f.path} onChange={(e) => setF((v) => ({ ...v, path: e.target.value }))} className="input" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={f.is_cold_chain}
            onChange={(e) => setF((v) => ({ ...v, is_cold_chain: e.target.checked }))}
          />{" "}
          Chaîne du froid
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Temp. min">
            <input
              type="number"
              value={f.temp_range_min}
              onChange={(e) => setF((v) => ({ ...v, temp_range_min: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="Temp. max">
            <input
              type="number"
              value={f.temp_range_max}
              onChange={(e) => setF((v) => ({ ...v, temp_range_max: e.target.value }))}
              className="input"
            />
          </Field>
        </div>
        <div className="flex gap-2">
          <button
            disabled={busy}
            className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Enregistrer
          </button>
          <button type="button" onClick={() => history.back()} className="rounded-lg border px-3 py-2 text-sm">
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
