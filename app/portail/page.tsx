// app/portail/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Activity, Clock3, ChevronRight } from "lucide-react";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

/** ----- Helpers session ----- **/
function getSessionUser() {
  try {
    const raw = sessionStorage.getItem("auth:user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function toNameSet(v: any): Set<string> {
  const arr = Array.isArray(v) ? v : [];
  return new Set(arr.map((x: any) => (typeof x === "string" ? x : x?.name)).filter(Boolean));
}
function hasAny(set: Set<string>, wanted: string[]) {
  for (const w of wanted) if (set.has(w)) return true;
  return false;
}

/** ----- Définition des services seedés + mapping permissions -> slug ----- **/
type Tile = { slug: string; label: string; desc: string; href: string; perms: string[] };

const SERVICE_TILES: Tile[] = [
  { slug: "accueil",          label: "Accueil / Réception",              desc: "Orientation & accueil",         href: "/accueil",          perms: ["patients.read","patients.write","visites.read","visites.write"] },
  { slug: "consultations",    label: "Consultations",                    desc: "Consultations médicales",       href: "/consultations",    perms: ["consultations.view","consultations.create","consultations.update"] },
  { slug: "medecine",         label: "Médecine Générale",                desc: "Consultations",                 href: "/medecine",         perms: ["medecine.view","medecine.create","medecine.update"] },
  { slug: "aru",              label: "Accueil & Urgences (ARU)",         desc: "Triage & urgences",             href: "/aru",              perms: ["aru.view","aru.create","aru.update"] },
  { slug: "laboratoire",      label: "Laboratoire",                       desc: "Analyses & résultats",          href: "/laboratoire",      perms: ["labo.view","labo.request.create","labo.result.write"] },
  { slug: "pharmacie",        label: "Pharmacie",                         desc: "Dispensation & stock",          href: "/pharmacie",        perms: ["pharma.stock.view","pharma.sale.create","pharma.ordonnance.validate"] },
  { slug: "finance",          label: "Caisse / Finance",                  desc: "Encaissement & reçus",          href: "/caisse",           perms: ["finance.invoice.view","finance.invoice.create","finance.payment.create"] },
  { slug: "logistique",       label: "Logistique",                        desc: "Ressources & équipements",      href: "/logistique",       perms: ["logistique.view","logistique.create","logistique.update"] },
  { slug: "pansement",        label: "Pansement",                         desc: "Soins locaux & suivi",          href: "/pansements",       perms: ["pansement.view","pansement.create","pansement.update","pansement.delete"] },
  { slug: "kinesitherapie",   label: "Kinésithérapie",                    desc: "Rééducation",                   href: "/kinesitherapie",   perms: ["kinesitherapie.view","kinesitherapie.create","kinesitherapie.update"] },
  { slug: "gestion-malade",   label: "Gestion des Malades",               desc: "Hospitalisation & lits",        href: "/gestion-malade",   perms: ["gestion-malade.view","gestion-malade.create","gestion-malade.update"] },
  { slug: "sanitaire",        label: "Programme Sanitaire",               desc: "VIH / Tuberculose",             href: "/sanitaire",        perms: ["sanitaire.view","sanitaire.create","sanitaire.update"] },
  { slug: "gynecologie",      label: "Gynécologie",                       desc: "Suivi & soins",                 href: "/gynecologie",      perms: ["gynecologie.view","gynecologie.create","gynecologie.update"] },
  { slug: "maternite",        label: "Maternité",                         desc: "Suivi & accouchements",         href: "/maternite",        perms: ["maternite.view","maternite.create","maternite.update"] },
  { slug: "pediatrie",        label: "Pédiatrie",                         desc: "Soins de l’enfant",             href: "/pediatrie",        perms: ["pediatrie.view","pediatrie.create","pediatrie.update"] },
  { slug: "smi",              label: "SMI (Santé Mère & Enfant)",         desc: "Suivi mère & enfant",           href: "/smi",              perms: ["smi.view","smi.create","smi.update"] },
  { slug: "bloc-operatoire",  label: "Bloc Opératoire",                   desc: "Actes & planning",              href: "/bloc-operatoire",  perms: ["bloc-operatoire.view","bloc-operatoire.create","bloc-operatoire.update"] },
  { slug: "statistiques",     label: "Statistiques / Dashboard",          desc: "Indicateurs clés",              href: "/statistiques",     perms: ["stats.view"] },
  { slug: "pourcentage",      label: "Répartition des Pourcentages",      desc: "Paramétrage & parts",           href: "/pourcentage",      perms: ["pourcentage.view","pourcentage.update"] },
  // Service "personnel" (seedé) -> on le montre surtout aux profils RH/admin
  { slug: "personnel",        label: "Gestion du Personnel",              desc: "Ressources humaines",           href: "/personnels",       perms: ["users.view","roles.view","roles.assign"] },
];

export default function PortailAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [perms, setPerms] = useState<Set<string>>(new Set());

  // Garde + rôle/permissions depuis la session (réponse /auth/login ou /auth/me)
  useEffect(() => {
    try {
      const token = sessionStorage.getItem("auth:token");
      if (!token) { window.location.replace("/login?next=/portail"); return; }
      const u = getSessionUser();
      if (u) {
        const roleSet = toNameSet(u.roles || u.role || []);
        const permSet = new Set<string>([
          ...toNameSet(u.permissions || u.perms || []),
          ...toNameSet(u.abilities || u.scopes || []), // certains back mettent tout ici
        ]);
        setPerms(permSet);
        setIsAdmin(roleSet.has("admin") || (Array.isArray(u.roles) && u.roles.some((r:any)=> (typeof r==="string"? r==="admin": r?.name==="admin"))));
      }
    } catch {
      window.location.replace("/login?next=/portail");
    }
  }, []);

  // Révélation au scroll
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
            <QuickActions isAdmin={isAdmin} perms={perms} />
            <ServicesGrid isAdmin={isAdmin} perms={perms} />
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

/* ---------- sous-composants (design inchangé) ---------- */

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

function QuickActions({ isAdmin, perms }: { isAdmin: boolean; perms: Set<string>; }) {
  const actions = useMemo(() => {
    if (isAdmin) {
      return [
        { href: "/patients",   label: "Rechercher un patient", desc: "Liste & fiches",       tone: "green" as const },
        { href: "/admissions", label: "Nouvelle admission",    desc: "Créer un dossier",     tone: "green" as const },
        { href: "/laboratoire",label: "Demande d’analyse",     desc: "Ordre labo & suivi",   tone: "yellow" as const },
        { href: "/caisse",     label: "Émettre un reçu",       desc: "Facturer & encaisser", tone: "green" as const },
        { href: "/users",      label: "Gérer les utilisateurs",desc: "Comptes & rôles",      tone: "yellow" as const },
        { href: "/personnels", label: "Gérer les personnels",  desc: "RH & affectations",    tone: "green"  as const },
      ];
    }
    const list: Array<{href:string;label:string;desc:string;tone:"green"|"yellow"}> = [];
    if (hasAny(perms, ["patients.read","patients.view"])) list.push({ href: "/patients", label: "Rechercher un patient", desc: "Liste & fiches", tone: "green" });
    if (hasAny(perms, ["patients.write","patients.create"])) list.push({ href: "/admissions", label: "Nouvelle admission", desc: "Créer un dossier", tone: "green" });
    if (hasAny(perms, ["labo.view","labo.request.create"])) list.push({ href: "/laboratoire", label: "Demande d’analyse", desc: "Ordre labo & suivi", tone: "yellow" });
    if (hasAny(perms, ["finance.invoice.create","finance.payment.create","finance.invoice.view"])) list.push({ href: "/caisse", label: "Émettre un reçu", desc: "Facturer & encaisser", tone: "green" });
    return list;
  }, [isAdmin, perms]);

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

function ServicesGrid({ isAdmin, perms }: { isAdmin: boolean; perms: Set<string>; }) {
  const tiles = useMemo(() => {
    if (isAdmin) return SERVICE_TILES;
    return SERVICE_TILES.filter(t => hasAny(perms, t.perms));
  }, [isAdmin, perms]);

  // Carreaux admin (hors ServiceSeeder) : Users / Personnels (admin-only)
  const adminTiles = isAdmin ? [
    { href: "/users",      label: "Utilisateurs", desc: "Comptes & rôles" },
    { href: "/personnels", label: "Personnels",   desc: "Ressources humaines" },
  ] : [];

  return (
    <section aria-labelledby="services">
      <div className="flex items-center justify-between">
        <h3 id="services" className="text-lg font-semibold">Services principaux</h3>
        <Link href="/portail/services" className="text-sm text-congo-green hover:underline inline-flex items-center gap-1">
          Tout voir <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((s, i) => (
          <Link key={s.slug} href={s.href} data-reveal style={{ transitionDelay: `${70 * i}ms` }}
            className="opacity-0 translate-y-2 transition-all duration-700 group relative rounded-2xl border border-ink-100 bg-white p-5 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-congo-green"
            aria-label={`Accéder au service ${s.label}`}>
            <span className="absolute inset-x-0 -top-px h-1 rounded-t-2xl bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
            <div className="text-ink-900 font-semibold group-hover:text-congo-green">{s.label}</div>
            <div className="text-sm text-ink-700">{s.desc}</div>
            <div className="mt-3 text-xs text-congo-green underline underline-offset-2">Entrer →</div>
          </Link>
        ))}

        {adminTiles.map((t, i) => (
          <Link key={t.href} href={t.href} data-reveal style={{ transitionDelay: `${70 * (i + tiles.length)}ms` }}
            className="opacity-0 translate-y-2 transition-all duration-700 group relative rounded-2xl border border-ink-100 bg-white p-5 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-congo-green"
            aria-label={`Accéder à ${t.label}`}>
            <span className="absolute inset-x-0 -top-px h-1 rounded-t-2xl bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
            <div className="text-ink-900 font-semibold group-hover:text-congo-green">{t.label}</div>
            <div className="text-sm text-ink-700">{t.desc}</div>
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
