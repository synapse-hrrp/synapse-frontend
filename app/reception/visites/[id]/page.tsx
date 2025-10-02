"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthz } from "@/lib/authz";
import { getVisite } from "@/lib/api";
import { Pencil } from "lucide-react";

type Visite = {
  id: string|number;
  created_at?: string|null;
  plaintes_motif?: string|null;
  patient?: { nom?: string|null; prenom?: string|null; numero_dossier?: string|null } | null;
  service?: { name?: string|null } | null;
};

export default function ReceptionVisiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isAdmin, can } = useAuthz();

  const [row, setRow] = useState<Visite | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.replace(`/login?next=/reception/visites/${id}`);
      return;
    }
    if (!isAdmin && !can("visites.read")) {
      window.location.replace("/reception/visites");
      return;
    }
    (async () => {
      setBusy(true); setErr(null);
      try {
        const payload: any = await getVisite(String(id));
        setRow(Array.isArray(payload) ? payload[0] : payload?.data ?? payload);
      } catch (e: any) {
        setErr(e?.message || "Introuvable");
      } finally { setBusy(false); }
    })();
  }, [id, isAuthenticated, isAdmin, can]);

  const canWrite = isAdmin || can("visites.write");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Détail de la visite</h2>
          <p className="text-xs text-ink-600">Informations et actions</p>
        </div>
        <div className="flex items-center gap-2">
          {canWrite && (
            <Link
              href={`/reception/visites/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          )}
          <Link href="/reception/visites" className="text-sm text-congo-green hover:underline">← Liste</Link>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
        {busy && <p className="text-sm text-ink-600">Chargement…</p>}
        {err && <p className="text-sm text-congo-red">{err}</p>}
        {!busy && !err && row && (
          <div className="space-y-2 text-sm">
            <div><span className="text-ink-500">Date :</span> {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</div>
            <div>
              <span className="text-ink-500">Patient :</span>{" "}
              {row.patient ? `${row.patient.nom ?? ""} ${row.patient.prenom ?? ""}`.trim() : "—"}{" "}
              {row.patient?.numero_dossier ? <span className="text-ink-500">({row.patient.numero_dossier})</span> : null}
            </div>
            <div><span className="text-ink-500">Service :</span> {row.service?.name ?? "—"}</div>
            <div><span className="text-ink-500">Motif :</span> {row.plaintes_motif ?? "—"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
