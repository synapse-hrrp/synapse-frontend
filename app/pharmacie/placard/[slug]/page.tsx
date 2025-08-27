"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PharmacieLayout from "@/components/layouts/PharmacieLayout";
import { FAMILLES } from "@/lib/pharmacie_data";

type PageProps = { params: { slug: string } };

export default function PlacardDetail({ params }: PageProps) {
  const router = useRouter();
  const idx = FAMILLES.findIndex(f => f.slug === params.slug);
  if (idx === -1) return notFound();

  const fam  = FAMILLES[idx];
  const prev = idx > 0 ? FAMILLES[idx - 1] : null;
  const next = idx < FAMILLES.length - 1 ? FAMILLES[idx + 1] : null;

  return (
    <PharmacieLayout
      title={fam.label}
      subtitle="Contenu du placard"
      useMainWrapper={false}          // ⬅️ on garde ton <main> d'origine
    >
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Fil d’Ariane + navigation familles */}
        <div className="flex items-center justify-between gap-4">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/portail" className="hover:underline">Portail</Link></li>
              <li aria-hidden>/</li>
              <li><Link href="/pharmacie" className="hover:underline">Pharmacie</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-800">{fam.label}</li>
            </ol>
          </nav>

          <div className="flex items-center gap-2">
            <button
              disabled={!prev}
              onClick={() => prev && router.replace(`/pharmacie/placard/${prev.slug}`)}
              className="rounded-full bg-white/95 p-2 shadow disabled:opacity-40"
              aria-label="Placard précédent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              disabled={!next}
              onClick={() => next && router.replace(`/pharmacie/placard/${next.slug}`)}
              className="rounded-full bg-white/95 p-2 shadow disabled:opacity-40"
              aria-label="Placard suivant"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Panneau suspendu (nom du placard) */}
        <div className="flex justify-center">
          <div className="relative">
            <span aria-hidden className="absolute -top-6 left-1/4 h-6 w-[2px] bg-ink-300 rounded" />
            <span aria-hidden className="absolute -top-6 right-1/4 h-6 w-[2px] bg-ink-300 rounded" />
            <div className="rounded-xl border bg-white px-4 py-2 text-center text-sm font-semibold uppercase shadow">
              {fam.label}
            </div>
          </div>
        </div>

        {/* Étagères bleues + produits (identiques à ta version) */}
        <section aria-label={`Produits ${fam.label}`} className="rounded-2xl bg-white ring-1 ring-ink-100 shadow-sm p-3 sm:p-4">
          <div className="space-y-6">
            {chunk(fam.items, 8).map((row, rIndex) => (
              <div key={rIndex} className="relative">
                {/* rail bleu */}
                <div aria-hidden className="absolute -top-2 left-0 right-0 h-3 rounded-t-md"
                     style={{ background: "linear-gradient(90deg,#1e3a8a,#1d4ed8)" }} />
                {/* épaisseur/ombre */}
                <div aria-hidden className="absolute -top-2 left-1 right-1 h-2 translate-y-3 rounded-b-md"
                     style={{ background: "linear-gradient(#a3aab7,#6b7280)" }} />
                {/* produits */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 pt-3">
                  {row.map((p) => (
                    <article key={p.id} className="flex flex-col items-center">
                      <div className="h-[110px] sm:h-[120px] md:h-[130px] w-full flex items-end justify-center">
                        <Image
                          src={p.img}
                          alt={p.name}
                          width={100}
                          height={130}
                          className="max-h-[130px] w-auto object-contain drop-shadow"
                        />
                      </div>
                      <h4 className="mt-2 text-[11px] sm:text-xs text-ink-700 text-center line-clamp-2">{p.name}</h4>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Retour */}
        <div className="flex justify-center">
          <Link href="/pharmacie" className="text-sm text-congo-green hover:underline">
            ← Retour aux placards
          </Link>
        </div>
      </main>
    </PharmacieLayout>
  );
}

/* Utilitaire pour grouper un tableau en paquets */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
