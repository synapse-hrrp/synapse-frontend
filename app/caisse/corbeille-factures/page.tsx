"use client";

import { useEffect, useState } from "react";
import { factureTrashList, factureRestore } from "@/lib/api/caisse";

type TrashFacture = {
  id: string | number;
  numero?: string | null;
  deleted_at?: string | null;
  delete_reason?: string | null;
  deleted_by?: number | null;
  deleted_by_user?: any; // selon ton backend
  deletedBy?: { id: number; name?: string | null; email?: string | null } | null;
};

export default function CorbeilleFacturesPage() {
  const [rows, setRows] = useState<TrashFacture[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState<any>(null);

  async function load(p = page) {
    setLoading(true);
    try {
      const r: any = await factureTrashList({ page: p, per_page: 20, search: search || undefined });
      const data = Array.isArray(r?.data) ? r.data : [];
      setRows(data);
      setMeta(r?.meta ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page); /* eslint-disable-next-line */ }, [page]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border shadow-sm p-4 flex flex-wrap items-center gap-2">
        <div className="font-semibold">🗑️ Corbeille — Factures supprimées</div>

        <div className="ml-auto flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Rechercher n° facture"
          />
          <button
            onClick={() => { setPage(1); load(1); }}
            className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold"
          >
            Rechercher
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-xl bg-white border shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Facture</th>
              <th className="px-3 py-2 text-left font-semibold">Supprimée le</th>
              <th className="px-3 py-2 text-left font-semibold">Motif</th>
              <th className="px-3 py-2 text-left font-semibold">Supprimée par</th>
              <th className="px-3 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">Chargement…</td></tr>
            )}

            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">Aucune facture supprimée</td></tr>
            )}

            {!loading && rows.map((f) => (
              <tr key={String(f.id)} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2">{f.numero ?? `#${f.id}`}</td>
                <td className="px-3 py-2">{f.deleted_at ?? "—"}</td>
                <td className="px-3 py-2">{f.delete_reason ?? "—"}</td>
                <td className="px-3 py-2">
                  {f.deletedBy?.name ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50"
                    onClick={async () => {
                      if (!confirm("Restaurer cette facture ?")) return;
                      await factureRestore(String(f.id));
                      await load(page);
                    }}
                  >
                    ♻️ Restaurer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta?.pagination && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-600">
            Page {meta.pagination.current_page} / {meta.pagination.last_page} • Total {meta.pagination.total}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPage(1)} disabled={page === 1} className="rounded-md border px-2 py-1 disabled:opacity-40">«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border px-2 py-1 disabled:opacity-40">‹</button>
            <button onClick={() => setPage((p) => Math.min(meta.pagination.last_page, p + 1))} disabled={page === meta.pagination.last_page} className="rounded-md border px-2 py-1 disabled:opacity-40">›</button>
            <button onClick={() => setPage(meta.pagination.last_page)} disabled={page === meta.pagination.last_page} className="rounded-md border px-2 py-1 disabled:opacity-40">»</button>
          </div>
        </div>
      )}
    </div>
  );
}
