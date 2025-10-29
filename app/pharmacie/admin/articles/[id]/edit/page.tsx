// app/pharmacie/admin/articles/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getArticle, getDciOptions, updateArticle, uploadArticleImage } from "@/lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type DciOption = { id: number; name: string };

const LOCAL_PLACEHOLDER = "/pharma-placeholder.png"; // mets ce fichier dans /public

export default function ArticleEditPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [dcis, setDcis] = useState<DciOption[]>([]);
  const [stock, setStock] = useState<number>(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const [form, setForm] = useState<any>({
    dci_id: "", name: "", code: "", form: "", dosage: "", unit: "",
    pack_size: "", buy_price: "", sell_price: "", tax_rate: "",
    min_stock: "", max_stock: "",
    image_url: ""
  });

  useEffect(() => {
    (async () => {
      const [opts, a]: any = await Promise.all([getDciOptions(), getArticle(id)]);
      setDcis(Array.isArray(opts) ? opts : []);
      setForm({
        dci_id: a.dci?.id ?? "",
        name: a.name ?? "",
        code: a.code ?? "",
        form: a.form ?? "",
        dosage: a.dosage ?? "",
        unit: a.unit ?? "",
        pack_size: a.pack_size ?? "",
        buy_price: a.buy_price ?? "",
        sell_price: a.sell_price ?? "",
        tax_rate: a.tax_rate ?? "",
        min_stock: a.min_stock ?? "",
        max_stock: a.max_stock ?? "",
        image_url: a.image_url ?? "",
      });
      setStock(a.stock_on_hand ?? a.stock ?? 0);
    })().catch((e) => alert(e.message || "Erreur chargement"));
  }, [id]);

  const onSave = async () => {
    try {
      const payload: any = {};
      for (const [k, v] of Object.entries(form)) {
        if (v === "" || v === null || typeof v === "undefined") continue;
        if (["pack_size","buy_price","sell_price","tax_rate","min_stock","max_stock","dci_id"].includes(k)) {
          payload[k] = Number(v);
        } else {
          payload[k] = v;
        }
      }
      await updateArticle(id, payload);
      router.push("/pharmacie/admin/articles");
    } catch (e: any) {
      alert(e.message || "Erreur sauvegarde");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Article #{id}</h1>
        <Link href="/pharmacie/admin/articles" className="text-congo-green underline">← Retour</Link>
      </div>

      <div className="rounded-lg border bg-white p-4 grid gap-3 sm:grid-cols-2">

        {/* Image + upload */}
        <div className="sm:col-span-2 grid gap-2">
          <span className="text-sm text-gray-700">Image</span>

          <label htmlFor="article-image-input" className="w-fit cursor-pointer">
            <img
              src={localPreview || form.image_url || LOCAL_PLACEHOLDER}
              alt=""
              className="w-32 h-32 object-contain border rounded bg-white"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = LOCAL_PLACEHOLDER;
              }}
            />
          </label>

          <input
            id="article-image-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) return;
              const obj = URL.createObjectURL(file);
              setLocalPreview(obj);
              try {
                setUploading(true);
                const resp: any = await uploadArticleImage(id, file);
                setForm((f: any) => ({ ...f, image_url: resp?.image_url || f.image_url }));
              } catch (err: any) {
                alert(err.message || "Échec upload image");
                setLocalPreview(null);
              } finally {
                setUploading(false);
                setTimeout(() => URL.revokeObjectURL(obj), 1500);
              }
            }}
          />

          {/* URL manuelle (optionnel) */}
          <input
            className="px-3 py-2 rounded border"
            value={form.image_url ?? ""}
            onChange={(e) => setForm((f: any) => ({ ...f, image_url: e.target.value }))}
            placeholder="https://…"
          />

          {uploading && <em className="text-sm text-gray-500">Téléversement…</em>}
        </div>

        <label className="grid gap-1">
          <span>DCI</span>
          <select
            className="px-3 py-2 rounded border"
            value={form.dci_id}
            onChange={(e) => setForm((f: any) => ({ ...f, dci_id: e.target.value }))}
          >
            <option value="">—</option>
            {dcis.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>

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
          <span>Prix vente</span>
          <input className="px-3 py-2 rounded border" value={form.sell_price} onChange={e=>setForm((f:any)=>({...f,sell_price:e.target.value}))} />
        </label>

        <label className="grid gap-1">
          <span>Prix d'achat</span>
          <input className="px-3 py-2 rounded border" value={form.buy_price} onChange={e=>setForm((f:any)=>({...f,buy_price:e.target.value}))} />
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

        <div className="sm:col-span-2 text-sm text-gray-600">
          Stock actuel : <b>{stock}</b>
        </div>
      </div>

      <button onClick={onSave} className="px-4 py-2 rounded bg-blue-600 text-white">Enregistrer</button>
    </div>
  );
}
