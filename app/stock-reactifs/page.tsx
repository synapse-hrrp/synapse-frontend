import Link from "next/link";
import { Boxes, Beaker, MapPin, Workflow } from "lucide-react";

export default function StockReactifsHome() {
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
          href="/stock-reactifs/operations"
          title="Opérations"
          desc="Sorties FEFO, transferts, historique"
          Icon={Workflow}
        />
        <Card
          href="/stock-reactifs/lots"
          title="Lots"
          desc="Gérer les lots de réactifs"
          Icon={Boxes}
        />
        <Card
          href="/stock-reactifs/reactifs"
          title="Réactifs"
          desc="CRUD des réactifs"
          Icon={Beaker}
        />
        <Card
          href="/stock-reactifs/locations"
          title="Locations"
          desc="CRUD des emplacements"
          Icon={MapPin}
        />
      </div>
    </main>
  );
}
