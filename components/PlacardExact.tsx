"use client";

import Link from "next/link";
import Image from "next/image";
import type { Prod } from "@/lib/pharmacie_data";

type Props = {
  href: string;
  title: string;          // ex: "ANTIBIOTIQUES"
  items: Prod[];          // 20 éléments
};

export default function PlacardExact({ href, title, items }: Props) {
  // 5 lignes (étagères) × 4 colonnes
  const rows = Array.from({ length: 5 }).map((_, r) => items.slice(r * 4, r * 4 + 4));

  return (
    <Link
      href={href}
      className="relative block w-[240px] sm:w-[260px] md:w-[280px] pt-8"
      aria-label={`Ouvrir ${title}`}
    >

      {/* câbles suspendus */}
      <span aria-hidden className="absolute left-[47%] -translate-x-1/2 top-0 h-6 w-[2px] bg-ink-300 rounded" />
      <span aria-hidden className="absolute left-[53%] -translate-x-1/2 top-0 h-6 w-[2px] bg-ink-300 rounded" />

      {/* panneau du nom (bien visible) */}
      <div className="mx-auto -mt-1 mb-3 w-[78%] rounded-xl border bg-white text-center shadow-lg">
        <div className="px-3 py-2 text-[12px] sm:text-[13px] font-semibold tracking-wide uppercase text-ink-800">
          {title}
        </div>
      </div>

      {/* ombre globale */}
      <div className="absolute inset-x-4 bottom-1 translate-y-3 rounded-2xl bg-black/30 blur-md opacity-20" />

      {/* meuble */}
      <div className="relative z-10 rounded-2xl bg-gradient-to-b from-ink-50 to-white ring-1 ring-ink-100 shadow-sm overflow-hidden">
        {/* montants latéraux */}
        <div aria-hidden className="absolute left-1.5 top-0 bottom-4 w-2 rounded bg-gradient-to-b from-ink-200 to-ink-300" />
        <div aria-hidden className="absolute right-1.5 top-0 bottom-4 w-2 rounded bg-gradient-to-b from-ink-200 to-ink-300" />

        {/* 5 étagères */}
        <div className="px-3 pb-3 space-y-3">
          {rows.map((cols, i) => (
            <div key={i} className="relative rounded-xl bg-white ring-1 ring-ink-100">
              {/* façade bleue */}
              <div aria-hidden className="absolute left-0 right-0 top-0 h-2 rounded-t-xl"
                   style={{ background: "linear-gradient(90deg,#1e3a8a,#1d4ed8)" }} />
              {/* épaisseur */}
              <div aria-hidden className="absolute left-2 right-2 -bottom-1 h-2 rounded-b-xl"
                   style={{ background: "linear-gradient(#a3aab7,#6b7280)", boxShadow: "0 4px 10px rgba(0,0,0,.3)" }} />
              {/* 4 colonnes de produits */}
              <div className="relative z-10 grid grid-cols-4 gap-2 px-3 py-3">
                {cols.map((p) => (
                  <figure key={p.id} className="flex flex-col items-center">
                    <div className="h-[70px] w-full flex items-end justify-center">
                      <Image src={p.img} alt={p.name} width={64} height={70}
                             className="h-[66px] w-auto object-contain drop-shadow" />
                    </div>
                    <figcaption className="mt-1 text-[10px] text-ink-600 text-center line-clamp-2">{p.name}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}

          {/* socle bleu */}
          <div aria-hidden className="mt-2 h-3 rounded-b-2xl"
               style={{ background: "linear-gradient(90deg,#0b3b8d,#1e40af)" }} />
        </div>
      </div>
    </Link>
  );
}
