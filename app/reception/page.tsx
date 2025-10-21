// app/reception/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReceptionIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/reception/patients"); }, [router]);
  return null;
}
