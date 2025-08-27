// app/laboratoire/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FlaskConical, Beaker, TestTube2, Plus, Printer, Filter,
  CheckCircle2, AlertTriangle, AlertCircle, Search, Clock4, Eye
} from "lucide-react";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type Status = "recu" | "en_cours" | "critique" | "termine";

type Row = {
  id: string;
  patient: string;
  age: string;
  examen: string;
  service: string;
  priorite: "standard" | "urgent";
  statut: Status;
  recu: string;
};

const MOCK: Row[] = [
  { id: "LAB-000872", patient: "MABIALA Clarisse", age: "32", examen: "Hémogramme complet", service: "Urgences",   priorite: "urgent",   statut: "en_cours", recu: "08:45" },
  { id: "LAB-000873", patient: "OKOMBA Daniel",     age: "54", examen: "Bilan rénal",         service: "Médecine",  priorite: "standard", statut: "recu",     recu: "09:10" },
  { id: "LAB-000874", patient: "NGOMA Prisca",      age: "7",  examen: "CRP",                 service: "Pédiatrie", priorite: "urgent",   statut: "critique", recu: "09:18" },
  { id: "LAB-000875", patient: "ELENGA Mireille",   age: "41", examen: "Glycémie à jeun",     service: "Médecine",  priorite: "standard", statut: "termine",  recu: "08:10" },
  { id: "LAB-000876", patient: "BOKAMBA R.",        age: "66", examen: "Bilan hépatique",     service: "Médecine",  priorite: "standard", statut: "en_cours", recu: "09:30" },
];

export default function LaboratoirePage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "tous">("tous");
  const [prio, setPrio] = useState<"toutes" | "standard" | "urgent">("toutes");

  const data = useMemo(() => {
    return MOCK.filter(r => {
      const matchQ =
        q.trim().length === 0 ||
        [r.id, r.patient, r.examen, r.service].some(s =>
          s.toLowerCase().includes(q.toLowerCase())
        );
      const matchS = status === "tous" ? true : r.statut === status;
      const matchP = prio === "toutes" ? true : r.priorite === prio;
      return matchQ && matchS && matchP;
    });
  }, [q, status, prio]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />

      <SiteHeader
        title="Laboratoire"
        subtitle="Analyses & Résultats — Hôpital de Référence Raymond Pouaty"
        logoSrc="/logos/laboratoire.png"         // place ce logo dans /public/logos/
        avatarSrc="/Tili.jpg"                  // ton avatar si tu veux
        showSearch={false}
        rightSlot={
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/laboratoire/nouvelle-demande"
              className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Nouvelle demande
            </Link>
            <button className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-100">
              <Printer className="h-4 w-4" /> Étiquettes
            </button>
          </div>
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Fil d’Ariane */}
        <nav aria-label="breadcrumb" className="text-sm text-ink-500">
          <ol className="flex items-center gap-2">
            <li><Link className="hover:underline" href="/portail">Portail</Link></li>
            <li aria-hidden>/</li>
            <li className="text-ink-700 font-medium">Laboratoire</li>
          </ol>
        </nav>

        {/* KPIs */}
        <KpiRow />

        {/* Barre d’outils */}
        <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <FlaskConical className="h-4 w-4 text-congo-green" />
              <span className="font-medium">File d’attente</span>
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs">{data.length} examens</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Recherche */}
              <label className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher (ID, patient, examen, service)…"
                  className="w-full rounded-lg border border-ink-200 bg-white pl-10 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
                />
              </label>

              {/* Statut */}
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
              >
                <option value="tous">Tous les statuts</option>
                <option value="recu">Reçus</option>
                <option value="en_cours">En cours</option>
                <option value="critique">Critiques</option>
                <option value="termine">Terminés</option>
              </select>

              {/* Priorité */}
              <select
                value={prio}
                onChange={e => setPrio(e.target.value as any)}
                className="rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
              >
                <option value="toutes">Toutes priorités</option>
                <option value="urgent">Urgent</option>
                <option value="standard">Standard</option>
              </select>

              <button className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm hover:bg-ink-100">
                <Filter className="h-4 w-4" /> Filtres avancés
              </button>
            </div>
          </div>
        </section>

        {/* Table des examens */}
        <section className="rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-ink-50/60 backdrop-blur">
                <tr className="text-left text-ink-600">
                  <Th>ID</Th>
                  <Th>Patient</Th>
                  <Th>Âge</Th>
                  <Th>Examen</Th>
                  <Th>Service</Th>
                  <Th>Prio</Th>
                  <Th>Statut</Th>
                  <Th>Reçu</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/40">
                    <Td><Link href={`/laboratoire/dossier/${r.id}`} className="font-medium text-ink-900 hover:underline">{r.id}</Link></Td>
                    <Td>{r.patient}</Td>
                    <Td>{r.age}</Td>
                    <Td>{r.examen}</Td>
                    <Td>{r.service}</Td>
                    <Td>
                      <span className={badgePrio(r.priorite)}>{r.priorite === "urgent" ? "Urgent" : "Standard"}</span>
                    </Td>
                    <Td>
                      <StatusPill s={r.statut} />
                    </Td>
                    <Td className="tabular-nums">{r.recu}</Td>
                    <Td align="right">
                      <Link
                        href={`/laboratoire/dossier/${r.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs hover:bg-ink-100"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ouvrir
                      </Link>
                    </Td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-ink-500">
                      Aucun examen ne correspond aux filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination simple (mock) */}
          <div className="flex items-center justify-between p-3 text-xs text-ink-600">
            <span>Affichage de {data.length} élément(s)</span>
            <div className="flex items-center gap-2">
              <button className="rounded border border-ink-200 px-2 py-1 hover:bg-ink-100">Précédent</button>
              <button className="rounded border border-ink-200 px-2 py-1 hover:bg-ink-100">Suivant</button>
            </div>
          </div>
        </section>

        {/* Colonne systèmes/qualité */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <InstrumentsCard />
          <QualiteCard />
          <InfosCard />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/* ----------------------- Sous-composants UI ----------------------- */

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-3 py-2 text-[12px] uppercase tracking-wide ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"}`}>{children}</td>;
}

