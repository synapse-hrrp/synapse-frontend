// app/portail/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Pill, FlaskConical, Stethoscope, HeartPulse,
  Baby, Hospital, Archive, WalletMinimal,
  ShieldCheck, Activity, Clock3, ChevronRight
} from "lucide-react";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function PortailAdmin() {
  // Garde d'accès (Option A: token Bearer présent)
  useEffect(() => {
    try {
      const token = sessionStorage.getItem("auth:token");
      if (!token) {
        window.location.replace("/login?next=/portail");
        return;
      }
    } catch {
      window.location.replace("/login?next=/portail");
    }
  }, []);

  // Révélation au scroll (animation)
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("opacity-100", "translate-y-0");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Fil d’Ariane */}
        <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
          <ol className="flex items-center gap-2">
            <li>Accueil</li>
            <li aria-hidden="true">/</li>
            <li className="text-ink-700 font-medium">Portail administrateur</li>
          </ol>
        </nav>

        <KpiRow />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            <QuickActions />
            <ServicesGrid />
          </section>
          <aside className="space-y-6">
            <Announcements />
            <SecurityPanel />
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/* -------- sous-composants locaux -------- */

function KpiRow() {
  const items = [
    { label: "Admissions aujourd’hui", value: "128", icon: Activity, tone: "green" },
    { label: "Délai moyen d’attente", value: "18 min", icon: Clock3, tone: "yellow" },
    { label: "Incidents critiques", value: "0", icon: ShieldCheck, tone: "red" },
  ] as const;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="region" aria-label="Indicateurs clés">
      {items.map((k, i) => (
        <div key={k.label} data-reveal style={{ transitionDelay: `${80 * i}ms` }}
          className="opacity-0 translate-y-2 transition-all duration-700 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={
              "h-10 w-10 rounded-xl flex items-center justify-center " +
              (k.tone === "green"
                ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/20"
                : k.tone === "yellow"
                ? "bg-[color:var(--color-congo-yellow)]/10 text-congo-yellow ring-1 ring-congo-yellow/20"
                : "bg-[color:var(--color-congo-red)]/10 text-congo-red ring-1 ring-congo-red/20")
            }>
              <k.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-ink-500">{k.label}</div>
              <div className="text-lg font-semibold text-ink-900">{k.value}</div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function QuickActions() {
  const actions = [
    { href: "/patients",   label: "Rechercher un patient", desc: "Liste & fiches",       tone: "green" as const }, // + Patients
    { href: "/admissions", label: "Nouvelle admission",    desc: "Créer un dossier",     tone: "green" as const },
    { href: "/laboratoire",label: "Demande d’analyse",     desc: "Ordre labo & suivi",   tone: "yellow" as const },
    { href: "/caisse",     label: "Émettre un reçu",       desc: "Facturer & encaisser", tone: "green" as const },
  ];
  return (
    <section aria-labelledby="actions-rapides">
      <h3 id="actions-rapides" className="text-sm font-semibold text-ink-700 mb-3">Actions rapides</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((a, i) => (
          <Link key={a.href} href={a.href} data-reveal style={{ transitionDelay: `${70 * i}ms` }}
            className={"opacity-0 translate-y-2 transition-all duration-700 rounded-xl border bg-white p-4 shadow-sm hover:shadow focus:outline-none focus:ring-2 " +
              (a.tone === "green" ? "border-congo-green/20 focus:ring-congo-green/30" : "border-congo-yellow/30 focus:ring-congo-yellow/40")}>
            <div className="text-ink-900 font-medium">{a.label}</div>
            <div className="text-xs text-ink-500">{a.desc}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ServicesGrid() {
  const services = [
    { id: "patients",          label: "Patients",          desc: "Dossiers & suivi" },   // + Patients
    { id: "pharmacie",         label: "Pharmacie",         desc: "Dispensation & stock" },
    { id: "laboratoire",       label: "Laboratoire",       desc: "Analyses & résultats" },
    { id: "echographie",       label: "Échographie",       desc: "Imagerie ultrasonore" },
    { id: "gynecologie",       label: "Gynécologie",       desc: "Suivi & soins" },
    { id: "pediatrie",         label: "Pédiatrie",         desc: "Soins de l’enfant" },
    { id: "medecine-generale", label: "Médecine générale", desc: "Consultations" },
    { id: "admissions",        label: "Admissions",        desc: "Dossiers d’entrée" },
    { id: "caisse",            label: "Caisse",            desc: "Encaissement & reçus" },
  ] as const;

  return (
    <section aria-labelledby="services">
      <div className="flex items-center justify-between">
        <h3 id="services" className="text-lg font-semibold">Services principaux</h3>
        <Link href="/portail/services" className="text-sm text-congo-green hover:underline inline-flex items-center gap-1">
          Tout voir <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {services.map((s, i) => (
          <Link key={s.id} href={`/${s.id}`} data-reveal style={{ transitionDelay: `${70 * i}ms` }}
            className="opacity-0 translate-y-2 transition-all duration-700 group relative rounded-2xl border border-ink-100 bg-white p-5 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-congo-green"
            aria-label={`Accéder au service ${s.label}`}>
            <span className="absolute inset-x-0 -top-px h-1 rounded-t-2xl bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
            <div className="text-ink-900 font-semibold group-hover:text-congo-green">{s.label}</div>
            <div className="text-sm text-ink-700">{s.desc}</div>
            <div className="mt-3 text-xs text-congo-green underline underline-offset-2">Entrer dans le service →</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Announcements() {
  const items = [
    { title: "Maintenance labo samedi 22h–00h", body: "Interruption du service d’analyse — planifiez les urgences.", color: "yellow" },
    { title: "Politique RGPD/Confidentialité",  body: "Rappel : ne partagez jamais d’identifiants ni de données patients.", color: "red" },
    { title: "Nouvelle filière pédiatrie",     body: "Parcours accéléré disponible dès la semaine prochaine.", color: "green" },
  ] as const;

  return (
    <section aria-labelledby="annonces" className="space-y-3">
      <h3 id="annonces" className="text-sm font-semibold text-ink-700">Annonces</h3>
      {items.map((n, i) => (
        <div key={n.title} data-reveal style={{ transitionDelay: `${70 * i}ms` }}
          className={"opacity-0 translate-y-2 transition-all duration-700 rounded-xl border bg-white p-4 shadow-sm " +
            (n.color === "yellow" ? "border-congo-yellow/30" : n.color === "red" ? "border-congo-red/30" : "border-congo-green/25")}>
          <div className="text-sm font-medium text-ink-900">{n.title}</div>
          <p className="text-xs text-ink-700 mt-1">{n.body}</p>
        </div>
      ))}
    </section>
  );
}

function SecurityPanel() {
  return (
    <section aria-labelledby="securite" className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <h3 id="securite" className="text-sm font-semibold text-ink-700">Sécurité & conformité</h3>
      <ul className="mt-3 space-y-2 text-sm">
        <li>Accès par rôle (journalisation et traçabilité activées).</li>
        <li>Surveillance de disponibilité des services 24/7.</li>
        <li>Sessions inactives déconnectées automatiquement.</li>
      </ul>
      <Link href="/securite" className="mt-3 inline-flex items-center gap-1 text-xs text-congo-green hover:underline">
        En savoir plus <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
