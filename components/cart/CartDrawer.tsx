// components/cart/CartDrawer.tsx
"use client";

import { useMemo, useState } from "react";
import { useCart } from "./CartProvider";

export default function CartDrawer({ onClose }: { onClose: () => void }) {
  const {
    cart,
    setQty,
    remove,
    // nouveau workflow depuis CartProvider
    startSale,
    checkout,
    payInvoice,
    checkingOut,
    paying,
    factureId,
    totalTtc,
  } = useCart();

  // Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Infos de démarrage vente (liens patient/visite, monnaie…)
  const [patientId, setPatientId] = useState<string>("");
  const [visiteId, setVisiteId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [currency, setCurrency] = useState<string>("XAF");

  // Référence optionnelle pour le checkout et le paiement
  const [checkoutRef, setCheckoutRef] = useState<string>("");
  const [payRef, setPayRef] = useState<string>("");

  // Formulaire paiement
  const [payMontant, setPayMontant] = useState<string>("");
  const [payMode, setPayMode] = useState<string>("ESPECES");
  const [payDevise, setPayDevise] = useState<string>("XAF");

  // Indique si le panier est “open”
  const isOpenCart = useMemo(() => cart?.status === "open", [cart?.status]);

  const onStartSale = async () => {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await startSale({
        patient_id: patientId || undefined,
        visite_id: visiteId || undefined,
        customer_name: customerName || undefined,
        currency: currency || undefined,
      });
      setSuccessMsg("Vente démarrée.");
      // on garde le tiroir ouvert
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du démarrage de la vente.");
    }
  };

  const onCheckout = async () => {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const { facture_id } = await checkout(checkoutRef || undefined);
      setSuccessMsg(`Panier validé. Facture #${facture_id ?? "?"}. Vous pouvez procéder au paiement.`);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors de la validation du panier.");
    }
  };

  const onPay = async () => {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const montantNum = Number(payMontant);
      if (!montantNum || isNaN(montantNum)) {
        setErrorMsg("Montant invalide.");
        return;
      }
      await payInvoice({
        montant: montantNum,
        mode: payMode,
        reference: payRef || undefined,
        devise: payDevise || undefined,
      });
      setSuccessMsg("Le paiement a été bien effectué.");
      // ferme après 1.5s (optionnel)
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
      // Les états du provider remettent le panier à zéro après paiement
      setPayMontant("");
      setPayRef("");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du paiement.");
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Panier</h3>
          <button onClick={onClose} className="text-2xl leading-none">×</button>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="mb-3 rounded border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Bloc 1 — Démarrer/paramétrer la vente */}
        <section className="mb-3 rounded border p-3 bg-white">
          <div className="text-sm font-medium mb-2">Infos vente</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded border px-2 py-1 text-sm col-span-2"
              placeholder="Nom client (optionnel)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              placeholder="Patient ID (UUID)"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              placeholder="Visite ID (UUID)"
              value={visiteId}
              onChange={(e) => setVisiteId(e.target.value)}
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              placeholder="Devise"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={onStartSale}
              className="rounded bg-ink-900 text-white px-3 py-1.5 text-sm"
            >
              {isOpenCart ? "Mettre à jour la vente" : "Démarrer la vente"}
            </button>
            <span className="text-xs text-ink-600">
              Statut panier : <b>{cart?.status ?? "—"}</b>
            </span>
          </div>
        </section>

        {/* Bloc 2 — Lignes du panier */}
        <div className="flex-1 overflow-y-auto divide-y">
          {cart?.lines?.length ? (
            cart.lines.map((l) => (
              <div key={l.id} className="py-3 flex items-start justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">{l.article?.name ?? `Article #${l.article_id}`}</div>
                  <div className="text-ink-600">Code: {l.article?.code ?? l.article_id}</div>
                  <div className="text-ink-700 mt-1">
                    {l.line_ttc != null ? Number(l.line_ttc as any).toLocaleString() : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 rounded border"
                    onClick={() => setQty(l.id, Math.max(1, l.quantity - 1))}
                  >
                    −
                  </button>
                  <input
                    className="w-12 text-center rounded border"
                    value={l.quantity}
                    onChange={(e) => {
                      const n = Math.max(1, Number(e.target.value || 1));
                      setQty(l.id, n);
                    }}
                  />
                  <button
                    className="px-2 py-1 rounded border"
                    onClick={() => setQty(l.id, l.quantity + 1)}
                  >
                    +
                  </button>
                  <button className="ml-2 text-red-600" onClick={() => remove(l.id)}>
                    Suppr
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-ink-600 py-10 text-center">Panier vide</div>
          )}
        </div>

        {/* Bloc 3 — Checkout + Paiement */}
        <div className="border-t pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-ink-700">Total TTC</div>
            <div className="text-lg font-semibold">
              {Number(totalTtc ?? 0).toLocaleString()} {cart?.currency ?? ""}
            </div>
          </div>

          {/* Checkout (génère facture) */}
          {!factureId && (
            <div className="grid grid-cols-3 gap-2 items-end">
              <input
                className="col-span-2 rounded border px-2 py-1 text-sm"
                placeholder="Référence (optionnel)…"
                value={checkoutRef}
                onChange={(e) => setCheckoutRef(e.target.value)}
              />
              <button
                onClick={onCheckout}
                disabled={checkingOut || !cart?.lines?.length}
                className="w-full rounded bg-blue-600 text-white py-2 disabled:opacity-50"
                title="Valider le panier et générer une facture"
              >
                {checkingOut ? "Validation…" : "Passer en caisse"}
              </button>
            </div>
          )}

          {/* Paiement */}
          {factureId && (
            <div className="rounded border p-3 grid gap-2 bg-white">
              <div className="text-sm font-medium">
                Règlement facture <b>#{String(factureId)}</b>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="rounded border px-2 py-1 text-sm"
                  placeholder="Montant"
                  value={payMontant}
                  onChange={(e) => setPayMontant(e.target.value)}
                  inputMode="decimal"
                />
                <select
                  className="rounded border px-2 py-1 text-sm"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                >
                  <option value="ESPECES">Espèces</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CB">Carte</option>
                  <option value="CHEQUE">Chèque</option>
                </select>
                <input
                  className="rounded border px-2 py-1 text-sm"
                  placeholder="Référence paiement (optionnel)"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
                <input
                  className="rounded border px-2 py-1 text-sm"
                  placeholder="Devise"
                  value={payDevise}
                  onChange={(e) => setPayDevise(e.target.value)}
                />
              </div>
              <button
                onClick={onPay}
                disabled={paying || !payMontant}
                className="w-full rounded bg-emerald-600 text-white py-2 disabled:opacity-50"
              >
                {paying ? "Paiement…" : "Régler la facture"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
