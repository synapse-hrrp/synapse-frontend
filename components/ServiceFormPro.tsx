// components/ServiceFormPro.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, me, createService, updateService, Service, getService } from "@/lib/api";

type Props = {
  mode: "create" | "edit";
  serviceId?: number; // requis en edit (fourni par la page)
};

function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ServiceFormPro({ mode, serviceId }: Props) {
  const router = useRouter();

  // Garde
  useEffect(() => {
    const t = getToken();
    if (!t) { window.location.replace(mode === "create" ? "/login?next=/services/new" : `/login?next=/services/${serviceId}/edit`); return; }
    me().catch(() => window.location.replace(mode === "create" ? "/login?next=/services/new" : `/login?next=/services/${serviceId}/edit`));
    // eslint-disable-next-line
  }, []);

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [touchedSlug, setTouchedSlug] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Charger en mode édition
  useEffect(() => {
    if (mode !== "edit" || !serviceId) return;
    (async () => {
      try {
        setLoading(true);
        const raw = await getService(serviceId);
        const s: Service = raw?.data ?? raw;
        setName(s.name || "");
        setSlug(s.slug || "");
        setCode(s.code || "");
        setIsActive(s.is_active !== false);
      } catch (e: any) {
        setErr(e?.message || "Impossible de charger le service.");
      } finally { setLoading(false); }
    })();
  }, [mode, serviceId]);

  // Auto-slug si non modifié à la main
  useEffect(() => {
    if (!touchedSlug) setSlug((prev) => (prev ? slugify(prev) : slugify(name)));
  }, [name, touchedSlug]);

  const valid = useMemo(() => name.trim() && slug.trim().match(/^[a-z0-9-]+$/), [name, slug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const payload = {
        name: name.trim(),
        slug: slugify(slug.trim()),
        code: code.trim() || null,
        is_active: !!isActive,
      };
      if (mode === "create") {
        await createService(payload);
        router.replace("/services?flash=created");
      } else {
        await updateService(serviceId!, payload);
        router.replace(`/services/${serviceId}?flash=updated`);
      }
    } catch (e: any) {
      setErr(e?.message || "Échec de l’enregistrement");
    } finally { setBusy(false); }
  }

  if (loading) {
    return <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />;
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold">{mode === "create" ? "Créer un service" : "Modifier le service"}</h3>

        {err && <div className="rounded-lg border border-congo-red/30 bg-red-50 p-3 text-sm text-congo-red">{err}</div>}

        <div>
          <label className="block text-xs font-medium text-ink-600">Nom <span className="text-congo-red">*</span></label>
          <input className={inputCls} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex : Laboratoire" required />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-600">Slug <span className="text-congo-red">*</span></label>
          <input
            className={inputCls}
            value={slug}
            onChange={e=>{ setSlug(e.target.value); setTouchedSlug(true); }}
            placeholder="ex: laboratoire"
            required
            pattern="^[a-z0-9-]+$"
            title="Minuscules, chiffres et tirets uniquement"
          />
          <p className="mt-1 text-xs text-ink-500">Utilisé pour l’URL et les intégrations (unique).</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-600">Code (optionnel)</label>
          <input className={inputCls} value={code} onChange={e=>setCode(e.target.value)} placeholder="Ex : LAB" />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input id="is_active" type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} className="h-4 w-4" />
          <label htmlFor="is_active" className="text-sm text-ink-700">Actif</label>
        </div>
      </section>

      <aside className="lg:col-span-1">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm space-y-3 sticky top-20">
          <div className="text-sm font-semibold">Résumé</div>
          <ul className="text-sm text-ink-700 space-y-1">
            <li><b>Nom:</b> {name || "—"}</li>
            <li><b>Slug:</b> {slug || "—"}</li>
            <li><b>Code:</b> {code || "—"}</li>
            <li><b>Statut:</b> {isActive ? "Actif" : "Inactif"}</li>
          </ul>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!valid || busy}
              className="w-full rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {busy ? "Enregistrement…" : (mode === "create" ? "Créer le service" : "Enregistrer")}
            </button>
          </div>
        </div>
      </aside>

      <style jsx>{``}</style>
    </form>
  );
}

const inputCls = "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";
