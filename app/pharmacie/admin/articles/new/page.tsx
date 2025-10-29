"use client";

import { useEffect, useState } from "react";
import { createArticle, getDciOptions } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

type DciOption = { id: number; name: string };

const LOCAL_PLACEHOLDER = "/pharma-placeholder.png"; // mets une image réelle dans /public

export default function ArticleCreatePage() {
  const router = useRouter();

  const [dcis, setDcis] = useState<DciOption[]>([]);
  const [loadingDcis, setLoadingDcis] = useState(true);
  const [errDcis, setErrDcis] = useState<string | null>(null);

  const [form, setForm] = useState<any>({
    dci_id: "", name: "", code: "", form: "", dosage: "", unit: "",
    pack_size: "", buy_price: "", sell_price: "", tax_rate: "", min_stock: "", max_stock: "",
    image_url: "" // ← affiché seulement pour info (non utilisé par le POST create)
  });

  const [file, setFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadingDcis(true);
        const opts = await getDciOptions();
        setDcis(Array.isArray(opts) ? opts : []);
      } catch (e: any) {
        setErrDcis(e?.message || "Erreur chargement DCIs");
        setDcis([]);
      } finally {
        setLoadingDcis(false);
      }
    })();
  }, []);

  const save = async () => {
    try {
      setSaving(true);

      // Prépare le payload sans les champs vides
      const payload: any = {};
      for (const [k, v] of Object.entries(form)) {
        if (v === "" || v === null || typeof v === "undefined") continue;
        if (["pack_size","buy_price","sell_price","tax_rate","min_stock","max_stock","dci_id"].includes(k)) {
          payload[k] = Number(v);
        } else if (k !== "image_url") { // ⚠️ image_url ignoré à la création (le back attend "image" fichier)
          payload[k] = v;
        }
      }

      // Envoie le fichier image si présent (multipart) sinon simple JSON
      await createArticle(payload, file || undefined);

      router.push("/pharmacie/admin/articles");
    } catch (e: any) {
      alert(e?.message || "Erreur sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nouvel article</h1>
        <Link href="/pharmacie/admin/articles" className="text-congo-green underline">← Retour</Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 bg-white rounded-lg border p-4">

        {/* Bloc image : aperçu + fichier */}
        <div className="sm:col-span-2 grid gap-2">
          <span className="text-sm text-gray-700">Image (depuis l’appareil)</span>

          <label htmlFor="new-article-image" className="w-fit cursor-pointer">
            <img
              src={localPreview || LOCAL_PLACEHOLDER}
              alt=""
              className="w-32 h-32 object-contain border rounded bg-white"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = LOCAL_PLACEHOLDER;
              }}
            />
          </label>

          <input
            id="new-article-image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f) {
                const url = URL.createObjectURL(f);
                setLocalPreview(url);
                // libère l’URL plus tard
                setTimeout(() => URL.revokeObjectURL(url), 30_000);
              } else {
                setLocalPreview(null);
              }
            }}
          />

          {/* Champ optionnel URL (non utilisé par le POST create) */}
          <label className="grid gap-1">
            <span className="text-sm text-gray-700">Image URL (optionnel, ignoré à la création)</span>
            <input
              className="px-3 py-2 rounded border"
              value={form.image_url}
              onChange={(e)=>setForm((f:any)=>({...f, image_url: e.target.value}))}
              placeholder="https://…"
            />
          </label>
        </div>

        {/* DCI */}
        <label className="grid gap-1">
          <span>DCI</span>
          <select
            className="px-3 py-2 rounded border"
            value={String(form.dci_id ?? "")}
            onChange={(e)=>setForm((f:any)=>({...f, dci_id: e.target.value}))}
            disabled={loadingDcis}
          >
            <option value="">—</option>
            {Array.isArray(dcis) && dcis.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {errDcis && <span className="text-xs text-red-600">{errDcis}</span>}
        </label>

        {/* Champs texte/numériques */}
        <label className="grid gap-1">
          <span>Nom</span>
          <input className="px-3 py-2 rounded border" value={form.name} onChange={e=>setForm((f:any)=>({...f,name:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Code/SKU</span>
          <input className="px-3 py-2 rounded border" value={form.code} onChange={e=>setForm((f:any)=>({...f,code:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Forme</span>
          <input className="px-3 py-2 rounded border" value={form.form} onChange={e=>setForm((f:any)=>({...f,form:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Dosage</span>
          <input className="px-3 py-2 rounded border" value={form.dosage} onChange={e=>setForm((f:any)=>({...f,dosage:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Unité</span>
          <input className="px-3 py-2 rounded border" value={form.unit} onChange={e=>setForm((f:any)=>({...f,unit:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Taille pack</span>
          <input className="px-3 py-2 rounded border" value={form.pack_size} onChange={e=>setForm((f:any)=>({...f,pack_size:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Prix d&apos;achat</span>
          <input className="px-3 py-2 rounded border" value={form.buy_price} onChange={e=>setForm((f:any)=>({...f,buy_price:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Prix vente</span>
          <input className="px-3 py-2 rounded border" value={form.sell_price} onChange={e=>setForm((f:any)=>({...f,sell_price:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>TVA %</span>
          <input className="px-3 py-2 rounded border" value={form.tax_rate} onChange={e=>setForm((f:any)=>({...f,tax_rate:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Seuil min</span>
          <input className="px-3 py-2 rounded border" value={form.min_stock} onChange={e=>setForm((f:any)=>({...f,min_stock:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Seuil max</span>
          <input className="px-3 py-2 rounded border" value={form.max_stock} onChange={e=>setForm((f:any)=>({...f,max_stock:e.target.value}))} />
        </label>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}
