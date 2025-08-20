// app/portail/page.tsx
"use client";

import { SuperuserGuard } from "@/components/guards";
import Link from "next/link";
import {
  Pill,
  TestTubes,
  Scan,          // pour l'échographie (imagerie)
  CreditCard,
  Stethoscope,
  Building2,
  Baby,
  Hospital,
} from "lucide-react";

// ✅ Liste des services — SANS radiologie
const services = [
  { id: "pharmacie",          name: "Pharmacie",           desc: "Dispensation & stock",              icon: Pill },
  { id: "laboratoire",        name: "Laboratoire",         desc: "Analyses & résultats",              icon: TestTubes },
  { id: "echographie",        name: "Échographie",         desc: "Imagerie ultrasonore",              icon: Scan },
  { id: "gynecologie",        name: "Gynécologie",         desc: "Suivi gynéco-obstétrical",          icon: Stethoscope },
  { id: "pediatrie",          name: "Pédiatrie",           desc: "Soins de l’enfant",                 icon: Baby },
  { id: "medecine-generale",  name: "Médecine générale",   desc: "Consultations & suivi",             icon: Hospital },
  { id: "consultations",      name: "Consultations",       desc: "Agenda & notes",                    icon: Stethoscope },
  { id: "admissions",         name: "Admissions",          desc: "Dossiers d’entrée",                 icon: Building2 },
  { id: "caisse",             name: "Caisse",              desc: "Encaissement & reçus",              icon: CreditCard },
];

export default function PortailPage() {
  return (
    <SuperuserGuard>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Portail — Accès superuser</h1>
            <Link href="/" className="text-sm underline hover:no-underline">Accueil</Link>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">
          <p className="text-slate-600 mb-4">
            Vous avez accès à l’ensemble des services. Choisissez un module :
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(({ id, name, desc, icon: Icon }) => (
              <Link
                key={id}
                href={`/${id}`}
                className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="text-lg font-semibold group-hover:text-emerald-700">{name}</div>
                    <div className="text-sm text-slate-600">{desc}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-emerald-700 underline underline-offset-2">
                  Ouvrir le service →
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </SuperuserGuard>
  );
}
