"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  type ApiCart,
  ensureCartId,
  getCart,
  addCartLine,
  updateCartLine,
  deleteCartLine,
  checkoutCart,
  payFacture,
} from "@/lib/api";

type StartSaleInit = {
  visite_id?: string | null;
  patient_id?: string | null;
  customer_name?: string | null;
  currency?: string | null;
};

type CartCtx = {
  cart: ApiCart | null;
  loading: boolean;
  // vente
  startSale: (init: StartSaleInit) => Promise<void>;
  add: (articleId: number, qty?: number) => Promise<void>;
  setQty: (lineId: number, qty: number) => Promise<void>;
  remove: (lineId: number) => Promise<void>;
  refresh: () => Promise<void>;
  // checkout
  checkingOut: boolean;
  checkout: (reference?: string) => Promise<{ facture_id?: string | number }>;
  factureId: string | number | null;
  // paiement
  paying: boolean;
  payInvoice: (payload: { montant: number; mode: string; reference?: string; devise?: string }) => Promise<void>;
  // dérivés
  count: number;
  distinct: number;
  totalTtc: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [loading, setLoading] = useState(true);

  const [checkingOut, setCheckingOut] = useState(false);
  const [factureId, setFactureId] = useState<string | number | null>(null);

  const [paying, setPaying] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const id = await ensureCartId();
      const c: any = await getCart(id);
      setCart(c ?? null);
      // Si on recharge un panier déjà check-out (rare), on purge l’ID pour repartir propre
      if (c && c.status !== "open") {
        // repartir propre : on recrée un open à la prochaine action
        setFactureId((c as any)?.facture_id ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // 1) Démarrer une vente (crée un panier open avec le payload)
  const startSale = useCallback(async (init: StartSaleInit) => {
    // force la création d’un nouveau panier avec init
    await ensureCartId(init);
    await refresh();
  }, [refresh]);

  // 2) Lignes
  const add = useCallback(async (articleId: number, qty = 1) => {
    setCart((prev) => {
      if (!prev) return prev;
      const existing = prev.lines.find((l) => l.article_id === articleId);
      let lines = prev.lines.slice();
      if (existing) lines = lines.map((l) => (l.id === existing.id ? { ...l, quantity: l.quantity + qty } : l));
      else lines.push({ id: -Date.now(), article_id: articleId, quantity: qty, unit_price: null, tax_rate: null, line_ht: 0, line_tva: 0, line_ttc: 0 } as any);
      return { ...prev, lines };
    });
    try {
      await addCartLine(articleId, qty);
    } catch (e) {
      await refresh();
      throw e;
    }
    await refresh();
  }, [refresh]);

  const setQty = useCallback(async (lineId: number, qty: number) => {
    setCart((prev) => prev ? { ...prev, lines: prev.lines.map((l) => (l.id === lineId ? { ...l, quantity: qty } : l)) } : prev);
    try {
      await updateCartLine(lineId, qty);
    } catch (e) {
      await refresh();
      throw e;
    }
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (lineId: number) => {
    setCart((prev) => prev ? { ...prev, lines: prev.lines.filter((l) => l.id !== lineId) } : prev);
    try {
      await deleteCartLine(lineId);
    } catch (e) {
      await refresh();
      throw e;
    }
    await refresh();
  }, [refresh]);

  // 3) Checkout → renvoie facture_id
  const checkout = useCallback(async (reference?: string) => {
    setCheckingOut(true);
    try {
      const res: any = await checkoutCart(reference);
      const fid = res?.facture_id ?? res?.data?.facture_id ?? null;
      setFactureId(fid);
      await refresh(); // le panier n’est plus open ; refresh mettra à jour le state
      return { facture_id: fid };
    } catch (e: any) {
      const msg = e?.message || e?.payload?.message || e?.payload?.error || "Échec du checkout.";
      throw new Error(msg);
    } finally {
      setCheckingOut(false);
    }
  }, [refresh]);

  // 4) Paiement facture → reset complet
  const payInvoice = useCallback(async (payload: {
    montant: number; mode: string; reference?: string; devise?: string;
  }) => {
    if (!factureId) throw new Error("Aucune facture à régler. Faites le checkout d'abord.");
    setPaying(true);
    try {
      await payFacture(factureId, payload);
      // Reset immédiat
      setCart(null);
      setFactureId(null);
      // Recréation d’un nouveau panier open à la prochaine vente (startSale ou add…)
      await refresh();
    } catch (e: any) {
      const msg = e?.message || e?.payload?.message || e?.payload?.error || "Échec du paiement.";
      throw new Error(msg);
    } finally {
      setPaying(false);
    }
  }, [factureId, refresh]);

  // dérivés
  const { count, distinct, totalTtc } = useMemo(() => {
    const c = cart;
    const count = c?.lines?.reduce((s, l) => s + Number(l.quantity || 0), 0) ?? 0;
    const distinct = c?.lines?.length ?? 0;
    const totalTtc = Number(c?.total_ttc ?? 0);
    return { count, distinct, totalTtc };
  }, [cart]);

  const value: CartCtx = {
    cart, loading,
    startSale, add, setQty, remove, refresh,
    checkingOut, checkout, factureId,
    paying, payInvoice,
    count, distinct, totalTtc
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
