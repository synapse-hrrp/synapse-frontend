"use client";

import PharmacieLayout from "@/components/layouts/PharmacieLayout";
import PlacardCarousel from "@/components/PlacardCarousel";
import { FAMILLES } from "@/lib/pharmacie_data";
import Link from "next/link";

export default function PharmaciePage() {
  return (
    <PharmacieLayout>
      {/* fil d’Ariane */}
      <nav className="text-sm text-ink-700">
        <ol className="flex items-center gap-2">
          <li><Link href="/portail" className="hover:underline">Portail</Link></li>
          <li aria-hidden>/</li>
          <li className="font-medium">Pharmacie</li>
        </ol>
      </nav>

      {/* carrousel 4 placards par page */}
      <PlacardCarousel familles={FAMILLES} />
    </PharmacieLayout>
  );
}
