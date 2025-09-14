"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getLaboratoire, deleteLaboratoire, LaboratoireDTO } from "@/lib/api";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";

export default function LaboShow() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<LaboratoireDTO | null>(null);

  useEffect(() => {
    (async () => { try { setItem(await getLaboratoire(id)); } catch { setItem(null); } })();
  }, [id]);

  async function onDelete() {
    if (!confirm("Supprimer cet examen ?")) return;
    try { await deleteLaboratoire(id); router.replace("/laboratoire"); }
    catch (e:any) { alert("Suppression impossible: " + (e?.message || "inconnue")); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Détail examen labo" subtitle={item ? item.test_name : ""} logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/laboratoire" className="text-sm text-congo-green inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> Retour</Link>
          <div className="flex items-center gap-2">
            <Link href={`/laboratoire/${id}/edit`} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-2"><Pencil className="h-4 w-4" /> Modifier</Link>
            <button onClick={onDelete} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-congo-red hover:bg-ink-50 inline-flex items-center gap-2"><Trash2 className="h-4 w-4" /> Supprimer</button>
          </div>
        </div>

        {!item ? (
          <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">Chargement…</div>
        ) : (
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Field k="Patient" v={item.patient ? `${item.patient.nom} ${item.patient.prenom}` : "—"} />
              <Field k="N° dossier" v={item.patient?.numero_dossier || "—"} />
              <Field k="Test" v={`${item.test_name} (${item.test_code})`} />
              <Field k="Specimen" v={item.specimen || "—"} />
              <Field k="Statut" v={item.status || "pending"} />
              <Field k="Demandé le" v={item.requested_at ? new Date(item.requested_at).toLocaleString() : "—"} />
              <Field k="Validé le" v={item.validated_at ? new Date(item.validated_at).toLocaleString() : "—"} />
              <Field k="Valeur" v={item.result_value || "—"} />
              <Field k="Unité" v={item.unit || "—"} />
              <Field k="Référence" v={item.ref_range || "—"} />
              <Field k="Prix" v={item.price != null ? `${item.price} ${item.currency || ""}` : "—"} />
            </div>
            {item.result_json && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-ink-700 mb-1">Résultats (JSON)</div>
                <pre className="rounded-lg border border-ink-100 bg-ink-50 p-3 text-xs overflow-auto">
                  {JSON.stringify(item.result_json, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
function Field({k, v}:{k:string; v:string}) {
  return <div><div className="text-xs text-ink-500">{k}</div><div className="text-ink-900 font-medium">{v}</div></div>;
}