function StatusPill({ s }: { s: Status }) {
  if (s === "recu") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700">
      <Beaker className="h-3.5 w-3.5" /> Reçu
    </span>;
  }
  if (s === "en_cours") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-congo-yellow/15 px-2 py-0.5 text-[11px] text-congo-yellow ring-1 ring-congo-yellow/30">
      <Clock4 className="h-3.5 w-3.5" /> En cours
    </span>;
  }
  if (s === "critique") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-congo-red)]/10 px-2 py-0.5 text-[11px] text-congo-red ring-1 ring-congo-red/30">
      <AlertTriangle className="h-3.5 w-3.5" /> Critique
    </span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-congo-greenL px-2 py-0.5 text-[11px] text-congo-green ring-1 ring-congo-green/20">
    <CheckCircle2 className="h-3.5 w-3.5" /> Terminé
  </span>;
}

function badgePrio(p: Row["priorite"]) {
  return p === "urgent"
    ? "inline-flex items-center gap-1 rounded-full bg-[color:var(--color-congo-red)]/10 px-2 py-0.5 text-[11px] text-congo-red ring-1 ring-congo-red/30"
    : "inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700";
}

function KpiRow() {
  const KPIS = [
    { label: "Reçus", value: 42, tone: "ink", icon: Beaker },
    { label: "En cours", value: 18, tone: "yellow", icon: TestTube2 },
    { label: "Critiques", value: 1, tone: "red", icon: AlertCircle },
    { label: "Terminés (24h)", value: 76, tone: "green", icon: CheckCircle2 },
  ] as const;

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {KPIS.map((k, i) => (
        <div
          key={k.label}
          style={{ transitionDelay: `${60 * i}ms` }}
          className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div
              className={
                "h-10 w-10 rounded-xl flex items-center justify-center " +
                (k.tone === "green"
                  ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/20"
                  : k.tone === "yellow"
                  ? "bg-[color:var(--color-congo-yellow)]/10 text-congo-yellow ring-1 ring-congo-yellow/20"
                  : k.tone === "red"
                  ? "bg-[color:var(--color-congo-red)]/10 text-congo-red ring-1 ring-congo-red/20"
                  : "bg-ink-100 text-ink-700 ring-1 ring-ink-200")
              }
            >
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

function InstrumentsCard() {
  const items = [
    { name: "Hématologie — Sysmex", state: "OK", tone: "green" },
    { name: "Biochimie — Cobas",    state: "OK", tone: "green" },
    { name: "Immuno — Architect",   state: "Alerte", tone: "yellow" },
  ] as const;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-ink-800 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-congo-green" /> Instruments
      </h3>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.name} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
            <span className="text-ink-700">{i.name}</span>
            <span className={
              "text-xs rounded-full px-2 py-0.5 " +
              (i.tone === "green"
                ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/20"
                : "bg-[color:var(--color-congo-yellow)]/15 text-congo-yellow ring-1 ring-congo-yellow/30")
            }>
              {i.state}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QualiteCard() {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-ink-800">Qualité & Contrôles</h3>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-congo-green mt-0.5" />
          <span>Contrôle interne hématologie conforme (CV &lt; 3%).</span>
        </li>
        <li className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-congo-yellow mt-0.5" />
          <span>Biochimie : dérive légère sur ALAT — recalibrage planifié 14:00.</span>
        </li>
        <li className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-congo-red mt-0.5" />
          <span>CRP : seuil critique signalé — protocole d’alerte activé.</span>
        </li>
      </ul>
    </div>
  );
}

function InfosCard() {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-ink-800">Informations</h3>
      <p className="mt-2 text-sm text-ink-700">
        Les résultats validés sont disponibles pour impression et export. Les demandes urgentes sont priorisées automatiquement.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-ink-100 px-2 py-0.5">#biochimie</span>
        <span className="rounded-full bg-ink-100 px-2 py-0.5">#hémato</span>
        <span className="rounded-full bg-ink-100 px-2 py-0.5">#immuno</span>
        <span className="rounded-full bg-ink-100 px-2 py-0.5">#urgence</span>
      </div>
    </div>
  );
}
