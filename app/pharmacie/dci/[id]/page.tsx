"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { listArticlesByDci, type ArticleListItem } from "@/lib/api";
// Si tu as un addCartLine côté API serveur, dé-commente l’import :
// import { addCartLine } from "@/lib/api";

type PageParams = { id: string };

export default function DciArticlesPage() {
  const { id } = useParams() as PageParams;
  const router = useRouter();
  const sp = useSearchParams();

  const page = Number(sp.get("page") ?? 1);
  const q = sp.get("q") ?? "";
  const forme = sp.get("forme") ?? "";
  const per_page = 32;

  const [rows, setRows] = useState<ArticleListItem[]>([]);
  const [meta, setMeta] = useState<{current_page:number; last_page:number} | null>(null);
  const [loading, setLoading] = useState(false);

  const setParam = (key: string, value?: string) => {
    const url = new URL(window.location.href);
    if (value && value.length) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    url.searchParams.set("page", "1");
    router.push(url.pathname + "?" + url.searchParams.toString());
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await listArticlesByDci({ dci_id: id, page, per_page, q, form: forme });
      // fallback image locale pour l’esthétique
      const mapped = res.data.map(p => ({
        ...p,
        image_url: p.image_url ?? "/pharma-placeholder.png",
      }));
      setRows(mapped);
      const m = res.meta;
      setMeta(m ? { current_page: m.current_page, last_page: m.last_page } : { current_page: page, last_page: res.total_pages ?? 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, page, q, forme]);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li><Link href="/portail" className="hover:underline">Portail</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/pharmacie" className="hover:underline">Pharmacie</Link></li>
            <li aria-hidden>/</li>
            <li className="font-medium text-ink-800">DCI #{id}</li>
          </ol>
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          defaultValue={q}
          placeholder="Rechercher un produit…"
          className="px-3 py-2 rounded border bg-white/80 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value.trim());
          }}
        />
        <select
          value={forme}
          onChange={(e) => setParam("forme", e.target.value || undefined)}
          className="px-3 py-2 rounded border bg-white/80 text-sm"
        >
          <option value="">Toutes les formes</option>
          <option value="comprimé">Comprimé</option>
          <option value="gélule">Gélule</option>
          <option value="sirop">Sirop</option>
          <option value="injectable">Injectable</option>
          <option value="pommade">Pommade</option>
        </select>
      </div>

      <section className="rounded-2xl bg-white ring-1 ring-ink-100 shadow-sm p-3 sm:p-4">
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {Array.from({length:16}).map((_,i)=><div key={i} className="h-[150px] rounded bg-white/60 animate-pulse" />)}
          </div>
        )}

        {!loading && rows.length===0 && (
          <div className="text-sm text-ink-600">Aucun article pour cette DCI.</div>
        )}

        {!loading && rows.length>0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {rows.map((p)=>(
              <article key={p.id} className="flex flex-col items-center">
                <div className="h-[120px] w-full flex items-end justify-center">
                  {/* <img> plutôt que <Image> pour éviter la config remote pendant le dev */}
                  <img
                    src={p.image_url || "/pharma-placeholder.png"}
                    alt={p.name}
                    className="max-h-[120px] w-auto object-contain drop-shadow"
                    onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = "/pharma-placeholder.png"; }}
                  />
                </div>
                <h4 className="mt-2 text-[11px] sm:text-xs text-ink-700 text-center line-clamp-2">{p.name}</h4>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full border">
                    {(p.stock_on_hand ?? 0) <= 0 ? "Rupture" : (p.stock_on_hand ?? 0) < 5 ? "Faible" : "En stock"}
                  </span>
                  {/* Si tu as l’API panier : 
                  <button
                    className="text-xs text-congo-green hover:underline disabled:opacity-40"
                    disabled={(p.stock_on_hand ?? 0) <= 0}
                    onClick={async ()=>{ await addCartLine({ cart_id: "current", article_id: p.id, qty: 1 }); }}
                  >
                    + Ajouter
                  </button>
                  */}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {meta && meta.last_page > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            className="px-3 py-1 rounded border bg-white disabled:opacity-40"
            disabled={page<=1}
            onClick={()=>{
              const qs = new URLSearchParams({ page: String(page-1) });
              if (q) qs.set("q", q);
              if (forme) qs.set("forme", forme);
              router.push(`/pharmacie/dci/${id}?${qs.toString()}`);
            }}
          >Précédent</button>
          <span className="text-sm">Page {meta.current_page} / {meta.last_page}</span>
          <button
            className="px-3 py-1 rounded border bg-white disabled:opacity-40"
            disabled={meta.current_page>=meta.last_page}
            onClick={()=>{
              const qs = new URLSearchParams({ page: String(page+1) });
              if (q) qs.set("q", q);
              if (forme) qs.set("forme", forme);
              router.push(`/pharmacie/dci/${id}?${qs.toString()}`);
            }}
          >Suivant</button>
        </div>
      )}

      <div className="flex justify-center">
        <Link href="/pharmacie" className="text-sm text-congo-green hover:underline">← Retour DCI</Link>
      </div>
    </>
  );
}
