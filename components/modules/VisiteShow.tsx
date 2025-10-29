"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, Trash2, User, Building2, Stethoscope,
  FileText, WalletMinimal, Shield, Receipt, Clock, Info
} from "lucide-react";
import { getVisite, deleteVisite } from "@/lib/api";
import { useAuthz } from "@/lib/authz";

type PrixBlock = {
  tarif_id?: string | null;
  tarif?: { code?: string|null; libelle?: string|null; montant?: number; devise?: string|null } | null;
  montant_prevu?: number;
  montant_du?: number;
  devise?: string | null;
};

type MiniAgent = {
  id?: number|null;
  nom?: string|null;
  name?: string|null;
  personnel?: { full_name?: string|null } | null;
};

type VisiteDTO = {
  id: string | number;

  patient?: {
    id: string;
    numero_dossier?: string|null;
    nom?: string|null;
    prenom?: string|null;
    age?: number|null;
    sexe?: string|null;
  } | null;

  service?: { id?: number; slug?: string|null; name?: string|null } | null;

  medecin?: { id?: number|null; nom?: string|null } | null;
  agent?:   MiniAgent | null;

  medecin_id?: number|null;
  medecin_nom?: string|null;
  agent_id?: number|null;
  agent_nom?: string|null;

  // quelques APIs renvoient aussi ceci :
  created_by?: MiniAgent | null;
  user?: MiniAgent | null;
  created_by_name?: string | null;

  heure_arrivee?: string|null;
  plaintes_motif?: string|null;
  hypothese_diagnostic?: string|null;
  affectation_id?: string|null;

  statut?: "EN_ATTENTE"|"A_ENCAISSER"|"PAYEE"|"CLOTUREE";
  clos_at?: string|null;

  prix?: PrixBlock;

  facture_numero?: string|null;
  facture?: {
    id?: string|number;
    numero?: string|null;
    statut?: string|null;
    total?: number|null;
    devise?: string|null;
    created_at?: string|null;
  } | null;

  created_at?: string|null;
  updated_at?: string|null;
};

