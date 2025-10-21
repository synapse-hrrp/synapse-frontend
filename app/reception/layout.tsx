// app/reception/layout.tsx
"use client";
import ReceptionShell from "@/components/ReceptionShell";

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  return <ReceptionShell>{children}</ReceptionShell>;
}
