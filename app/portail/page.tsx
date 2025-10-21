// app/portail/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Activity, Clock3, ChevronRight } from "lucide-react";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

/* ---------------- Helpers session ---------------- */
type AnyObj = Record<string, any>;

function getSessionUser(): AnyObj | null {
  try {
    const raw = sessionStorage.getItem("auth:user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function getRoleNames(user: AnyObj): string[] {
  const raw = user?.roles ?? [];
  return (Array.isArray(raw) ? raw : [])
    .map((r: any) => (typeof r === "string" ? r : r?.name))
    .filter(Boolean)
    .map((s: string) => s.toLowerCase());
}
function getPermNames(user: AnyObj): Set<string> {
  const pools = [user?.permissions, user?.perms, user?.abilities, user?.scopes].filter(Boolean);
  const names = pools.flatMap((arr: any[]) =>
    (Array.isArray(arr) ? arr : []).map((p: any) => (typeof p === "string" ? p : p?.name)).filter(Boolean)
  );
  return new Set(names);
}
function isAdminish(user: AnyObj) {
  const roles = getRoleNames(user);
  const perms = getPermNames(user);
  return roles.includes("admin") || roles.includes("dg") || perms.has("*");
}

/* --------- mapping service -> route front ---------- */
const SERVICE_NAME_TO_SLUG: Record<string, string> = {
  "Accueil / Réception": "reception",
  "Consultations": "consultations",
  "Médecine Générale": "medecine",
  "Accueil & Urgences (ARU)": "aru",
  "Laboratoire": "laboratoire",
  "Pharmacie": "pharmacie",
  "Caisse / Finance": "finance",
  "Logistique": "logistique",
  "Pansement": "pansement",
  "Kinésithérapie": "kinesitherapie",
  "Gestion des Malades (Hospitalisation)": "gestion-malade",
  "Programme Sanitaire (Tuberculose/VIH)": "sanitaire",
  "Gynécologie": "gynecologie",
  "Maternité": "maternite",
  "Pédiatrie": "pediatrie",
  "SMI (Santé Maternelle & Infantile)": "smi",
  "Bloc Opératoire": "bloc-operatoire",
  "Statistiques / Dashboard": "statistiques",
  "Répartition des Pourcentages": "pourcentage",
  "Gestion du Personnel": "personnel",
};
const ROLE_TO_SLUG: Record<string, string> = {
  reception: "reception",
  medecin: "consultations",
  infirmier: "pansement",
  laborantin: "laboratoire",
  pharmacien: "pharmacie",
  caissier: "finance",
  gestionnaire: "statistiques",
};
function serviceSlugToPath(slug?: string | null): string | null {
  if (!slug) return null;
  if (slug === "finance") return "/caisse";
  if (slug === "personnel") return "/personnels";
  return `/${slug}`;
}

/* ----- Tiles (admin voit tout, autres n’entrent plus ici) ----- */
type Tile = { slug: string; label: string; desc: string; href: string };
const SERVICE_TILES: Tile[] = [
  { slug: "reception", label: "Accueil / Réception", desc: "Orientation & accueil", href: "/reception" },
  { slug: "consultations", label: "Consultations", desc: "Consultations médicales", href: "/consultations" },
  { slug: "medecine", label: "Médecine Générale", desc: "Consultations", href: "/medecine" },
  { slug: "aru", label: "Accueil & Urgences (ARU)", desc: "Triage & urgences", href: "/aru" },
  { slug: "laboratoire", label: "Laboratoire", desc: "Analyses & résultats", href: "/laboratoire" },
  { slug: "pharmacie", label: "Pharmacie", desc: "Dispensation & stock", href: "/pharmacie" },
  { slug: "finance", label: "Caisse / Finance", desc: "Encaissement & reçus", href: "/caisse" },
  { slug: "logistique", label: "Logistique", desc: "Ressources & équipements", href: "/logistique" },
  { slug: "pansement", label: "Pansement", desc: "Soins locaux & suivi", href: "/pansements" },
  { slug: "kinesitherapie", label: "Kinésithérapie", desc: "Rééducation", href: "/kinesitherapie" },
  { slug: "gestion-malade", label: "Gestion des Malades", desc: "Hospitalisation & lits", href: "/gestion-malade" },
  { slug: "sanitaire", label: "Programme Sanitaire", desc: "VIH / Tuberculose", href: "/sanitaire" },
  { slug: "gynecologie", label: "Gynécologie", desc: "Suivi & soins", href: "/gynecologie" },
  { slug: "maternite", label: "Maternité", desc: "Suivi & accouchements", href: "/maternite" },
  { slug: "pediatrie", label: "Pédiatrie", desc: "Soins de l’enfant", href: "/pediatrie" },
  { slug: "smi", label: "SMI (Santé Mère & Enfant)", desc: "Suivi mère & enfant", href: "/smi" },
  { slug: "bloc-operatoire", label: "Bloc Opératoire", desc: "Actes & planning", href: "/bloc-operatoire" },
  { slug: "statistiques", label: "Statistiques / Dashboard", desc: "Indicateurs clés", href: "/statistiques" },
  { slug: "pourcentage", label: "Répartition des Pourcentages", desc: "Paramétrage & parts", href: "/pourcentage" },
  { slug: "personnel", label: "Gestion du Personnel", desc: "Ressources humaines", href: "/personnels" },
];

export default function PortailAdmin() {
  const [ready, setReady] = useState(false);

  // Garde stricte : admin/DG/* uniquement. Sinon, redirection ferme.
  useEffect(() => {
    const token = sessionStorage.getItem("auth:token");
    const u = getSessionUser();

    // Pas de session → login
    if (!token || !u) {
      window.location.replace("/login?next=/portail");
      return;
    }

    // Admin/DG ou super-permission ?
    if (isAdminish(u)) {
      setReady(true);
      return;
    }

    // Non-admin → tente de le rediriger vers SON service
    const roles = getRoleNames(u);

    let slug =
      u?.personnel?.service?.slug ||
      SERVICE_NAME_TO_SLUG[u?.personnel?.service?.name as string];

    if (!slug) {
      for (const r of roles) {
        if (ROLE_TO_SLUG[r]) { slug = ROLE_TO_SLUG[r]; break; }
      }
    }

    const path = serviceSlugToPath(slug) || "/login?error=forbidden";
    window.location.replace(path);
  }, []);

  if (!ready) return null; // rien tant que la garde n’a pas dit OK

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
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

/* ---------- sous-composants (inchangés) ---------- */

function KpiRow() {
  const items = [
    { label: "Admissions aujourd’hui", value: "128", icon: Activity, tone: "green" },
    { label: "Délai moyen d’attente", value: "18 min", icon: Clock3, tone: "yellow" },
    { label: "Incidents critiques", value: "0", icon: ShieldCheck, tone: "red" },
  ] as const;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="region" aria-label="Indicateurs clés">
      {items.map((k, i) => (
        <div key={k.label}
          className="transition-all duration-700 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
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
  const actions = useMemo(() => ([
    { href: "/patients",   label: "Rechercher un patient", desc: "Liste & fiches",       tone: "green" as const },
    { href: "/tarifs", label: "tarifs",    desc: "Mettre les montants",     tone: "green" as const },
    { href: "/laboratoire",label: "Demande d’analyse",     desc: "Ordre labo & suivi",   tone: "yellow" as const },
    { href: "/caisse",     label: "Émettre un reçu",       desc: "Facturer & encaisser", tone: "green" as const },
    { href: "/users",      label: "Gérer les utilisateurs",desc: "Comptes & rôles",      tone: "yellow" as const },
    { href: "/personnels", label: "Gérer les personnels",  desc: "RH & affectations",    tone: "green"  as const },
  ]), []);

  return (
    <section aria-labelledby="actions-rapides">
      <h3 id="actions-rapides" className="text-sm font-semibold text-ink-700 mb-3">Actions rapides</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href}
            className={"rounded-xl border bg-white p-4 shadow-sm hover:shadow focus:outline-none focus:ring-2 " +
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
  const tiles = SERVICE_TILES; // admin voit tout
  return (
    <section aria-labelledby="services">
      <div className="flex items-center justify-between">
        <h3 id="services" className="text-lg font-semibold">Services principaux</h3>
        <Link href="/portail/services" className="text-sm text-congo-green hover:underline inline-flex items-center gap-1">
          Tout voir <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((s) => (
          <Link key={s.slug} href={s.href}
            className="group relative rounded-2xl border border-ink-100 bg-white p-5 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-congo-green"
            aria-label={`Accéder au service ${s.label}`}>
            <span className="absolute inset-x-0 -top-px h-1 rounded-t-2xl bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
            <div className="text-ink-900 font-semibold group-hover:text-congo-green">{s.label}</div>
            <div className="text-sm text-ink-700">{s.desc}</div>
            <div className="mt-3 text-xs text-congo-green underline underline-offset-2">Entrer →</div>
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
      {items.map((n) => (
        <div key={n.title}
          className={"rounded-xl border bg-white p-4 shadow-sm " +
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
