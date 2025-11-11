"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Search, Plus, ShieldAlert, Trash2 } from "lucide-react";

type ReagentMini = { id: number; name: string; sku: string };
type LotRow = {
  id: number;
  lot_code: string;
  expiry_date?: string | null;
  received_at?: string | null;
  initial_qty: number;
  current_qty: number;
  status: string;
  location?: { id: number; name: string } | null;
};

export default function LotsPage() {
  return <Inner />;
}

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [rQuery, setRQuery] = useState("");
  const [reagents, setReagents] = useState<ReagentMini[]>([]);
  const [reagent, setReagent] = useState<ReagentMini | null>(null);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | undefined>(undefined);

  // 1) Si on arrive avec ?reagent=ID => auto-choix + load lots
  useEffect(() => {
    const rid = Number(sp?.get("reagent") || 0);
    const f = sp?.get("flash") || undefined;
    if (f) setFlash(f);

    (async () => {
      try {
        if (rid > 0) {
          // on charge le réactif pour l’en-tête
          const r: any = await apiFetch(`/inventory/reagents/${rid}`, { method: "GET" });
          const rmin: ReagentMini = { id: Number(r.id), name: String(r.name), sku: String(r.sku) };
          await chooseReagent(rmin); // charge lots + met reagent
        }
      } catch (e: any) {
        // si 403/401 -> abilities manquantes
        setErr(e?.message || "Erreur de chargement du réactif sélectionné");
      }
    })();

    // Nettoie l’URL (retire flash) une fois affiché
    if (f) router.replace(`/stock-reactifs/lots?reagent=${rid}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Petit toast flash
  useEffect(() => {
    if (!flash) return;
    const tid = setTimeout(() => setFlash(undefined), 2500);
    return () => clearTimeout(tid);
  }, [flash]);

  async function searchReagents() {
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (rQuery.trim()) qs.set("search", rQuery.trim());
      const res: any = await apiFetch(`/inventory/reagents?${qs.toString()}`, { method: "GET" });
      const data: ReagentMini[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setReagents(data);
    } catch (e: any) {
      setErr(e?.message || "Recherche impossible");
    }
  }

  async function chooseReagent(r: ReagentMini) {
    setReagent(r);
    setBusy(true);
    setErr(null);
    try {
      // charge les lots du réactif
      const res: any = await apiFetch(`/inventory/reagents/${r.id}/lots`, { method: "GET" });
      const data: LotRow[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setLots(data);
      router.replace(`/stock-reactifs/lots?reagent=${r.id}`, { scroll: false });
    } catch (e: any) {
      setLots([]);
      setErr(
        e?.status === 403
          ? "Accès refusé (ability: inventory.view requise)"
          : e?.message || "Erreur de chargement des lots"
      );
    } finally {
      setBusy(false);
    }
  }

  async function quarantine(lotId: number) {
    if (!confirm("Mettre ce lot en quarantaine ?")) return;
    setBusy(true);
    try {
      await apiFetch(`/inventory/reagent-lots/${lotId}/quarantine`, { method: "POST" });
      if (reagent) await chooseReagent(reagent);
    } catch (e: any) {
      alert(e?.message || "Échec de l’opération");
    } finally {
      setBusy(false);
    }
  }

  async function dispose(lotId: number) {
    if (!confirm("Éliminer ce lot (DISPOSAL) ?")) return;
    setBusy(true);
    try {
      await apiFetch(`/inventory/reagent-lots/${lotId}/dispose`, { method: "POST" });
      if (reagent) await chooseReagent(reagent);
    } catch (e: any) {
      alert(e?.message || "Échec de l’opération");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6">
      {flash === "created" && (
        <div className="rounded-lg border border-congo-green/30 bg-congo-greenL px-3 py-2 text-congo-green text-sm">
          Lot créé avec succès.
        </div>
      )}

      {err && (
        <div className="rounded-lg border border-congo-red/30 bg-red-50 px-3 py-2 text-red-700 text-sm">{err}</div>
      )}

      {/* 1) Choisir réactif */}
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              value={rQuery}
              onChange={(e) => setRQuery(e.target.value)}
              placeholder="Nom ou SKU…"
              className="w-full rounded-lg border border-ink-100 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
            />
          </div>
          <button onClick={searchReagents} className="rounded-lg border px-3 py-2.5 text-sm">
            Rechercher
          </button>
        </div>

        {reagents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {reagents.map((r) => (
              <button
                key={r.id}
                onClick={() => chooseReagent(r)}
                className={`rounded-lg border px-3 py-2 text-left ${
                  reagent?.id === r.id ? "border-congo-green ring-1 ring-congo-green/30" : ""
                }`}
              >
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-ink-600">SKU {r.sku}</div>
              </button>
            ))}
          </div>
        )}

        {!reagent && (
          <p className="text-xs text-ink-600">
            Astuce : après avoir créé un lot, tu es redirigé ici avec le réactif auto-sélectionné.
          </p>
        )}

        {reagent && (
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Réactif : <b>{reagent.name}</b>
            </p>
            <Link
              href={`/stock-reactifs/lots/new?reagent=${reagent.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <Plus className="h-4 w-4" /> Nouveau lot
            </Link>
          </div>
        )}
      </section>

      {/* 2) Liste des lots */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-700">
              <tr>
                <Th>Lot</Th>
                <Th>Reçu le</Th>
                <Th>Péremption</Th>
                <Th>Qté initiale</Th>
                <Th>Qté actuelle</Th>
                <Th>Location</Th>
                <Th>Statut</Th>
                <Th className="text-right pr-3">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(!reagent || lots.length === 0) && !busy && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-ink-500">
                    {reagent ? "Aucun lot" : "Choisis un réactif pour voir ses lots"}
                  </td>
                </tr>
              )}
              {lots.map((l) => (
                <tr key={l.id} className="border-t">
                  <Td className="font-mono">{l.lot_code}</Td>
                  <Td>{l.received_at ? new Date(l.received_at).toLocaleDateString() : "—"}</Td>
                  <Td>{l.expiry_date ? new Date(l.expiry_date).toLocaleDateString() : "—"}</Td>
                  <Td>{l.initial_qty}</Td>
                  <Td>{l.current_qty}</Td>
                  <Td>{l.location?.name ?? "—"}</Td>
                  <Td>{l.status}</Td>
                  <Td className="text-right pr-3">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => quarantine(l.id)} className="icon-btn" title="Quarantaine">
                        <ShieldAlert className="h-4 w-4" />
                      </button>
                      <button onClick={() => dispose(l.id)} className="icon-btn text-congo-red" title="Éliminer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx global>{`
        .icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 8px;
          color: #111827;
        }
        .icon-btn:hover {
          background: #f3f4f6;
        }
      `}</style>
    </main>
  );
}

function Th({ children, className = "" }: any) {
  return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: any) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
