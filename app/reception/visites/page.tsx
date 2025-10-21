// app/reception/visites/page.tsx
"use client";
import VisitesList from "@/components/modules/VisitesList";

export default function ReceptionVisitesPage() {
  return <VisitesList contextLabel="Réception" basePath="/reception/visites" />;
}
