"use client";

import Link from "next/link";
import { ClipboardList, Hospital, FileBadge, Baby } from "lucide-react";

export default function GestionMaladeHome() {
  const Card = ({
    href,
    title,
    desc,
    Icon,
  }: {
    href: string;
    title: string;
    desc: string;
    Icon: any;
  }) => (
    <Link
      href={href}
      className="group rounded-2xl border border-ink-100 bg-white p-6 shadow-sm 
                 transition-all duration-300 hover:-translate-y-1 hover:border-congo-green 
                 hover:shadow-lg hover:bg-congo-greenL/20"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-ink-50 p-3 group-hover:bg-congo-green/10 transition-colors">
          <Icon className="h-7 w-7 text-ink-700 group-hover:text-congo-green transition-colors" />
        </div>
        <div>
          <div className="text-base font-semibold group-hover:text-congo-green transition-colors">
            {title}
          </div>
          <div className="text-sm text-ink-600">{desc}</div>
        </div>
      </div>
    </Link>
  );

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
        <Card
          href="/gestion-malade/mouvements"
          title="Mouvements"
          desc="Admissions, transferts, hospitalisations, sorties"
          Icon={ClipboardList}
        />
        <Card
          href="/gestion-malade/hospitalisations"
          title="Hospitalisations"
          desc="Séjours, logistique et clinique"
          Icon={Hospital}
        />
        <Card
          href="/gestion-malade/billets-de-sortie"
          title="Billets de sortie"
          desc="Résumé clinique, consignes, destination"
          Icon={FileBadge}
        />
        <Card
          href="/gestion-malade/declarations-naissance"
          title="Déclarations de naissance"
          desc="Infos mère/bébé et état civil"
          Icon={Baby}
        />
      </div>
    </main>
  );
}
