// app/reception/patients/page.tsx
"use client";
import PatientsList from "@/components/modules/PatientsList";

export default function ReceptionPatientsPage() {
  return <PatientsList contextLabel="Réception" basePath="/reception/patients" />;
}
