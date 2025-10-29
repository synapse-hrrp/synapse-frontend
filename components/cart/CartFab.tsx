"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import CartDrawer from "./CartDrawer";

export default function CartFab() {
  const { count, totalTtc } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg bg-blue-600 text-white px-4 py-3 flex items-center gap-2"
        aria-label="Ouvrir le panier"
      >
        🧺
        <span className="text-sm font-semibold">{count}</span>
        <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{Number(totalTtc).toLocaleString()}</span>
      </button>
      {open && <CartDrawer onClose={() => setOpen(false)} />}
    </>
  );
}
