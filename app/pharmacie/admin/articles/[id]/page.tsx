"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Guarded from "@/components/admin/Guarded";
import { apiFetch, getArticle, updateArticle } from "@/lib/api";

type DciOption = { id: number; name: string };

async function fetchDciOptions(): Promise<DciOption[]> {
  const res: any = await apiFetch("/pharma/dcis/options", { method: "GET" });
  if (Array.isArray(res)) {
    return res.map((x: any) => ({
      id: typeof x.id === "number" ? x.id : (x.value ?? x.id),
      name: typeof x.name === "string" ? x.name : (x.label ?? x.name ?? ""),
    }));
  }
  return [];
}

export default function ArticleEditPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [generatedLocked, setGeneratedLocked] = useState(true);
  const [form, setForm] = useState<any>({
    dci_id: "",
    name: "",
    code: "",
    form: "",
    dosage: "",
    unit: "",
    pack_size: "",
    buy_price: "",
    sell_price: "",
    tax_rate: "",
    min_stock: "",
    max_stock: "",
    is_active: true,
  });

  const [stock, setStock] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dcis, setDcis] = useState<DciOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getArticle(id), fetchDciOptions()])
      .then(([a, opts]) => {
        if (cancelled) return;
        setDcis(opts || []);

        setForm({
          dci_id: a.dci?.id ?? a.dci_id ?? "",
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
          is_active: a.is_active ?? true,
        });

        setStock(a.stock_on_hand ?? a.stock ?? 0);
        setImageUrl(a.image_url ?? null);
      })
      .catch((e) => alert(e.message || "Erreur chargement"))
      .finally(() => setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id]);

  const onSave = async () => {
    try {
      const src: any = { ...form };

      // si les champs générés sont verrouillés, on ne les envoie pas
      if (generatedLocked) {
        delete src.name;
        delete src.code;
        delete src.pack_size;
        delete src.min_stock;
      }

      // conversion des nombres
      (["pack_size", "buy_price", "sell_price", "tax_rate", "min_stock", "max_stock"] as const).forEach((k) => {
        if (src[k] === "" || src[k] === null || typeof src[k] === "undefined") {
          delete src[k];
        } else {
          src[k] = Number(src[k]);
        }
      });

      if (!src.dci_id) delete src.dci_id;
      if (typeof src.is_active !== "boolean") src.is_active = !!src.is_active;

      await updateArticle(id, src);
      router.push("/pharmacie/admin/articles");
    } catch (e: any) {
      alert(e.message || "Erreur sauvegarde");
    }
  };

  const generatedTitle = useMemo(
    () => "Ces champs sont gérés automatiquement par le backend (nom, code, pack, min_stock). Déverrouille si besoin de forcer.",
    []
  );

  if (loading) {
    return (
      <Guarded>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <div className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
          <div className="rounded-lg border bg-white p-4 grid gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </Guarded>
    );
  }

  return (
    <Guarded>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Modifier l’article #{id}</h1>
          <Link href="/pharmacie/admin/articles" className="text-congo-green underline">
            ← Retour
          </Link>
        </div>

        {imageUrl && (
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm text-gray-700 mb-2">Image</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-28 object-contain" />
          </div>
        )}

        <div className="rounded-lg border bg-white p-4 grid gap-4">
          {/* DCI */}
          <label className="grid gap-1">
            <span className="text-sm text-gray-700">DCI</span>
            <select
              value={form.dci_id ?? ""}
              onChange={(e) => setForm((f: any) => ({ ...f, dci_id: e.target.value ? Number(e.target.value) : "" }))}
              className="px-3 py-2 rounded border bg-white"
            >
              <option value="">— Aucune —</option>
              {dcis.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          {/* Bouton lock/unlock */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">{generatedTitle}</div>
            <button onClick={() => setGeneratedLocked((v) => !v)} className="px-3 py-1.5 rounded border">
              {generatedLocked ? "🔓 Déverrouiller" : "🔒 Re-verrouiller"}
            </button>
          </div>

          {/* Champs générés */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["name", "Nom"],
              ["code", "Code / SKU"],
              ["pack_size", "Taille pack"],
              ["min_stock", "Seuil min"],
            ].map(([k, label]) => (
              <label key={k} className="grid gap-1">
                <span className="text-sm text-gray-700">{label}</span>
                <input
                  value={form[k] ?? ""}
                  onChange={(e) => setForm((f: any) => ({ ...f, [k]: e.target.value }))}
                  className="px-3 py-2 rounded border"
                  disabled={generatedLocked}
                  title={generatedLocked ? generatedTitle : ""}
                />
              </label>
            ))}
          </div>

          {/* Autres champs libres */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["form", "Forme"],
              ["dosage", "Dosage"],
              ["unit", "Unité"],
              ["max_stock", "Seuil max"],
              ["buy_price", "Prix d'achat"],
              ["sell_price", "Prix de vente"],
              ["tax_rate", "TVA (%)"],
            ].map(([k, label]) => (
              <label key={k} className="grid gap-1">
                <span className="text-sm text-gray-700">{label}</span>
                <input
                  value={form[k] ?? ""}
                  onChange={(e) => setForm((f: any) => ({ ...f, [k]: e.target.value }))}
                  className="px-3 py-2 rounded border"
                  inputMode="decimal"
                />
              </label>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => setForm((f: any) => ({ ...f, is_active: e.target.checked }))}
            />
            <span className="text-sm text-gray-700">Actif</span>
          </label>

          <div className="text-sm text-gray-600">
            Stock actuel (somme des lots) : <b>{stock}</b>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={onSave} className="px-4 py-2 rounded bg-blue-600 text-white">
              Enregistrer
            </button>
            <Link href="/pharmacie/admin/articles" className="text-gray-600 hover:underline">
              Annuler
            </Link>
          </div>
        </div>
      </div>
    </Guarded>
  );
}
