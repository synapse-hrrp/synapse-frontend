// app/pharmacie/placard/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDciOptions, listArticlesByDci } from "@/lib/api";
import { useCart } from "@/components/cart/CartProvider"; // ⬅️ AJOUT

type DciOption = { id: number; name: string };
type Article = {
  id: number | string;
  name: string;
  image_url?: string | null;
  img?: string | null;
};

export default function PlacardDetailPage() {
  const { add } = useCart(); // ⬅️ AJOUT
  const { id } = useParams() as { id: string };

  const dciId = Number(id);
  const [dciName, setDciName] = useState<string>("");
  const [items, setItems] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(32); // 8 colonnes x 4 lignes/chargement
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(
    () => (dciName ? dciName.toUpperCase() : `DCI #${dciId}`),
    [dciName, dciId]
  );

  // DCI name
  useEffect(() => {
    (async () => {
      try {
        const opts: DciOption[] = await getDciOptions();
        const found = Array.isArray(opts) ? opts.find((o) => Number(o.id) === dciId) : null;
        setDciName(found?.name ?? "");
      } catch {
        setDciName("");
      }
    })();
  }, [dciId]);

  // Articles
  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await listArticlesByDci({ dci_id: dciId, page: p, per_page: perPage });
      const data: Article[] = Array.isArray(res?.data) ? res.data : [];
      if (p === 1) setItems(data);
      else setItems((old) => [...old, ...data]);

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
  }, [dciId]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loading) {
          load(page + 1);
        }
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, page, sentinelRef.current]);

  // Lignes de 8
  const lines = chunk(items, 8);

  // Lightbox helpers
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const showPrev = () => setLightboxIndex((i) => (i - 1 + items.length) % items.length);
  const showNext = () => setLightboxIndex((i) => (i + 1) % items.length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header + retour */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Placard — {title}</h1>
        <Link href="/pharmacie" className="text-congo-green hover:underline">
          ← Retour
        </Link>
      </div>

      {/* Panneau suspendu */}
      <div className="flex justify-center">
        <div className="relative">
          <span aria-hidden className="absolute -top-6 left-1/4 h-6 w-[2px] bg-ink-300 rounded" />
          <span aria-hidden className="absolute -top-6 right-1/4 h-6 w-[2px] bg-ink-300 rounded" />
          <div className="rounded-xl border bg-white px-4 py-2 text-center text-sm font-semibold uppercase shadow">
            {title}
          </div>
        </div>
      </div>

      {/* Container blanc */}
      <section className="rounded-2xl bg-white ring-1 ring-ink-100 shadow-sm p-3 sm:p-4">
        <div className="space-y-6">
          {lines.map((line, idxLine) => {
            const baseIndex = idxLine * 8;
            return (
              <div key={idxLine} className="relative">
                {/* Rail bleu par ligne */}
                <div className="relative">
                  <div
                    aria-hidden
                    className="absolute -top-2 left-0 right-0 h-3 rounded-t-md"
                    style={{ background: "linear-gradient(90deg,#1e3a8a,#1d4ed8)" }}
                  />
                  <div
                    aria-hidden
                    className="absolute -top-2 left-1 right-1 h-2 translate-y-3 rounded-b-md"
                    style={{ background: "linear-gradient(#a3aab7,#6b7280)" }}
                  />
                </div>

                {/* Grille 8 colonnes */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 pt-3">
                  {line.map((p, k) => {
                    const globalIndex = baseIndex + k;
                    const src = String(p.image_url || p.img || "/pharma-placeholder.png");
                    return (
                      <article key={p.id} className="flex flex-col items-center">
                        {/* Titre fixe */}
                        <h4 className="h-10 mb-1 text-[11px] sm:text-xs text-ink-700 text-center line-clamp-2 flex items-center justify-center">
                          {p.name}
                        </h4>

                        {/* Cadre image + overlay “+” + ouverture lightbox au clic sur l'image */}
                        <div className="w-full relative">
                          <button
                            className="w-full"
                            onClick={() => openLightbox(globalIndex)}
                            title="Voir en grand"
                          >
                            <div className="h-[140px] w-full flex items-center justify-center rounded-md border bg-white hover:shadow">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt={p.name}
                                className="w-[90%] h-[90%] object-contain"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/pharma-placeholder.png")}
                              />
                            </div>
                          </button>

                          {/* Bouton Ajouter (overlay) */}
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
                    );
                  })}
                </div>
              </div>
            );
          })}

          {(loading || hasMore) && (
            <div className="flex flex-col items-center justify-center py-4">
              {loading && <div className="text-xs text-ink-500">Chargement…</div>}
              <div ref={sentinelRef} className="h-2 w-full" />
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && items.length > 0 && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={showPrev}
          onNext={showNext}
        />
      )}
    </div>
  );
}

/* === Utilitaires === */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* === Lightbox avec bouton "Ajouter" === */
function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: Article[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { add } = useCart(); // ⬅️ AJOUT
  const cur = items[index];
  const src = String(cur?.image_url || cur?.img || "/pharma-placeholder.png");
  const name = String(cur?.name || "");
  const articleId = Number(cur?.id);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Fermer */}
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 text-white/90 hover:text-white text-2xl"
      >
        ✕
      </button>

      {/* Image + commandes */}
      <div className="relative max-w-[90vw] max-h-[85vh] bg-black/30 rounded-lg p-2 sm:p-4 flex flex-col items-center gap-3">
        <div className="w-full flex items-center justify-between">
          <button onClick={onPrev} aria-label="Précédent" className="text-white/90 hover:text-white text-3xl px-3">‹</button>
          <div className="flex items-center gap-3">
            <div className="text-white text-sm sm:text-base font-medium text-center truncate px-2">
              {name}
            </div>
            {/* AJOUTER AU PANIER dans la lightbox */}
            {Number.isFinite(articleId) && (
              <button
                onClick={() => add(articleId, 1)}
                className="rounded bg-blue-600 text-white text-xs sm:text-sm px-3 py-1.5 hover:brightness-110"
              >
                Ajouter au panier
              </button>
            )}
          </div>
          <button onClick={onNext} aria-label="Suivant" className="text-white/90 hover:text-white text-3xl px-3">›</button>
        </div>

        <div className="w-full h-[60vh] sm:h-[70vh] flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={name}
            className="max-w-full max-h-full object-contain rounded-md"
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/pharma-placeholder.png")}
          />
        </div>
      </div>
    </div>
  );
}
