"use client";

import { ReactNode } from "react";
import PharmacieLayout from "@/components/layouts/PharmacieLayout";
import { CartProvider } from "@/components/cart/CartProvider";
import CartFab from "@/components/cart/CartFab";

export default function PharmacieSegmentLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <PharmacieLayout>
        {children}
        <CartFab />
      </PharmacieLayout>
    </CartProvider>
  );
}
