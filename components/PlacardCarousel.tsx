"use client";

import { useEffect, useMemo, useState } from "react";
import PlacardExact from "./PlacardExact";
import type { Famille } from "@/lib/pharmacie_data";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = { familles: Famille[] };

export default function PlacardCarousel({ familles }: Props) {
  // groupes de 4 placards
  const pages = useMemo(() => {
    const out: Famille[][] = [];
    for (let i = 0; i < familles.length; i += 4) out.push(familles.slice(i, i + 4));
    return out;
  }, [familles]);

  const [page, setPage] = useState(0);
  const max = Math.max(0, pages.length - 1);

  function go(delta: number) { setPage((p) => Math.min(max, Math.max(0, p + delta))); }

  // flèches clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [max]);

  return (
    <section className="relative">
      {/* flèches */}
      <button
        onClick={() => go(-1)} disabled={page === 0}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/95 p-2 shadow disabled:opacity-40"
        aria-label="Précédent"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => go(1)} disabled={page === max}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/95 p-2 shadow disabled:opacity-40"
        aria-label="Suivant"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* viewport */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((group, idx) => (
            <div key={idx} className="min-w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
                {group.map((f) => (
                  <PlacardExact key={f.slug} href={`/pharmacie/placard/${f.slug}`} title={f.label} items={f.items} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* pagination (petits points) */}
      <div className="mt-4 flex justify-center gap-2">
        {pages.map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className={`h-2.5 w-2.5 rounded-full ${i === page ? "bg-congo-green" : "bg-ink-300"}`}
            aria-label={`Aller à la page ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
