// lib/mock-data.ts
import type { ServiceSlug } from "./roles";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  password: string;      // démo uniquement (ne pas faire en prod)
  role:
    | "admin" | "laboratoire" | "imagerie" | "pharmacie" | "urgences"
    | "hospitalisation" | "maternite" | "pediatrie" | "medecin" | "reception";
  allowedServices: ServiceSlug[]; // services visibles pour l'utilisateur
};

export const MOCK_USERS: MockUser[] = [
  {
    id: "u_admin",
    name: "Admin",
    email: "admin@admin.cg",
    password: "admin123",
    role: "admin",
    allowedServices: ["urgences","consultations","laboratoire","imagerie","pharmacie","hospitalisation","maternite","pediatrie"],
  },
  {
    id: "u_lab",
    name: "Lab Tech",
    email: "lab@hrrp.cg",
    password: "lab123",
    role: "laboratoire",
    allowedServices: ["laboratoire"],
  },
  {
    id: "u_img",
    name: "Radio",
    email: "imagerie@hrrp.cg",
    password: "img123",
    role: "imagerie",
    allowedServices: ["imagerie"],
  },
  {
    id: "u_urg",
    name: "Urgences",
    email: "urgences@hrrp.cg",
    password: "urg123",
    role: "urgences",
    allowedServices: ["urgences"],
  },
  {
    id: "u_pharm",
    name: "Pharma",
    email: "pharmacie@hrrp.cg",
    password: "pharm123",
    role: "pharmacie",
    allowedServices: ["pharmacie"],
  },
  {
    id: "u_med",
    name: "Medecin",
    email: "medecin@hrrp.cg",
    password: "med123",
    role: "medecin",
    allowedServices: ["consultations","hospitalisation"],
  },
  {
    id: "u_rec",
    name: "Accueil",
    email: "reception@hrrp.cg",
    password: "rec123",
    role: "reception",
    allowedServices: ["consultations"],
  },
  {
    id: "u_mat",
    name: "Sage-femme",
    email: "maternite@hrrp.cg",
    password: "mat123",
    role: "maternite",
    allowedServices: ["maternite"],
  },
];

export const SERVICE_DATA: Record<ServiceSlug, any> = {
  urgences:       { patientsEnAttente: 7, litsDispo: 2, dernierIncident: "14:32" },
  consultations:  { rdvAujourdHui: 24, medecinsDispo: 5, salleLibre: 2 },
  laboratoire:    { examensEnCours: 12, prelevements: 8, retards: 1 },
  imagerie:       { scansDuJour: 9, irm: 2, rayonsX: 7 },
  pharmacie:      { ruptures: ["Amoxicilline"], commandesEnCours: 3 },
  hospitalisation:{ litsOccupes: 41, litsTotal: 50, sortiesPrevues: 3 },
  maternite:      { accouchements: 2, consultationsPrenatales: 6 },
  pediatrie:      { patients: 13, vaccinations: 5 },
};
