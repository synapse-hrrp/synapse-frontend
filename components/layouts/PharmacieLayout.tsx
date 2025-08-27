// components/layouts/PharmacieLayout.tsx
"use client";

import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TopIdentityBar from "@/components/TopIdentityBar";
import { ReactNode } from "react";

type Props = { children: ReactNode };

export default function PharmacieLayout({ children }: Props) {
  return (
    <div className="relative min-h-screen text-ink-900">
      {/* ✅ Fond avec Next/Image pour netteté + srcset */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/pharmacie/backgrounds/pharma-bg-highres.jpg" // ton image
          alt=""                                    // décoratif
          fill                                      // occupe tout l’écran
          sizes="100vw"                             // pleine largeur
          priority                                  // charge vite
          quality={90}                              // meilleure qualité
          className="object-cover"
        />
      </div>

      {/* Overlay (sans blur !) pour lisibilité */}
      <div className="absolute inset-0 bg-white/55 -z-0" />

      {/* Contenu */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <TopIdentityBar />
        <SiteHeader
          title="Pharmacie"
          subtitle="Sélectionnez une famille de médicaments"
          logoSrc="/logos/pharmacie.png"
          avatarSrc="/Gloire.png"
        />

        <main className="flex-1 mx-auto max-w-7xl px-4 py-8 space-y-8">
          {children}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
