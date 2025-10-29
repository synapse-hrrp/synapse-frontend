// app/pharmacie/admin/articles/[id]/lots/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getArticle, listLots } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ArticleLotsPage() {
  const { id } = useParams() as { id: string };
  const [article, setArticle] = useState<any>(null);
  const [lots, setLots] = useState<any[]>([]);

  useEffect(()=>{ (async()=>{
    const a = await getArticle(id);
    setArticle(a);
    const l = await listLots(Number(id));
    setLots(l?.lots ?? []);
  })(); },[id]);

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Lots – Article #{id}</h1>
        <Link href="/pharmacie/admin/articles" className="text-congo-green underline">← Retour</Link>
      </div>

      {article && (
        <div className="rounded-lg border bg-white p-4 text-sm">
          <div><b>{article.name}</b> <span className="text-gray-600">({article.code})</span></div>
          <div>Stock : <b>{article.stock_on_hand ?? 0}</b></div>
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Lot</th>
              <th className="text-left p-2">Expiration</th>
              <th className="text-right p-2">Quantité</th>
              <th className="text-right p-2">Prix vente</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l:any)=>(
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.lot_number}</td>
                <td className="p-2">{l.expires_at ?? "—"}</td>
                <td className="p-2 text-right">{l.quantity}</td>
                <td className="p-2 text-right">{l.sell_price}</td>
              </tr>
            ))}
            {lots.length===0 && <tr><td colSpan={4} className="p-3">Aucun lot.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
