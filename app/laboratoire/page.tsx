"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ServiceGuard } from "@/components/guards";
import { Search, Filter, Eye, CheckCircle2, X, Calendar } from "lucide-react";

type Statut = "en_attente" | "en_cours" | "termine" | "invalide";
type ExamenType = "Biochimie" | "Hématologie" | "Sérologie" | "Microbiologie" | "PCR";
type Priorite = "standard" | "urgent";

type Motif = { examen: string; type: ExamenType; priorite?: Priorite; notes?: string };

type Demande = {
  id: string;
  patient: string;
  nid?: string;
  date: string;
  statut: Statut;
  motifs: Motif[];
};

const DEMANDES_INIT: Demande[] = [
  { id: "LAB-000421", patient: "NGOMA A.", nid: "CG-001-22", date: "2025-08-14T09:12:00Z", statut: "termine", motifs: [{ examen: "Glycémie à jeun", type: "Biochimie" }] },
  { id: "LAB-000422", patient: "MBOUMBA J.", nid: "CG-002-45", date: "2025-08-16T08:40:00Z", statut: "en_cours", motifs: [{ examen: "NFS", type: "Hématologie", priorite: "urgent" }] },
  { id: "LAB-000423", patient: "BIYAKALA M.", nid: "CG-199-11", date: "2025-08-15T14:05:00Z", statut: "en_attente", motifs: [{ examen: "CRP", type: "Sérologie" }] },
];

