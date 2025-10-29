// app/pharmacie/admin/articles/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteArticle, listArticles } from "@/lib/api";

/**
 * Placeholder intégré (pas de 404 possible).
 * Carré gris clair avec un petit pictogramme – tu peux le remplacer par ce que tu veux.
 */
const LOCAL_PLACEHOLDER_DATA =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>
      <rect width='100%' height='100%' fill='#f3f4f6'/>
      <g fill='#9ca3af'>
        <circle cx='32' cy='36' r='10'/>
        <rect x='22' y='50' width='20' height='10' rx='2' ry='2'/>
        <rect x='50' y='26' width='24' height='34' rx='4' ry='4'/>
        <rect x='54' y='30' width='16' height='6' rx='2' ry='2'/>
        <rect x='54' y='38' width='16' height='6' rx='2' ry='2'/>
        <rect x='54' y='46' width='16' height='6' rx='2' ry='2'/>
      </g>
    </svg>`
  );

// Utilitaire: choisit la meilleure source d’image
function getImgSrc(row: any): string {
  // L’API doit renvoyer `image_url` ABSOLUE (ex: http://127.0.0.1:8000/storage/...)
  // grâce à getImageUrlAttribute() corrigé côté Laravel.
  if (row?.image_url && typeof row.image_url === "string" && row.image_url.length > 0) {
    return row.image_url;
  }
  return LOCAL_PLACEHOLDER_DATA;
}

export default function ArticleListPage() {
  const [q, setQ] = useState("");
  const [form, setForm] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = await listArticles({ q, form, per_page: 50 });
      // Rien à mapper: on garde `image_url` tel que renvoyé par l’API
      setRows(Array.isArray(p?.data) ? p.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Articles</h1>
        <Link href="/pharmacie/admin/articles/new" className="px-3 py-1.5 rounded bg-blue-600 text-white">
          + Nouvel article
        </Link>
      </div>

      <div className="flex gap-2">
        <input
          className="px-3 py-2 rounded border"
          placeholder="Recherche…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="px-3 py-2 rounded border"
          placeholder="Forme (comprimé, sirop…)"
          value={form}
          onChange={(e) => setForm(e.target.value)}
        />
        <button onClick={load} className="px-3 py-2 rounded border bg-white">
          Filtrer
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2">Image</th>
              <th className="text-left p-2">Nom</th>
              <th className="text-left p-2">Code</th>
              <th className="text-left p-2">Forme</th>
              <th className="text-left p-2">DCI</th>
              <th className="text-right p-2">Stock</th>
              <th className="text-right p-2">Prix</th>
              <th className="text-right p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-3">
                  Chargement…
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((a) => {
                const src = getImgSrc(a);
                return (
                  <tr key={a.id} className="border-t">
                    <td className="p-2">
                      <div className="w-12 h-12 border rounded bg-white flex items-center justify-center overflow-hidden">
                        <img
                          src={src}
                          alt=""
                          width={48}
                          height={48}
                          decoding="async"
                          loading="lazy"
                          title={a.image_url || "aucune url (placeholder)"}
                          className="w-12 h-12 object-contain"
                          onError={(e) => {
                            // En cas d’échec, on force le placeholder embarqué (jamais 404)
                            (e.currentTarget as HTMLImageElement).src = LOCAL_PLACEHOLDER_DATA;
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-2">{a.name}</td>
                    <td className="p-2">{a.code}</td>
                    <td className="p-2">{a.form ?? "—"}</td>
                    <td className="p-2">{a.dci?.name ?? "—"}</td>
                    <td className="p-2 text-right">{a.stock_on_hand ?? 0}</td>
                    <td className="p-2 text-right">{a.sell_price ?? "—"}</td>
                    <td className="p-2 text-right space-x-2">
                      <Link href={`/pharmacie/admin/articles/${a.id}/edit`} className="text-blue-600 hover:underline">
                        Modifier
                      </Link>
                      <Link href={`/pharmacie/admin/articles/${a.id}/lots`} className="text-ink-700 hover:underline">
                        Lots
                      </Link>
                      <button
                        onClick={async () => {
                          if (!confirm("Supprimer l’article ?")) return;
                          await deleteArticle(a.id);
                          load();
                        }}
                        className="text-red-600"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-3">
                  Aucun article.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
