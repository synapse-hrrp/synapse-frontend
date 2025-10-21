"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLaboratoire } from "@/components/LabShell";

export default function LaboratoireIndex() {
  const { caps } = useLaboratoire();
  const router = useRouter();

  useEffect(() => {
    // 1) Examens en priorité
    if (caps.examens.view || caps.examens.requestCreate || caps.examens.resultWrite) {
      router.replace("/laboratoire/examens");
      return;
    }
    // 2) Puis stats
    if (caps.stats.view) {
      router.replace("/laboratoire/stats");
      return;
    }
    // 3) Sinon portail
    router.replace("/portail");
  }, [caps, router]);

  return null;
}
