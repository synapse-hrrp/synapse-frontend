// components/pharmacie/PlacardDCI.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listArticlesByDci } from "@/lib/api";
import { useCart } from "@/components/cart/CartProvider"; // ⬅️ AJOUT

type DciOption = { id: number; name: string };
type Props = { dci: DciOption; compact?: boolean };

export default function PlacardDCI({ dci, compact = false }: Props) {
  const { add } = useCart(); // ⬅️ AJOUT
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const perPage = compact ? 8 : 16; // 2 ou 4 lignes initiales (4 colonnes/ligne)
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(() => dci.name?.toUpperCase?.() || dci.name, [dci.name]);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await listArticlesByDci({ dci_id: dci.id, page: p, per_page: perPage });
      const data = Array.isArray(res?.data) ? res.data : [];
      if (p === 1) setRows(data);
      else setRows((old) => [...old, ...data]);

      const lastPage = Number(res?.total_pages ?? 1);
      setHasMore(p < lastPage);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    const onFocus = () => load(1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dci.id]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loading) {
          load(page + 1);
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, page, sentinelRef.current]);

  // lignes de 4
  const lines = chunk(rows, 4);

  return (
    <section
      aria-label={`Produits ${title}`}
      className={`rounded-2xl bg-white ring-1 ring-ink-100 shadow-sm ${compact ? "p-3" : "p-4"}`}
    >
      {/* Panneau suspendu */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          <span aria-hidden className="absolute -top-5 left-1/4 h-5 w-[2px] bg-ink-300 rounded" />
          <span aria-hidden className="absolute -top-5 right-1/4 h-5 w-[2px] bg-ink-300 rounded" />
          <div className="rounded-xl border bg-white px-3 py-1.5 text-center text-xs font-semibold uppercase shadow">
            {title}
          </div>
        </div>
      </div>

      {/* Rail par ligne + grille */}
      <div className="space-y-6">
        {lines.map((line, idx) => (
          <div key={idx} className="relative">
            {/* rail bleu */}
            <div className="relative">
              <div
                aria-hidden
                className="absolute -top-2 left-0 right-0 h-2 rounded-t-md"
                style={{ background: "linear-gradient(90deg,#1e3a8a,#1d4ed8)" }}
              />
              <div
                aria-hidden
                className="absolute -top-2 left-1 right-1 h-1.5 translate-y-2 rounded-b-md"
                style={{ background: "linear-gradient(#a3aab7,#6b7280)" }}
              />
            </div>

            {/* Grille 4 colonnes */}
            <div className="relative z-10 grid grid-cols-4 gap-3 pt-3">
              {line.map((p) => (
                <article key={p.id} className="flex flex-col items-center">
                  {/* Nom hauteur fixe */}
                  <h4 className="h-10 mb-1 text-[11px] sm:text-xs text-ink-700 text-center line-clamp-2 flex items-center justify-center">
                    {p.name}
                  </h4>

                  {/* Cadre image + bouton “+” overlay */}
                  <div className="w-full relative">
                    <div className={`${compact ? "h-[90px]" : "h-[120px]"} w-full flex items-center justify-center rounded-md border bg-white`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={String(p.image_url || p.img || "/pharma-placeholder.png")}
                        alt={p.name}
                        className={`w-[90%] h-[90%] object-contain ${compact ? "max-h-[90px]" : "max-h-[120px]"}`}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/pharma-placeholder.png")}
                      />
                    </div>

                    {/* Bouton Ajouter (overlay en haut à droite) */}
                    <button
                      onClick={() => add(Number(p.id), 1)}
                      className="absolute -top-2 -right-2 rounded-full bg-blue-600 text-white w-7 h-7 text-sm shadow hover:scale-105 transition"
                      aria-label={`Ajouter ${p.name} au panier`}
                      title="Ajouter au panier"
                    >
                      +
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}

        {/* Loader + sentinel */}
        {(loading || hasMore) && (
          <div className="flex flex-col items-center justify-center py-2">
            {loading && <div className="text-[11px] text-ink-500">Chargement…</div>}
            <div ref={sentinelRef} className="h-1 w-full" />
          </div>
        )}
      </div>
    </section>
  );
}

/* Utilitaire */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
