// app/pharmacie/admin/dcis/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteDci, getDcis, type Dci } from "@/lib/api";

export default function DciListPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Dci[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getDcis({ q });     // ⬅️ maintenant supporté par lib/api
      setRows(res?.data ?? []);
    } catch (error: any) {
      console.error("Erreur lors du chargement des DCI:", error);
      setErrorMsg(error?.message ?? "Erreur lors du chargement des DCI.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Chargement initial
    load();
  }, []);

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">DCI</h1>
        <Link
          href="/pharmacie/admin/dcis/new"
          className="px-3 py-1.5 rounded bg-blue-600 text-white"
        >
          + Nouvelle DCI
        </Link>
      </div>

      <div className="flex gap-2">
        <input
          className="px-3 py-2 rounded border"
          placeholder="Rechercher…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load();
          }}
        />
        <button onClick={load} className="px-3 py-2 rounded border bg-white">
          Rechercher
        </button>
      </div>

      {errorMsg && (
        <div className="text-red-600 text-sm">{errorMsg}</div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Nom</th>
              <th className="text-left p-2">Description</th>
              <th className="text-right p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="p-3">Chargement…</td>
              </tr>
            )}

            {!loading && rows.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-2">{d.id}</td>
                <td className="p-2">{d.name}</td>
                <td className="p-2">{d.description ?? "—"}</td>
                <td className="p-2 text-right space-x-2">
                  <Link
                    href={`/pharmacie/admin/dcis/${d.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Modifier
                  </Link>
                  <button
                    className="text-red-600"
                    onClick={async () => {
                      if (!confirm("Supprimer cette DCI ?")) return;
                      try {
                        await deleteDci(d.id);
                        await load();
                      } catch (e) {
                        alert("Suppression impossible.");
                      }
                    }}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-3">
                  Aucune DCI.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
