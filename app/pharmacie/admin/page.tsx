//app/pharmacie/admin/page.tsx
"use client";

import Link from "next/link";
import Guarded from "@/components/admin/Guarded";

export default function PharmaAdminHome() {
  return (
    <Guarded>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Pharmacie — Admin</h1>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/pharmacie/admin/dcis" className="rounded-lg border bg-white p-4 hover:shadow">
            <h3 className="font-semibold">DCI</h3>
            <p className="text-sm text-gray-600">Créer / modifier les DCI.</p>
          </Link>
          <Link href="/pharmacie/admin/articles" className="rounded-lg border bg-white p-4 hover:shadow">
            <h3 className="font-semibold">Articles</h3>
            <p className="text-sm text-gray-600">CRUD Articles + consultation stock.</p>
          </Link>
          <Link href="/pharmacie/admin/stock/in" className="rounded-lg border bg-white p-4 hover:shadow">
            <h3 className="font-semibold">Entrée stock (IN)</h3>
            <p className="text-sm text-gray-600">Réception de lots.</p>
          </Link>
          <Link href="/pharmacie/admin/stock/out" className="rounded-lg border bg-white p-4 hover:shadow">
            <h3 className="font-semibold">Sortie stock (OUT)</h3>
            <p className="text-sm text-gray-600">Vente / transfert / casse.</p>
          </Link>
        </div>
      </div>
    </Guarded>
  );
}
