"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";

type LocationRow = {
  id: number;
  name: string;
  path?: string | null;
  is_cold_chain: boolean;
  temp_range_min: number | null;
  temp_range_max: number | null;
};

export default function LocationsListPage() {
  return <Inner />;
}

function Inner() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      const res: any = await apiFetch(`/inventory/locations?${qs.toString()}`, { method: "GET" });
      const data: LocationRow[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setRows(data);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  async function onDelete(id: number) {
    if (!confirm("Supprimer cette location ?")) return;
    setBusy(true);
    try {
      await apiFetch(`/inventory/locations/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      alert(e?.message || "Suppression impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>Portail</li>
            <li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Locations</li>
          </ol>
        </nav>
        <Link
          href="/stock-reactifs/locations/new"
          className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> Nouvelle
        </Link>
      </div>

      <form onSubmit={onSearch} className="rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom ou chemin…"
              className="w-full rounded-lg border border-ink-100 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
            />
          </div>
          <button className="rounded-lg border px-3 py-2.5 text-sm">Rechercher</button>
        </div>
      </form>

      <div className="overflow-auto rounded-xl border border-ink-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-700">
            <tr>
              <Th>Nom</Th>
              <Th>Chemin</Th>
              <Th>Chaîne du froid</Th>
              <Th>Temp. min</Th>
              <Th>Temp. max</Th>
              <Th className="text-right pr-3">Actions</Th>
            </tr>
          </thead>
        </table>
        <table className="w-full text-sm">
          <tbody>
            {rows.length === 0 && !busy && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-ink-500">
                  Aucune location
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <Td className="font-medium">{r.name}</Td>
                <Td>{r.path || "—"}</Td>
                <Td>{r.is_cold_chain ? "Oui" : "Non"}</Td>
                <Td>{r.temp_range_min ?? "—"}</Td>
                <Td>{r.temp_range_max ?? "—"}</Td>
                <Td className="text-right pr-3">
                  <div className="inline-flex items-center gap-1">
                    <Link
                      href={`/stock-reactifs/locations/${r.id}/edit`}
                      className="icon-btn"
                      aria-label="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="icon-btn text-congo-red"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
