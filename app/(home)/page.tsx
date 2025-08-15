import Image from "next/image";
import Link from "next/link";
import ParallaxBlobs from "@/components/ParallaxBlobs";

export default function Home() {
  return (
    <main className="relative flex min-h-[100vh] items-center justify-center px-4 py-14 bg-gradient-to-br from-green-50 via-white to-gray-100">
      {/* Parallaxe (pour éléments internes seulement) */}
      <ParallaxBlobs />

      {/* BACKGROUND: anciens blobs (blur + hue rotate) */}
      <div className="hero-blobs">
        <div className="blob blob--a blob--1"></div>
        <div className="blob blob--b blob--2"></div>
        <div className="blob blob--c blob--3"></div>
      </div>

      {/* Carte au-dessus des blobs */}
      <section className="relative z-10 w-full max-w-3xl rounded-3xl border border-green-100 bg-white/80 backdrop-blur shadow-xl ring-1 ring-white/40 px-8 sm:px-12 py-10 text-center overflow-hidden">
        {/* petite orb décorative en parallaxe */}
        <div className="deco-orb parallax" data-speed="6" aria-hidden="true"></div>

        {/* Logo + anneau animé */}
        <div className="mx-auto mb-6 inline-flex items-center justify-center p-2 shadow-lg">
          <div className="logo-ring parallax" data-speed="2">
            <div className="rounded-full bg-white p-2 shadow relative z-10">
              <Image
                src="/logo-hrrp.jpg"
                alt="Logo Hôpital"
                width={112}
                height={112}
                className="rounded-full"
                priority
              />
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          <span className="inline-block h-2 w-2 rounded-full bg-green-600" />
          Plateforme interne • HRRP
        </div>

        {/* Titre + sous-titre */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-green-700">
          SYNAPSE SANTÉ HRRP
        </h1>
        <p className="mt-3 text-sm sm:text-base text-gray-600">
          Accédez aux services hospitaliers en toute sécurité. Interface moderne,
          rapide et adaptée à l’Hôpital de Référence Raymond Poaty(ex-Hôpital des Lépreux).
        </p>

        {/* CTA premium */}
        <div className="mt-10 flex items-center justify-center">
          <Link
            href="/login"
            className="btn-cta group inline-flex items-center gap-2 px-8 py-3 text-white font-semibold transition hover:scale-[1.02] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
            aria-label="Aller à la page de connexion"
          >
            <span>Cliquer</span>
            <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L13.586 10H3a1 1 0 110-2h10.586l-3.293-3.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span className="shine" aria-hidden="true"></span>
          </Link>
        </div>

        {/* Bandeau infos */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-green-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-500">Établissement</p>
              <p className="text-sm font-semibold text-gray-800">
                Hôpital de Référence Raymond Poaty (ex-Hôpital des Lépreux)
              </p>
          </div>

          <div className="rounded-xl border border-green-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Localisation</p>
            <p className="text-sm font-semibold text-gray-800">République du Congo – Brazzaville</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Accès</p>
            <p className="text-sm font-semibold text-green-700">Sécurisé</p>
          </div>
        </div>
      </section>
    </main>
  );
}
