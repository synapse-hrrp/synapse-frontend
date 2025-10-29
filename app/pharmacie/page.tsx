// app/pharmacie/page.tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link"; // ✅ import manquant pour rendre les placards cliquables
import { getDciOptions } from "@/lib/api";
import PlacardDCI from "@/components/pharmacie/PlacardDCI";

type DciOption = { id: number; name: string };

export default function PharmacieHomePage() {
  const [dcis, setDcis] = useState<DciOption[]>([]);
  const [loading, setLoading] = useState(true);

  // rail horizontal
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const CARD_SELECT = "[data-placard-card]";

  const load = async () => {
    try {
      const opts = await getDciOptions();
      setDcis(Array.isArray(opts) ? opts : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // optionnel
    return () => clearInterval(t);
  }, []);

  // calcule si on peut aller à gauche/droite (pro, sans sauts)
  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, clientWidth, scrollWidth } = el;
    const EPS = 2; // petite marge anti-pixel
    setCanPrev(scrollLeft > EPS);
    setCanNext(scrollLeft + clientWidth < scrollWidth - EPS);
  };

  useLayoutEffect(() => {
    updateArrows();
    const onResize = () => updateArrows();
    const el = trackRef.current;
    const onScroll = () => updateArrows();
    window.addEventListener("resize", onResize);
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      el?.removeEventListener("scroll", onScroll);
    };
  }, [loading, dcis.length]); // ✅ met à jour quand la liste change

  // largeur exacte d’un “pas” = 4 cartes (mesurée, gap inclus)
  const scrollByGroup = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;

    const cards = Array.from(el.querySelectorAll<HTMLElement>(CARD_SELECT));
    if (cards.length === 0) return;

    const first = cards[0];
    const second = cards[1];
    const stepOne = second
      ? Math.abs(second.offsetLeft - first.offsetLeft)
      : first.getBoundingClientRect().width;

    const step = stepOne * 4 * dir; // pas = 4 cartes
    el.scrollBy({ left: step, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-xl font-bold mb-4">Pharmacie</h1>

      {loading && (
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
          <div className="h-64 bg-white/70 rounded-2xl ring-1 ring-ink-100 animate-pulse" />
        </div>
      )}

      {!loading && dcis.length === 0 && (
        <div className="text-sm text-ink-700">Aucun DCI pour le moment.</div>
      )}

      {!loading && dcis.length > 0 && (
        <div className="relative">
          {/* flèche gauche */}
          <button
            onClick={() => scrollByGroup(-1)}
            aria-label="Précédent"
            disabled={!canPrev}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 rounded-full p-2 shadow transition
              ${canPrev ? "bg-white/90 hover:bg-white" : "bg-white/60 cursor-not-allowed opacity-40"}`}
          >
            ‹
          </button>

          {/* masques dégradés aux bords (optionnels) */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-10 z-10 fade-left" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-10 z-10 fade-right" />

          {/* rail horizontal — scrollbar masquée via .no-scrollbar (CSS util) */}
          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-12 no-scrollbar"
          >
            {dcis.map((dci) => (
              <Link
                key={dci.id}
                href={`/pharmacie/placard/${dci.id}`}  // ✅ placard cliquable
                data-placard-card
                aria-label={`Ouvrir le placard ${dci.name}`}
                className="shrink-0 snap-start w-[18rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl"
              >
                <div className="cursor-pointer hover:shadow-md transition-shadow">
                  <PlacardDCI dci={dci} compact />
                </div>
              </Link>
            ))}
          </div>

          {/* flèche droite */}
          <button
            onClick={() => scrollByGroup(1)}
            aria-label="Suivant"
            disabled={!canNext}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 rounded-full p-2 shadow transition
              ${canNext ? "bg-white/90 hover:bg-white" : "bg-white/60 cursor-not-allowed opacity-40"}`}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
