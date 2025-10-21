// app/reception/patients/[id]/edit/page.tsx
"use client";

import PatientEdit from "@/components/modules/PatientEdit";

export default function ReceptionPatientEditPage({ params }: { params: { id: string } }) {
  return <PatientEdit id={params.id} contextLabel="Réception" />;
}
