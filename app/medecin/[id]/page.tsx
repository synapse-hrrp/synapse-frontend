// app/medecin/[id]/page.tsx — Détail
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getMedecin, getToken, me, listPersonnelsPaginated } from "@/lib/api";
import { ArrowLeft, Pencil, IdCard, Briefcase, CheckCircle2, X } from "lucide-react";

export default function MedecinDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sp = useSearchParams();

  const [m, setM] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(`/login?next=/medecin/${id}`); return; }
    me().catch(() => window.location.replace(`/login?next=/medecin/${id}`));
  }, [id]);

  useEffect(() => {
    const f = sp?.get("flash");
    if (f === "updated") {
      setToast({ show: true, text: "Fiche médecin mise à jour." });
      router.replace(`/medecin/${id}`, { scroll: false });
      const tid = setTimeout(() => setToast({ show: false, text: "" }), 3500);
      return () => clearTimeout(tid);
    }
  }, [sp, router, id]);

  useEffect(() => {
    (async () => {
      try {
        setBusy(true);
        const data = await getMedecin(id);
        setM(data?.data ?? data);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || "Chargement impossible");
      } finally {
        setBusy(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await listPersonnelsPaginated({ page: 1, per_page: 500 });
        const arr = Array.isArray(res) ? res : (res.data ?? []);
        const map = new Map<number, string>();
        for (const p of arr) {
          const name = p.full_name || `${p.last_name || ""} ${p.first_name || ""}`.trim();
          map.set(Number(p.id), name || String(p.id));
        }
        setNameMap(map);
      } catch {}
    })();
  }, []);

  const displayName = useMemo(() => {
    if (!m) return "";
    return nameMap.get(Number(m.personnel_id)) ?? `Personnel #${m.personnel_id}`;
  }, [m, nameMap]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title={displayName || "Détail médecin"} subtitle={m?.numero_ordre ? `N° ${m.numero_ordre}` : "Fiche & historique"} logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/medecin" className="hover:underline">Médecins</Link></li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Détail</li>
            </ol>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/medecin" className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
            <Link href={`/medecin/${id}/edit`} className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 inline-flex items-center gap-1">
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          </div>
        </div>

        {busy && <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />}
        {!busy && err && <div className="rounded-xl border border-congo-red/30 bg-red-50 p-4 text-congo-red text-sm">{err}</div>}

        {!busy && m && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-6">
              <Card title="Identité" icon={<IdCard className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <Field k="Médecin (Personnel)" v={displayName || "—"} />
                  <Field k="Numéro d’ordre" v={m.numero_ordre || "—"} />
                  <Field k="Grade" v={m.grade || "—"} />
                </div>
              </Card>

              <Card title="Spécialité" icon={<Briefcase className="h-4 w-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <Field k="Spécialité" v={m.specialite || "—"} />
                </div>
              </Card>
            </section>

            <aside className="space-y-6">
              <Card title="Métadonnées">
                <ul className="text-sm space-y-1">
                  <li><b>ID :</b> {m.id}</li>
                  <li><b>Créé le :</b> {m.created_at ? new Date(m.created_at).toLocaleString() : "—"}</li>
                  <li><b>Mis à jour :</b> {m.updated_at ? new Date(m.updated_at).toLocaleString() : "—"}</li>
                </ul>
              </Card>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />

      <Toast show={toast.show} onClose={() => setToast({ show: false, text: "" })}>
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">{toast.text}</span>
      </Toast>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">{icon}<h3 className="text-sm font-semibold">{title}</h3></div>
      {children}
    </section>
  );
}
function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-ink-600">{k}</div>
      <div className="mt-1 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-sm">{v ?? "—"}</div>
    </div>
  );
}
function Toast({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div aria-live="polite" role="status" className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${show ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"}`}>
      <div className="flex items-center gap-2 rounded-xl border border-congo-green/30 bg-congo-greenL px-3 py-2 shadow-lg ring-1 ring-congo-green/20 text-congo-green">
        {children}
        <button onClick={onClose} aria-label="Fermer" className="ml-1 rounded-md p-1 hover:bg-ink-100 text-ink-600"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
