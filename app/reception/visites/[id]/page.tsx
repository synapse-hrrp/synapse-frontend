"use client";
import { useParams } from "next/navigation";
import ReceptionShell from "@/components/ReceptionShell";
import VisiteShow from "@/components/modules/VisiteShow";

export default function ReceptionVisiteShow() {
  const { id } = useParams<{id:string}>();
  return (
    <ReceptionShell>
      <VisiteShow id={id} contextLabel="Réception" />
    </ReceptionShell>
  );
}
