// app/reception/patients/page.tsx
"use client";
import PatientNew from "@/components/modules/PatientNew";

export default function ReceptionPatientsPage() {
  return <PatientNew contextLabel="Réception" basePath="/reception/patients/new" />;
}
