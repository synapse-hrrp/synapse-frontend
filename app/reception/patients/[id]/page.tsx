// app/reception/patients/[id]/page.tsx
"use client";

import PatientShow from "@/components/modules/PatientShow";

export default function ReceptionPatientShowPage({ params }: { params: { id: string } }) {
  return <PatientShow id={params.id} contextLabel="Réception" />;
}
