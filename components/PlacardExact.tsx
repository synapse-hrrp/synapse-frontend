"use client";

import Image from "next/image";
import Link from "next/link";

type Item = {
  id: string | number;
  name: string;
  image_url?: string | null;
  stock?: number | null;
};

type Props = {
  href: string;
  title: string;
  items: Item[];
};

/**
 * Affiche exactement 5 lignes (étagères) × 4 colonnes = 20 cases.
 * - Si items < 20 : on complète avec des cases vides (placeholders)
 * - Si items > 20 : on tronque aux 20 premiers
 */
export default function PlacardExact({ href, title, items }: Props) {
  const ROWS = 5;
  const COLS = 4;
  const CAP = ROWS * COLS;

  // 1) Tronque aux 20 premiers
  const first20 = (items ?? []).slice(0, CAP);

  // 2) Bourre avec des "null" pour atteindre 20
  const padded: (Item | null)[] =
    first20.length < CAP
      ? [...first20, ...Array.from({ length: CAP - first20.length }).map(() => null)]
      : first20;

  // 3) Découpe en 5 lignes de 4
  const rows: (Item | null)[][] = [];
  for (let r = 0; r < ROWS; r++) {
    rows.push(padded.slice(r * COLS, (r + 1) * COLS));
  }

  return (
    <Link href={href} className="block group">
      {/* Titre du placard */}
      <div className="mb-3 flex justify-center">
        <div className="relative">
          <span aria-hidden className="absolute -top-6 left-1/4 h-6 w-[2px] bg-ink-300 rounded" />
          <span aria-hidden className="absolute -top-6 right-1/4 h-6 w-[2px] bg-ink-300 rounded" />
          <div className="rounded-xl border bg-white px-4 py-2 text-center text-sm font-semibold uppercase shadow">
            {title}
          </div>
        </div>
      </div>

      {/* 5 étagères */}
      <section className="rounded-2xl bg-white ring-1 ring-ink-100 shadow-sm p-3 sm:p-4">
        <div className="space-y-6">
          {rows.map((row, rIndex) => (
            <div key={`row-${rIndex}`} className="relative">
              {/* rail bleu */}
              <div
                aria-hidden
                className="absolute -top-2 left-0 right-0 h-3 rounded-t-md"
                style={{ background: "linear-gradient(90deg,#1e3a8a,#1d4ed8)" }}
              />
              {/* épaisseur/ombre */}
              <div
                aria-hidden
                className="absolute -top-2 left-1 right-1 h-2 translate-y-3 rounded-b-md"
                style={{ background: "linear-gradient(#a3aab7,#6b7280)" }}
              />
              {/* produits (4 colonnes fixes) */}
              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3">
                {row.map((p, cIndex) =>
                  p ? (
                    <article key={`cell-${rIndex}-${cIndex}-${p.id}`} className="flex flex-col items-center">
                      <div className="h-[110px] sm:h-[120px] md:h-[130px] w-full flex items-end justify-center">
                        <Image
                          src={p.image_url ?? "/images/pharmacie/_placeholders/box1.png"}
                          alt={p.name}
                          width={100}
                          height={130}
                          className="max-h-[130px] w-auto object-contain drop-shadow"
                        />
                      </div>
                      <h4 className="mt-2 text-[11px] sm:text-xs text-ink-700 text-center line-clamp-2">
                        {p.name}
                      </h4>
                    </article>
                  ) : (
                    // Case vide (placeholder visuel discret pour compléter la grille)
                    <div
                      key={`cell-${rIndex}-${cIndex}-empty`}
                      className="h-[150px] rounded bg-white/60"
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </Link>
  );
}
