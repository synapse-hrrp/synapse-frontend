// app/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  useEffect(() => {
    // ---- Révélation au scroll (IntersectionObserver)
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("opacity-100", "translate-y-0");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // ---- Tilt 3D léger au survol des cartes service
    const cards = document.querySelectorAll<HTMLElement>("[data-tilt]");
    function onMove(this: HTMLElement, e: MouseEvent) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const midX = rect.width / 2;
      const midY = rect.height / 2;
      const rotX = ((y - midY) / midY) * -4; // -4° à 4°
      const rotY = ((x - midX) / midX) * 4;
      this.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(0)`;
    }
    function onLeave(this: HTMLElement) {
      this.style.transform = "perspective(900px) rotateX(0) rotateY(0) translateZ(0)";
    }
    cards.forEach((c) => {
      c.addEventListener("mousemove", onMove as any);
      c.addEventListener("mouseleave", onLeave as any);
    });
    return () => {
      cards.forEach((c) => {
        c.removeEventListener("mousemove", onMove as any);
        c.removeEventListener("mouseleave", onLeave as any);
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      {/* Bande supérieure identité */}
      <div className="text-white">
        <div className="bg-[#1b8f3a]">
          <div className="mx-auto max-w-7xl px-4 py-2 text-xs sm:text-sm flex items-center justify-between">
            <span>République du Congo – Ministère de la Santé et de la Population</span>
            <span className="opacity-90">Brazzaville</span>
          </div>
        </div>
        <div className="h-[3px] bg-[#ffd100]" />
        <div className="h-[3px] bg-[#d91e18]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/75">
 <div className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-md border border-slate-200">
  {/* Logo */}
  <div className="h-16 w-16 flex items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200 shadow-sm">
    <Image
      src="/logo-hospitals.png"
      alt="Logo de l'Hôpital"
      width={64}
      height={64}
      className="h-full w-full object-contain p-2"
      priority
    />
  </div>

  {/* Texte */}
  <div className="flex flex-col items-start">
    {/* Ligne principale */}
    <h1 className="text-lg sm:text-xl font-bold text-slate-800">
      Système Hospitalier - Raymond Pouaty
    </h1>
    {/* Bloc centré sous le titre */}
    <div className="w-full flex flex-col items-center">
      <span className="text-sm font-medium text-slate-600">
        Ex Hôpital Des Lépreux
      </span>
      <p className="text-xs text-slate-500">
        Portail officiel des services hospitaliers & administratifs
      </p>
    </div>
  </div>
</div>

{/* Barre tricolore Congo */}
<div className="w-full h-1 mt-2 flex rounded-full overflow-hidden shadow-sm">
  <div className="flex-1 bg-green-600"></div>
  <div className="flex-1 bg-yellow-400"></div>
  <div className="flex-1 bg-red-600"></div>
</div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Rubans décoratifs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-24 h-80 w-80 rounded-full bg-[#1b8f3a]/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#ffd100]/20 blur-3xl" />
          <div className="absolute top-1/3 -left-16 h-56 w-56 rounded-full bg-[#d91e18]/10 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 md:grid-cols-2">
          <div data-reveal className="opacity-0 translate-y-6 transition-all duration-700">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium bg-white/80 backdrop-blur text-slate-700 border-slate-200">
              <span className="h-2 w-2 rounded-full bg-[#1b8f3a]" />
              <span className="h-2 w-2 rounded-full bg-[#ffd100]" />
              <span className="h-2 w-2 rounded-full bg-[#d91e18]" />
              <span className="pl-1">Portail national — Hôpital de Référence Raymond Pouaty</span>
            </div>

            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Un portail <span className="text-[#1b8f3a]">sécurisé</span> et{" "}
              <span className="text-[#1b8f3a]">efficace</span> pour nos patients et équipes
            </h2>
            <p className="mt-4 text-slate-600">
              Admissions, urgences, pharmacie, laboratoire, échographie, gynécologie, pédiatrie, médecine générale,
              facturation et encaissement — centralisés pour accélérer la prise en charge et améliorer la qualité des soins.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="relative inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <span className="absolute inset-0 rounded-xl ring-2 ring-green-400/0 animate-[pulse-shadow_2.2s_ease-in-out_infinite]" />
                Se connecter
              </Link>

              <a
                href="#services"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector("#services")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-green-600 via-yellow-400 to-red-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-yellow-300 animate-[pulse-shadow_2.2s_ease-in-out_infinite]"
              >
                Voir les services
              </a>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Accès réservé au personnel habilité — contactez la DSI pour obtenir un compte.
            </p>
          </div>

          {/* Carte : points clés (révélés en grille) */}
          <div className="rounded-3xl border bg-white/85 p-6 shadow-md backdrop-blur">
            <h3 className="text-lg font-semibold">Points clés</h3>
            <ul className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                { icon: "🔐", t: "Sécurité & traçabilité", d: "Accès par rôle, journaux d’audit" },
                { icon: "⚡", t: "Fluidité du parcours", d: "Coordination inter-services" },
                { icon: "📊", t: "Données fiables", d: "Tableaux de bord en temps réel" },
                { icon: "🤝", t: "Service public", d: "Respect des normes nationales" },
              ].map((k, i) => (
                <li
                  key={i}
                  data-reveal
                  className="opacity-0 translate-y-6 transition-all duration-700 rounded-2xl border bg-slate-50 p-4"
                  style={{ transitionDelay: `${120 * i}ms` }}
                >
                  <div className="text-2xl">{k.icon}</div>
                  <div className="mt-2 font-medium">{k.t}</div>
                  <div className="text-slate-600">{k.d}</div>
                </li>
              ))}
            </ul> <br />
            <b></b>
            <p className="mt-4 text-xs text-slate-500">
              Les indicateurs s’activent après intégration aux systèmes métiers.
            </p>
          </div>
        </div>
      </section>

      {/* Grille des services */}
      <section id="services" className="mx-auto max-w-7xl px-4 pb-14">
        <h3 className="text-xl font-semibold">Services principaux</h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { id: "pharmacie",         label: "Pharmacie",         emoji: "💊", desc: "Dispensation & stock" },
            { id: "laboratoire",       label: "Laboratoire",       emoji: "🧪", desc: "Analyses & résultats" },
            { id: "echographie",       label: "Échographie",       emoji: "🩺", desc: "Imagerie ultrasonore" },
            { id: "gynecologie",       label: "Gynécologie",       emoji: "👩‍⚕️", desc: "Suivi & soins" },
            { id: "pediatrie",         label: "Pédiatrie",         emoji: "🧒", desc: "Soins de l’enfant" },
            { id: "medecine-generale", label: "Médecine générale", emoji: "🏥", desc: "Consultations" },
            { id: "admissions",        label: "Admissions",        emoji: "🗂️", desc: "Dossiers d’entrée" },
            { id: "caisse",            label: "Caisse",            emoji: "💳", desc: "Encaissement & reçus" },
          ].map((s, i) => (
            <Link
              key={s.id}
              href={`/login?service=${encodeURIComponent(s.id)}`}
              data-reveal
              data-tilt
              className="opacity-0 translate-y-6 transition-all duration-700 group relative rounded-2xl border bg-white p-5 shadow-sm will-change-transform hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#1b8f3a]"
              style={{ transitionDelay: `${80 * i}ms` }}
            >
              <span className="absolute inset-x-0 -top-px h-1 rounded-t-2xl bg-[linear-gradient(90deg,#1b8f3a,#ffd100,#d91e18)]" />
              <div className="text-3xl">{s.emoji}</div>
              <div className="mt-2 text-lg font-semibold group-hover:text-[#1b8f3a]">{s.label}</div>
              <div className="text-sm text-slate-600">{s.desc}</div>
              <div className="mt-3 text-xs text-[#1b8f3a] underline underline-offset-2">Se connecter pour accéder →</div>
            </Link>
          ))}
        </div>

        {/* Bandeau de confiance tri-couleur */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white" data-reveal>
          <div className="h-1 w-full bg-[linear-gradient(90deg,#1b8f3a,#ffd100,#d91e18)]" />
          <div className="p-4 sm:p-5 text-slate-800">
            <p className="text-sm">
              <strong>Confiance & Sécurité.</strong> Ce portail est géré par l’Hôpital de Référence Raymond Pouaty.
              Les accès sont strictement réservés aux personnels autorisés. Pour toute demande, contactez le service informatique.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80">
        <div className="h-1 w-full bg-[linear-gradient(90deg,#1b8f3a,#ffd100,#d91e18)]" />
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-slate-600">
          © {new Date().getFullYear()} Hôpital de Référence Raymond Pouaty (ex Hôpital des lépreux) — Brazzaville. Tous droits réservés.
          <div className="mt-1">Besoin d’aide ? Contactez les informaticiens.</div>
        </div>
      </footer>

      {/* Animations CSS locales */}
      <style jsx global>{`
        @keyframes pulse-shadow {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.0); }
          50% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0.08); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.0); }
        }
      `}</style>
    </div>
  );
}
