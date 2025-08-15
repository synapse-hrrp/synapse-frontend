// lib/roles.ts
export type Role = "admin" | "medecin" | "infirmier" | "reception" |
  "laboratoire" | "imagerie" | "pharmacie" | "urgences" | "hospitalisation" | "maternite" | "pediatrie";

export type ServiceSlug =
  | "urgences" | "consultations" | "laboratoire" | "imagerie"
  | "pharmacie" | "hospitalisation" | "maternite" | "pediatrie";

export const ALL_SERVICES: { slug: ServiceSlug; label: string }[] = [
  { slug: "urgences", label: "Urgences" },
  { slug: "consultations", label: "Consultations" },
  { slug: "laboratoire", label: "Laboratoire" },
  { slug: "imagerie", label: "Imagerie" },
  { slug: "pharmacie", label: "Pharmacie" },
  { slug: "hospitalisation", label: "Hospitalisation" },
  { slug: "maternite", label: "Maternité" },
  { slug: "pediatrie", label: "Pédiatrie" },
];

// Admin = accès à tout
export function hasAccess(role: Role, slug: ServiceSlug | null, allowedServices: ServiceSlug[] = []) {
  if (!slug) return false;
  if (role === "admin") return true;
  return allowedServices.includes(slug);
}