function Badge({ statut }: { statut: Statut }) {
  const map: Record<Statut, { label: string; cls: string }> = {
    en_attente: { label: "En attente", cls: "bg-amber-50 text-amber-700 border-amber-200 font-bold" },
    en_cours: { label: "En cours", cls: "bg-sky-50 text-sky-700 border-sky-200 font-bold" },
    termine: { label: "Terminé", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold" },
    invalide: { label: "Invalidé", cls: "bg-rose-50 text-rose-700 border-rose-200 font-bold" },
  };
  const s = map[statut];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>;
}

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

export default function Page() {
  const [demandes, setDemandes] = useState<Demande[]>(DEMANDES_INIT);
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<"" | Statut>("");
  const [type, setType] = useState<"" | ExamenType>("");
  const [periode, setPeriode] = useState<"" | "jour" | "semaine" | "mois">("");
  const [detail, setDetail] = useState<Demande | null>(null);

  const types: ExamenType[] = ["Biochimie", "Hématologie", "Sérologie", "Microbiologie", "PCR"];

  const list = useMemo(() => {
    let l = [...demandes];
    const s = q.trim().toLowerCase();

    if (s) {
      l = l.filter((d) =>
        d.id.toLowerCase().includes(s) ||
        d.patient.toLowerCase().includes(s) ||
        (d.nid?.toLowerCase().includes(s) ?? false) ||
        d.motifs.some((m) => m.examen.toLowerCase().includes(s) || m.type.toLowerCase().includes(s))
      );
    }

    if (statut) l = l.filter((d) => d.statut === statut);
    if (type) l = l.filter((d) => d.motifs.some((m) => m.type === type));

    if (periode) {
      const now = new Date();
      const dd0 = (d: Demande) => new Date(d.date);
      if (periode === "jour") {
        const y = now.getFullYear(), m = now.getMonth(), da = now.getDate();
        const start = new Date(y, m, da, 0, 0, 0, 0);
        const end = new Date(y, m, da + 1, 0, 0, 0, 0);
        l = l.filter((d) => dd0(d) >= start && dd0(d) < end);
      } else if (periode === "semaine") {
        const day = (now.getDay() + 6) % 7;
        const monday = new Date(now);
        monday.setHours(0, 0, 0, 0);
        monday.setDate(now.getDate() - day);
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        l = l.filter((d) => dd0(d) >= monday && dd0(d) < nextMonday);
      } else if (periode === "mois") {
        const y = now.getFullYear(), m = now.getMonth();
        const start = new Date(y, m, 1, 0, 0, 0, 0);
        const end = new Date(y, m + 1, 1, 0, 0, 0, 0);
        l = l.filter((d) => dd0(d) >= start && dd0(d) < end);
      }
    }

    l.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return l;
  }, [demandes, q, statut, type, periode]);

  function terminer(id: string) {
    setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, statut: "termine" } : d)));
    setDetail((prev) => (prev && prev.id === id ? { ...prev, statut: "termine" } : prev));
  }

  function updateDetailStatut(newStatut: Statut) {
    if (!detail) return;
    setDemandes((prev) => prev.map((d) => (d.id === detail.id ? { ...d, statut: newStatut } : d)));
    setDetail({ ...detail, statut: newStatut });
  }

  return (
    <ServiceGuard service="laboratoire">
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col md:flex-row md:items-center md:gap-3 gap-2">
            <div className="text-lg font-bold">Laboratoire</div>
            <div className="ml-auto grid w-full max-w-4xl grid-cols-1 md:grid-cols-4 gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher (ID, patient, examen)"
                  className="w-full rounded-xl border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 font-bold"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select
                  value={statut}
                  onChange={(e) => setStatut(e.target.value as Statut | "")}
                  className="w-full appearance-none rounded-xl border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 font-bold"
                >
                  <option value="">Tous les statuts</option>
                  <option value="en_attente">En attente</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminé</option>
                  <option value="invalide">Invalidé</option>
                </select>
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ExamenType | "")}
                  className="w-full appearance-none rounded-xl border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 font-bold"
                >
                  <option value="">Tous les types</option>
                  {types.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value as "" | "jour" | "semaine" | "mois")}
                  className="w-full appearance-none rounded-xl border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 font-bold"
                >
                  <option value="">Toutes périodes</option>
                  <option value="jour">Aujourd'hui</option>
                  <option value="semaine">Cette semaine</option>
                  <option value="mois">Ce mois</option>
                </select>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="px-4 py-3 text-left">Demande</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Motif</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => {
                  const first = d.motifs[0];
                  const more = d.motifs.length - 1;
                  return (
                    <tr key={d.id} className="border-t last:border-b-0">
                      <td className="px-4 py-3 font-bold">{d.id}</td>
                      <td className="px-4 py-3 font-bold">
                        {d.patient}
                        <div className="text-xs text-slate-500 font-normal">{d.nid}</div>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {first?.examen}
                        <div className="text-xs text-slate-500 font-normal">{first?.type}{more > 0 ? ` • +${more}` : ""}</div>
                      </td>
                      <td className="px-4 py-3 font-bold">{new Date(d.date).toLocaleString()}</td>
                      <td className="px-4 py-3"><Badge statut={d.statut} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setDetail(d)} className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 hover:bg-slate-50 font-bold">
                            <Eye className="h-4 w-4" /> Détails
                          </button>
                          <button type="button" onClick={() => terminer(d.id)} disabled={d.statut !== "en_cours"} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-white hover:bg-emerald-500 disabled:opacity-50 font-bold">
                            <CheckCircle2 className="h-4 w-4" /> Terminer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500 font-bold">Aucune demande.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-sm text-slate-600 font-bold">{list.length} demande{list.length > 1 ? "s" : ""} affichée{list.length > 1 ? "s" : ""}.</div>
        </main>
      </div>

      <Modal open={!!detail} title={detail ? `Détails — ${detail.id}` : "Détails"} onClose={() => setDetail(null)}>
        {detail && (
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase text-slate-500 font-bold">Patient</div>
                <div className="font-bold">{detail.patient}</div>
                <div className="text-xs text-slate-500">{detail.nid || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 font-bold">Statut</div>
                <select
                  value={detail.statut}
                  onChange={(e) => updateDetailStatut(e.target.value as Statut)}
                  className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-200 font-bold"
                >
                  <option value="en_attente">En attente</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminé</option>
                  <option value="invalide">Invalidé</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-700 font-bold">
                  <tr>
                    <th className="px-3 py-2 text-left">Motif</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Priorité</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.motifs.map((m, i) => (
                    <tr key={`${detail.id}-${i}`} className="border-t">
                      <td className="px-3 py-2 font-bold">{m.examen}</td>
                      <td className="px-3 py-2 font-bold">{m.type}</td>
                      <td className="px-3 py-2 font-bold">{m.priorite === "urgent" ? "Urgent" : "Standard"}</td>
                      <td className="px-3 py-2 font-bold">{m.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </ServiceGuard>
  );
}
