"use client";

import { useEffect, useState } from "react";
import { factureTrashList, factureTrashRestore } from "@/lib/api/factures";
import Link from "next/link";

type TrashFacture = {
  id: string;
  numero: string;
  montant_total?: number;
  devise?: string;
  deleted_at?: string;
  deleted_by_name?: string | null;
  delete_comment?: string | null;
};

export default function FacturesCorbeillePage() {
  const [rows, setRows] = useState<TrashFacture[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r: any = await factureTrashList({ per_page: 50 });
      const data = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
      setRows(data.map((x: any) => ({
        id: String(x.id),
        numero: x.numero ?? "—",
        montant_total: Number(x.montant_total ?? 0),
        devise: x.devise ?? "XAF",
        deleted_at: x.deleted_at ?? null,
        deleted_by_name: x.deleted_by_name ?? x.deleted_by?.name ?? null,
        delete_comment: x.delete_comment ?? x.commentaire ?? null,
      })));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function restore(id: string) {
    try {
      await factureTrashRestore(id);
      await load();
    } catch (e: any) {
      alert(e?.message ?? String(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/caisse/rapport" className="text-sm underline">← Retour</Link>
        <h1 className="text-lg font-semibold">Corbeille — Factures supprimées</h1>
      </div>

      {err && <div className="rounded-lg border bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      <div className="rounded-xl bg-white border shadow-sm overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left">Numéro</th>
              <th className="px-3 py-2 text-right">Montant</th>
              <th className="px-3 py-2 text-left">Supprimée le</th>
              <th className="px-3 py-2 text-left">Supprimée par</th>
              <th className="px-3 py-2 text-left">Commentaire</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Chargement…</td></tr>
            )}

            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Aucune facture supprimée</td></tr>
            )}

            {!loading && rows.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="px-3 py-2">{f.numero}</td>
                <td className="px-3 py-2 text-right">{Number(f.montant_total ?? 0).toLocaleString()} {f.devise ?? "XAF"}</td>
                <td className="px-3 py-2">{f.deleted_at ? new Date(String(f.deleted_at)).toLocaleString() : "—"}</td>
                <td className="px-3 py-2">{f.deleted_by_name ?? "—"}</td>
                <td className="px-3 py-2">{f.delete_comment ?? "—"}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => restore(f.id)}
                    className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    ♻️ Restaurer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
