// app/pharmacie/admin/dcis/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteDci, getDcis } from "@/lib/api";

export default function DciListPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDcis({ q }); // ✅ getDcis renvoie un objet avec data, meta, etc.
      setRows(res.data ?? []); // ✅ on récupère uniquement la liste de DCI
    } catch (error) {
      console.error("Erreur lors du chargement des DCI:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
        />
        <button onClick={load} className="px-3 py-2 rounded border bg-white">
          Rechercher
        </button>
      </div>

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
                <td colSpan={4} className="p-3">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((d: any) => (
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
                        await deleteDci(d.id);
                        load();
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
