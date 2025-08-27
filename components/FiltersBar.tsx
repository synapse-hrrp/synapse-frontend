"use client";

import { Search } from "lucide-react";

type Props = {
  q: string; setQ: (v: string) => void;
  forme: string; setForme: (v: string) => void;
  labo: string; setLabo: (v: string) => void;
  stock: string; setStock: (v: string) => void; // "all" | "in" | "out" | "low"
  formes: string[];
  labos: string[];
};

export default function FiltersBar({
  q, setQ, forme, setForme, labo, setLabo, stock, setStock, formes, labos
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white p-3 rounded-xl ring-1 ring-ink-100 shadow-sm">
      {/* Recherche */}
      <label className="relative col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher produit…"
          className="w-full rounded-lg border border-ink-200 bg-white pl-10 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
        />
      </label>

      {/* Forme */}
      <select
        value={forme} onChange={(e) => setForme(e.target.value)}
        className="rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
      >
        <option value="">Toutes formes</option>
        {formes.map(f => <option key={f} value={f}>{f}</option>)}
      </select>

      {/* Labo */}
      <select
        value={labo} onChange={(e) => setLabo(e.target.value)}
        className="rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
      >
        <option value="">Tous labos</option>
        {labos.map(l => <option key={l} value={l}>{l}</option>)}
      </select>

      {/* Stock */}
      <select
        value={stock} onChange={(e) => setStock(e.target.value)}
        className="rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20"
      >
        <option value="all">Stock: tous</option>
        <option value="in">En stock</option>
        <option value="low">Stock faible (&lt;= 10)</option>
        <option value="out">Rupture</option>
      </select>
    </div>
  );
}
