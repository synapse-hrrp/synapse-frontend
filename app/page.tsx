// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { InfinityIcon } from "lucide-react";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/login"), 2200); // 2.2s = punchy & pro
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="relative min-h-screen flex items-center justify-center text-white overflow-hidden">
      {/* Fond Congo pro : dégradé + rubans diagonaux */}
      <div className="absolute inset-0 bg-[conic-gradient(at_30%_120%,#1b8f3a_0deg,#1b8f3a_120deg,#ffd100_120deg,#ffd100_240deg,#d91e18_240deg,#d91e18_360deg)] opacity-[0.12]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1b8f3a] via-[#1b8f3a] to-[#166c2f]" />

      {/* Ruban drapeau en bas */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-2">
        <div className="h-full w-full bg-[linear-gradient(90deg,#1b8f3a,#ffd100,#d91e18)]" />
      </div>

      {/* Contenu centré */}
      <div className="relative z-10 flex flex-col items-center">
        <img
          src="/hopital.png"
          alt="Synapse Santé"
          className="w-24 h-24 md:w-28 md:h-28 rounded-xl bg-white/10 p-3 ring-1 ring-white/20 shadow-lg"
        />
        <h1
          className="mt-4 text-2xl md:text-3xl font-extrabold tracking-tight"
          style={{ color: "#ffd100" }} // jaune Congo = accent premium
        >
          Synapse Santé
        </h1>

        {/* Loader professionnel */}
        <div className="mt-10 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1b8f3a] animate-bounce [animation-delay:-0.2s]" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ffd100] animate-bounce" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#d91e18] animate-bounce [animation-delay:0.2s]" />
            <InfinityIcon className="h-5 w-5 animate-spin text-white/80" />
          </div>
          <p className="text-xs md:text-sm text-white/80">Chargement…</p>
        </div>
      </div>

      {/* Grain subtil pour un rendu premium */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
           style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><defs><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter></defs><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')" }} />
    </div>
  );
}
