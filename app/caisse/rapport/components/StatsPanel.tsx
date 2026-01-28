"use client";

import { useEffect, useMemo, useState } from "react";
import { cashSummary, cashTopOverview } from "@/lib/api/caisse";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

type SummaryRes = {
  meta: { period: string; date_from: string; date_to: string };
  kpis: { total_amount: number; payments: number; avg_ticket: number };
  series: Array<{ bucket: string; payments: number; total_amount: number }>;
  groups?: any;
};

type OverviewRes = {
  data?: {
    services?: Array<{ id: any; label: string; payments: number; total_amount: number }>;
    cashiers?: Array<{ id: any; label: string; payments: number; total_amount: number }>;
  };
};

function formatBucket(b: string) {
  if (!b) return "—";
  return b.replace(":00:00", "").replace(" ", " • ");
}
function toYmd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function n(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

type PeriodUI = "day" | "week" | "month" | "quarter" | "year" | "custom";

function startOfQuarter(year: number, quarter: 1 | 2 | 3 | 4) {
  const month = (quarter - 1) * 3; // 0,3,6,9
  return new Date(year, month, 1);
}
function endOfQuarter(year: number, quarter: 1 | 2 | 3 | 4) {
  const start = startOfQuarter(year, quarter);
  return new Date(start.getFullYear(), start.getMonth() + 3, 0); // dernier jour du trimestre
}
function startOfYear(year: number) {
  return new Date(year, 0, 1);
}
function endOfYear(year: number) {
  return new Date(year, 11, 31);
}
function quarterLabel(year: number, q: 1 | 2 | 3 | 4) {
  return `T${q} ${year}`;
}
function prevQuarterOf(year: number, q: 1 | 2 | 3 | 4): { year: number; q: 1 | 2 | 3 | 4 } {
  if (q === 1) return { year: year - 1, q: 4 };
  return { year, q: (q - 1) as 1 | 2 | 3 | 4 };
}

export default function StatsPanel() {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentQuarter = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;

  // ✅ DG default: trimestre en cours
  const [period, setPeriod] = useState<PeriodUI>("quarter");

  // selects DG
  const [year, setYear] = useState<number>(currentYear);
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(currentQuarter);

  // ✅ comparer au trimestre précédent
  const [comparePrevQuarter, setComparePrevQuarter] = useState<boolean>(true);

  // custom dates
  const [dateFrom, setDateFrom] = useState<string>(() => toYmd(startOfQuarter(currentYear, currentQuarter)));
  const [dateTo, setDateTo] = useState<string>(() => toYmd(endOfQuarter(currentYear, currentQuarter)));

  // main
  const [summary, setSummary] = useState<SummaryRes | null>(null);
  const [overview, setOverview] = useState<OverviewRes | null>(null);

  // compare
  const [summaryPrev, setSummaryPrev] = useState<SummaryRes | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // années disponibles
  const years = useMemo(() => {
    const min = 2020;
    const max = currentYear + 1;
    const arr: number[] = [];
    for (let y = max; y >= min; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  // Auto-window quand on change period/year/quarter
  useEffect(() => {
    const dNow = new Date();

    if (period === "day") {
      setDateFrom(toYmd(dNow));
      setDateTo(toYmd(dNow));
    } else if (period === "week") {
      const from = new Date(dNow);
      from.setDate(dNow.getDate() - 7);
      setDateFrom(toYmd(from));
      setDateTo(toYmd(dNow));
    } else if (period === "month") {
      const from = new Date(dNow);
      from.setDate(dNow.getDate() - 30);
      setDateFrom(toYmd(from));
      setDateTo(toYmd(dNow));
    } else if (period === "quarter") {
      const from = startOfQuarter(year, quarter);
      const to = endOfQuarter(year, quarter);
      setDateFrom(toYmd(from));
      setDateTo(toYmd(to));
    } else if (period === "year") {
      const from = startOfYear(year);
      const to = endOfYear(year);
      setDateFrom(toYmd(from));
      setDateTo(toYmd(to));
    }
    // custom: laisse l’utilisateur choisir
  }, [period, year, quarter]);

  // Fetch main + optional compare
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");

    const df = dateFrom;
    const dt = dateTo;

    const needCompare = period === "quarter" && comparePrevQuarter;

    const prev = needCompare ? prevQuarterOf(year, quarter) : null;
    const prevFrom = prev ? toYmd(startOfQuarter(prev.year, prev.q)) : null;
    const prevTo = prev ? toYmd(endOfQuarter(prev.year, prev.q)) : null;

    const mainReq = cashSummary({
      period: "range",
      date_from: df,
      date_to: dt,
      group_by: ["service", "mode", "cashier"],
    });

    const topReq = cashTopOverview({ period: "range", date_from: df, date_to: dt } as any);

    const prevReq = needCompare
      ? cashSummary({
          period: "range",
          date_from: prevFrom!,
          date_to: prevTo!,
          group_by: [], // inutile pour la comparaison, ça réduit la charge
        })
      : Promise.resolve(null);

    Promise.all([mainReq, topReq, prevReq])
      .then(([a, b, c]: any[]) => {
        if (!alive) return;
        setSummary(a ?? null);
        setOverview(b ?? null);
        setSummaryPrev(c ?? null);
      })
      .catch((e: any) => {
        if (!alive) return;
        setSummary(null);
        setOverview(null);
        setSummaryPrev(null);
        setErr(e?.message || "Erreur chargement statistiques");
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [dateFrom, dateTo, period, comparePrevQuarter, year, quarter]);

  // series main + prev fusionnées (par bucket string)
  const series = useMemo(() => {
    const main = summary?.series ?? [];
    const prev = summaryPrev?.series ?? [];

    // normalise
    const mainMap = new Map<string, { total_amount: number; payments: number }>();
    main.forEach((r) => {
      const key = formatBucket(String(r.bucket ?? ""));
      mainMap.set(key, { total_amount: n(r.total_amount, 0), payments: n(r.payments, 0) });
    });

    const prevMap = new Map<string, { total_amount: number; payments: number }>();
    prev.forEach((r) => {
      const key = formatBucket(String(r.bucket ?? ""));
      prevMap.set(key, { total_amount: n(r.total_amount, 0), payments: n(r.payments, 0) });
    });

    // buckets = union
    const buckets = Array.from(new Set([...mainMap.keys(), ...prevMap.keys()]));

    // tri simple: on essaie de trier par date si format "YYYY-MM-DD" / "YYYY-MM-DD • HH:MM"
    buckets.sort((a, b) => {
      const pa = Date.parse(a.replace(" • ", "T"));
      const pb = Date.parse(b.replace(" • ", "T"));
      if (Number.isFinite(pa) && Number.isFinite(pb)) return pa - pb;
      return a.localeCompare(b);
    });

    return buckets.map((bucket) => ({
      bucket,
      total_amount: mainMap.get(bucket)?.total_amount ?? 0,
      payments: mainMap.get(bucket)?.payments ?? 0,
      total_amount_prev: prevMap.get(bucket)?.total_amount ?? 0,
      payments_prev: prevMap.get(bucket)?.payments ?? 0,
    }));
  }, [summary, summaryPrev]);

  if (loading) return <div className="text-sm text-slate-600">Chargement…</div>;
  if (err) return <div className="text-sm text-red-600">HTTP erreur: {err}</div>;
  if (!summary) return <div className="text-sm text-slate-600">Aucune donnée.</div>;

  const services = overview?.data?.services ?? [];
  const cashiers = overview?.data?.cashiers ?? [];

  const hasSeries =
    series.length > 0 && series.some((x) => x.total_amount > 0 || x.payments > 0 || x.total_amount_prev > 0 || x.payments_prev > 0);

  const isQuarterCompare = period === "quarter" && comparePrevQuarter && !!summaryPrev;

  const mainK = summary.kpis ?? { total_amount: 0, payments: 0, avg_ticket: 0 };
  const prevK = summaryPrev?.kpis ?? { total_amount: 0, payments: 0, avg_ticket: 0 };

  const deltaAmount = n(mainK.total_amount) - n(prevK.total_amount);
  const deltaPayments = n(mainK.payments) - n(prevK.payments);
  const deltaAvg = n(mainK.avg_ticket) - n(prevK.avg_ticket);

  const prevMetaLabel = (() => {
    if (!isQuarterCompare) return "";
    const p = prevQuarterOf(year, quarter);
    return quarterLabel(p.year, p.q);
  })();

  const currentMetaLabel = period === "quarter" ? quarterLabel(year, quarter) : "";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="rounded-xl bg-white border shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">Période :</span>

          <Pill active={period === "day"} onClick={() => setPeriod("day")}>Aujourd’hui</Pill>
          <Pill active={period === "week"} onClick={() => setPeriod("week")}>7 derniers jours</Pill>
          <Pill active={period === "month"} onClick={() => setPeriod("month")}>30 derniers jours</Pill>
          <Pill active={period === "quarter"} onClick={() => setPeriod("quarter")}>Trimestre</Pill>
          <Pill active={period === "year"} onClick={() => setPeriod("year")}>Année</Pill>
          <Pill active={period === "custom"} onClick={() => setPeriod("custom")}>Personnalisé</Pill>

          <div className="ml-auto text-xs text-slate-500">
            Fenêtre : {summary.meta?.date_from} → {summary.meta?.date_to}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Année</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Trimestre</label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value) as any)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
              disabled={period !== "quarter"}
              title={period !== "quarter" ? "Passe en mode Trimestre pour activer" : ""}
            >
              <option value={1}>T1 (Jan–Mar)</option>
              <option value={2}>T2 (Avr–Juin)</option>
              <option value={3}>T3 (Juil–Sep)</option>
              <option value={4}>T4 (Oct–Déc)</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setPeriod("custom");
                setDateFrom(e.target.value);
              }}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setPeriod("custom");
                setDateTo(e.target.value);
              }}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {/* ✅ Compare toggle visible uniquement en trimestre */}
          {period === "quarter" && (
            <div className="md:col-span-12 flex items-center gap-2 pt-2">
              <input
                id="comparePrev"
                type="checkbox"
                checked={comparePrevQuarter}
                onChange={(e) => setComparePrevQuarter(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="comparePrev" className="text-sm text-slate-700">
                Comparer au trimestre précédent
                <span className="text-xs text-slate-500"> (courbe 2 + Δ KPIs)</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi label="Total encaissé" value={`${n(mainK.total_amount).toLocaleString()} XAF`} />
        <Kpi label="Paiements" value={n(mainK.payments)} />
        <Kpi label="Ticket moyen" value={`${n(mainK.avg_ticket).toLocaleString()} XAF`} />
      </div>

      {/* Δ KPIs si compare */}
      {isQuarterCompare && (
        <div className="rounded-xl bg-white border shadow-sm p-4">
          <div className="text-sm font-semibold text-slate-800 mb-2">
            Comparaison : {currentMetaLabel} vs {prevMetaLabel}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <DeltaCard
              label={`Δ Total (XAF)`}
              value={deltaAmount}
              hint={`Avant: ${n(prevK.total_amount).toLocaleString()} XAF`}
            />
            <DeltaCard
              label={`Δ Paiements`}
              value={deltaPayments}
              hint={`Avant: ${n(prevK.payments)}`}
            />
            <DeltaCard
              label={`Δ Ticket moyen`}
              value={deltaAvg}
              hint={`Avant: ${n(prevK.avg_ticket).toLocaleString()} XAF`}
            />
          </div>
        </div>
      )}

      {/* Line chart */}
      <div className="rounded-xl bg-white border shadow-sm p-4">
        <div className="text-sm font-semibold text-slate-800 mb-2">
          Courbe : Total encaissé {isQuarterCompare ? "(comparaison)" : ""}
        </div>

        {!hasSeries ? (
          <div className="h-72 flex items-center justify-center text-sm text-slate-500">
            Aucune donnée sur cette période.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                {/* courbe période courante */}
                <Line type="monotone" dataKey="total_amount" strokeWidth={2} dot={false} />
                {/* courbe trimestre précédent */}
                {isQuarterCompare && (
                  <Line type="monotone" dataKey="total_amount_prev" strokeWidth={2} dot={false} strokeDasharray="6 4" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {isQuarterCompare && (
          <div className="mt-2 text-xs text-slate-500">
            Courbe pleine = {currentMetaLabel} • Courbe pointillée = {prevMetaLabel}
          </div>
        )}
      </div>

      {/* Tops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopCard title="Top services" rows={services} />
        <TopCard title="Top caissiers" rows={cashiers} />
      </div>

      {!!services.length && (
        <div className="rounded-xl bg-white border shadow-sm p-4">
          <div className="text-sm font-semibold text-slate-800 mb-2">
            Répartition : Top services (montant)
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={services.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total_amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl bg-white border p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function DeltaCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);

  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold">
        {sign}{abs.toLocaleString()}
      </div>
      {hint ? <div className="text-xs text-slate-500 mt-1">{hint}</div> : null}
    </div>
  );
}

function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
        active
          ? "bg-congo-green/10 border-congo-green/30 text-congo-green"
          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function TopCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; payments: number; total_amount: number }>;
}) {
  return (
    <div className="rounded-xl bg-white border shadow-sm">
      <div className="p-4 border-b">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
      </div>
      <div className="p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-600">
            <tr>
              <th className="text-left pb-2">Nom</th>
              <th className="text-right pb-2">Paiements</th>
              <th className="text-right pb-2">Montant</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((r, idx) => (
              <tr key={idx} className="border-t">
                <td className="py-2">{r.label}</td>
                <td className="py-2 text-right">{n(r.payments)}</td>
                <td className="py-2 text-right">{n(r.total_amount).toLocaleString()} XAF</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-3 text-slate-500" colSpan={3}>
                  Aucun résultat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