export default function VisiteShow({
  visiteId,
  contextLabel = "Réception",
}: {
  visiteId: string | number;
  contextLabel?: string;
}) {
  const router = useRouter();
  const { canAny } = useAuthz();
  const allow = {
    read:  canAny(["visites.read"]),
    edit:  canAny(["visites.write"]),
    del:   canAny(["visites.write"]),
  };

  const [data, setData] = useState<VisiteDTO | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!allow.read) { setBusy(false); return; }
    let abo = false;
    (async () => {
      try {
        setBusy(true); setErr(null);
        const res: any = await getVisite(visiteId);
        const item: VisiteDTO = res?.data ?? res;
        if (!abo) setData(item);
      } catch (e: any) {
        if (!abo) setErr(e?.message || "Impossible de charger la visite.");
      } finally {
        if (!abo) setBusy(false);
      }
    })();
    return () => { abo = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiteId, allow.read]);

  async function onDelete() {
    if (!allow.del || !data) return;
    if (!confirm("Supprimer cette visite ?")) return;
    try {
      await deleteVisite(data.id);
      router.replace("../visites?flash=deleted");
    } catch (e:any) {
      alert(e?.message || "Suppression impossible");
    }
  }

  const prix = data?.prix ?? {};
  const tarifLabel = useMemo(() => {
    if (!prix) return "—";
    const code = prix.tarif?.code ?? "—";
    const lib  = prix.tarif?.libelle ?? "";
    return lib ? `${code} — ${lib}` : code;
  }, [prix]);

  return (
    <div className="space-y-6">
      {/* Fil d’Ariane + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>{contextLabel}</li><li aria-hidden>/</li>
            <li>Admissions</li><li aria-hidden>/</li>
            <li className="font-medium text-ink-900">Détail visite</li>
          </ol>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="../visites" className="icon-btn">
            <ArrowLeft className="h-4 w-4" /> <span className="ml-1 hidden sm:inline">Retour</span>
          </Link>
          {allow.edit && data && (
            <Link href={`../visites/${data.id}/edit`} className="icon-btn">
              <Pencil className="h-4 w-4" /> <span className="ml-1 hidden sm:inline">Modifier</span>
            </Link>
          )}
          {allow.del && (
            <button onClick={onDelete} className="icon-btn text-congo-red">
              <Trash2 className="h-4 w-4" /> <span className="ml-1 hidden sm:inline">Supprimer</span>
            </button>
          )}
        </div>
      </div>

      {/* Etat de chargement / erreur */}
      {busy && <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm animate-pulse h-40" />}
      {err && !busy && (
        <div className="rounded-xl border border-congo-red/30 bg-[color:var(--color-congo-red)]/10 p-3 text-congo-red text-sm">
          {err}
        </div>
      )}

      {/* Contenu */}
      {!!data && !busy && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche: infos clés */}
          <section className="lg:col-span-2 space-y-6">
            <Card title="Patient" icon={<User className="h-4 w-4" />}>
              <Row label="Nom">
                {fullName(data.patient?.nom, data.patient?.prenom) || "—"}
              </Row>
              <Row label="N° dossier">{data.patient?.numero_dossier || "—"}</Row>
              <Row label="Sexe / Âge">
                {[data.patient?.sexe, data.patient?.age ? `${data.patient.age} ans` : null]
                  .filter(Boolean).join(" / ") || "—"}
              </Row>
            </Card>

            <Card title="Service & intervenants" icon={<Building2 className="h-4 w-4" />}>
              <Row label="Service">{data.service?.name || `#${data.service?.id ?? "—"}`}</Row>
              <Row label="Médecin" icon={<Stethoscope className="h-4 w-4" />}>
                {data.medecin_nom || data.medecin?.nom || (data.medecin_id ? `#${data.medecin_id}` : "—")}
              </Row>
              {/* ✅ Agent: cherche sur plusieurs chemins (snapshot, relation, created_by, user, etc.) */}
              <Row label="Agent">
                {displayAgent(data)}
              </Row>
            </Card>

            <Card title="Motifs" icon={<FileText className="h-4 w-4" />}>
              <Row label="Plaintes / Motif">{data.plaintes_motif || "—"}</Row>
              <Row label="Hypothèse diagnostic">{data.hypothese_diagnostic || "—"}</Row>
              <Row label="Affectation ID">{data.affectation_id || "—"}</Row>
            </Card>

            <Card title="Tarification" icon={<WalletMinimal className="h-4 w-4" />}>
              <Row label="Tarif">{tarifLabel}</Row>
              <Row label="Montant prévu">{fmtMoney(prix.montant_prevu, prix.devise)}</Row>
              <Row label="Montant dû">{fmtMoney(prix.montant_du, prix.devise)}</Row>
              <Row label="Devise">{prix.devise || prix.tarif?.devise || "—"}</Row>
            </Card>
          </section>

          {/* Colonne droite: statut, dates, facture */}
          <section className="lg:col-span-1 space-y-6">
            <Card title="Statut" icon={<Shield className="h-4 w-4" />}>
              <div className="flex items-center gap-2">
                <StatutBadge statut={data.statut} />
              </div>
            </Card>

            <Card title="Horodatage" icon={<Clock className="h-4 w-4" />}>
              <Row label="Arrivée">{fmtDate(data.heure_arrivee)}</Row>
              <Row label="Clôture">{fmtDate(data.clos_at)}</Row>
              <Row label="Créée">{fmtDate(data.created_at)}</Row>
              <Row label="Mise à jour">{fmtDate(data.updated_at)}</Row>
            </Card>

            <Card title="Facture" icon={<Receipt className="h-4 w-4" />}>
              <Row label="N° facture">{data.facture_numero ?? data.facture?.numero ?? "—"}</Row>
              <Row label="Statut">{data.facture?.statut ?? "—"}</Row>
              <Row label="Total">{data.facture?.total != null ? fmtMoney(data.facture.total, data.facture?.devise) : "—"}</Row>
              <Row label="Créée">{fmtDate(data.facture?.created_at)}</Row>
            </Card>

            <Card title="Infos" icon={<Info className="h-4 w-4" />}>
              <p className="text-xs text-ink-600">
                Certains champs proviennent de snapshots (ex. <em>medecin_nom</em>, <em>agent_nom</em>) pour
                conserver l’historique même si le référentiel change.
              </p>
            </Card>
          </section>
        </div>
      )}

      <style jsx global>{`
        .icon-btn { display:inline-flex; align-items:center; justify-content:center; padding:6px 10px; border-radius:8px; color:#111827; border:1px solid #e5e7eb; background:white; }
        .icon-btn:hover { background:#f9fafb; }
      `}</style>
    </div>
  );
}

