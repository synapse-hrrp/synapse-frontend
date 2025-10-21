"use client";
import { useParams } from "next/navigation";
import ReceptionShell from "@/components/ReceptionShell";
import VisiteEdit from "@/components/modules/VisiteEdit";

export default function ReceptionVisiteEdit() {
  const { id } = useParams<{id:string}>();
  return (
    <ReceptionShell>
      <VisiteEdit id={id} contextLabel="Réception" />
    </ReceptionShell>
  );
}
