"use client";

import Image from "next/image";
import { X, PackageCheck } from "lucide-react";
import type { Prod } from "@/lib/pharmacie_data";

type Props = {
  open: boolean;
  onClose: () => void;
  prod?: Prod | null;
};

export default function ProductModal({ open, onClose, prod }: Props) {
  if (!open || !prod) return null;
  const inStock = prod.stock > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-10 w-[92vw] max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-ink-100">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1 text-ink-600 hover:bg-ink-100"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="h-28 w-28 flex items-end justify-center rounded-lg bg-ink-50 ring-1 ring-ink-100">
            <Image src={prod.img} alt={prod.name} width={96} height={112} className="max-h-28 w-auto object-contain" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-ink-900">{prod.name}</h3>
            <div className="mt-1 text-xs text-ink-700">
              <div>Forme : <b>{prod.forme}</b></div>
              <div>Dosage : <b>{prod.dosage}</b></div>
              <div>Laboratoire : <b>{prod.labo}</b></div>
              <div>Stock : <b className={inStock ? "text-congo-green" : "text-congo-red"}>{prod.stock}</b></div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ring-1 ${inStock ? "bg-congo-greenL text-congo-green ring-congo-green/30" : "bg-congo-red/10 text-congo-red ring-congo-red/30"}`}>
            <PackageCheck className="h-3.5 w-3.5" />
            {inStock ? "Disponible" : "Rupture"}
          </span>

          <button
            disabled={!inStock}
            className={`rounded-lg px-3 py-2 text-xs font-semibold text-white ${inStock ? "bg-congo-green hover:bg-emerald-700" : "bg-ink-300 cursor-not-allowed"}`}
            onClick={() => alert("➡️ Déclencher la sortie de stock (à connecter à ton backend).")}
          >
            Sortie de stock
          </button>
        </div>
      </div>
    </div>
  );
}