/* ---------------- UI bits ---------------- */

function Card({ title, icon, children }:{ title:string; icon?:React.ReactNode; children:React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}
function Row({ label, children, icon }:{ label:string; children:React.ReactNode; icon?:React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2">
      <div className="col-span-1 text-xs text-ink-600 flex items-center gap-1">
        {icon}{icon ? <span>{label}</span> : label}
      </div>
      <div className="col-span-2 text-sm text-ink-900">{children}</div>
    </div>
  );
}
function StatutBadge({ statut }:{ statut?: VisiteDTO["statut"] }) {
  const map: Record<NonNullable<VisiteDTO["statut"]>, { label: string; cls: string }> = {
    EN_ATTENTE:  { label: "En attente",  cls: "bg-amber-50 text-amber-700 border border-amber-200" },
    A_ENCAISSER: { label: "À encaisser", cls: "bg-sky-50 text-sky-700 border border-sky-200" },
    PAYEE:       { label: "Payée",       cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    CLOTUREE:    { label: "Clôturée",    cls: "bg-gray-100 text-gray-700 border border-gray-200" },
  };
  if (!statut) return <span className="text-ink-400">—</span>;
  const it = map[statut] ?? { label: statut, cls: "bg-ink-100 text-ink-700 border border-ink-200" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${it.cls}`}>{it.label}</span>;
}

/* ---------------- Helpers ---------------- */

function fullName(n?: string|null, p?: string|null){
  const nom = (n ?? "").trim();
  const pre = (p ?? "").trim();
  const out = `${nom} ${pre}`.trim();
  return out || "";
}

function fmtDate(v?: string|null){
  if(!v) return "—";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleString();
  } catch { return v; }
}

function fmtMoney(v?: number|null, devise?: string|null){
  if (v == null) return "—";
  const out = new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);
  return devise ? `${out} ${devise}` : out;
}

/** ✅ Détermine le nom d’agent en balayant plusieurs chemins possibles. */
function displayAgent(v: VisiteDTO){
  // 1) snapshot back
  if (v.agent_nom && v.agent_nom.trim()) return v.agent_nom.trim();

  // 2) relation agent (différentes formes)
  const rel = v.agent;
  const relName =
    rel?.nom?.trim() ||
    rel?.name?.trim() ||
    rel?.personnel?.full_name?.trim();
  if (relName) return relName;

  // 3) champs alternatifs fréquents
  if (v.created_by_name && v.created_by_name.trim()) return v.created_by_name.trim();
  const createdBy =
    v.created_by?.nom?.trim() ||
    v.created_by?.name?.trim() ||
    v.created_by?.personnel?.full_name?.trim();
  if (createdBy) return createdBy;

  const userName =
    v.user?.nom?.trim() ||
    v.user?.name?.trim() ||
    v.user?.personnel?.full_name?.trim();
  if (userName) return userName;

  // 4) fallback à l'id si présent
  if (v.agent_id) return `#${v.agent_id}`;

  // 5) sinon —
  return "—";
}
