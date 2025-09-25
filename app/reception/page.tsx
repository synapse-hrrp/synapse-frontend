"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReception } from "./layout";

export default function ReceptionIndex() {
  const { caps } = useReception();
  const router = useRouter();

  useEffect(() => {
    if (caps.patients.read)      router.replace("/reception/patients");
    else if (caps.visites.read)  router.replace("/reception/visites");
    else if (caps.stats.view)    router.replace("/reception/stats");
    else                         router.replace("/portail");
  }, [caps, router]);

  return null;
}
