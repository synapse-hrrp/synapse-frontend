// lib/route-access.ts
export type AccessRule = {
  /** Regex de la route */
  pattern: RegExp;
  /** Au moins une de ces permissions */
  any?: string[];
  /** Toutes ces permissions */
  all?: string[];
  /** Rôles autorisés explicitement (en plus d'admin/dg) */
  allowRoles?: string[];
};

// Routes publiques non protégées
export const PUBLIC_ROUTES: RegExp[] = [
  /^\/$/,
  /^\/login(?:\/.*)?$/,
  /^\/403$/,                    // page d'erreur publique
  /^\/_next\//,
  /^\/favicon\.(?:ico|svg|png)$/,
  /^\/images?\//,
];

// RBAC matrix : ajoute/édite ici selon tes modules
export const ACCESS_RULES: AccessRule[] = [
  // Portail → réservé admin/dg
  { pattern: /^\/portail(?:\/.*)?$/, allowRoles: ["admin", "dg"] },

  // Réception → admin/dg/reception
  { pattern: /^\/reception(?:\/.*)?$/, allowRoles: ["admin", "dg", "reception"] },

  // Patients
  { pattern: /^\/patients\/?$/,                      any: ["patients.read", "patients.view"] },
  { pattern: /^\/patients\/new\/?$/,                 any: ["patients.create", "patients.write"] },
  { pattern: /^\/patients\/[^/]+\/edit\/?$/,         any: ["patients.write", "patients.update"] },
  { pattern: /^\/patients\/[^/]+\/?$/,               any: ["patients.read", "patients.view"] },

  // Admissions / Visites
  { pattern: /^\/admissions\/?$/,                    any: ["visites.read", "visites.write"] },
  { pattern: /^\/admissions\/new\/?$/,               any: ["visites.write"] },
  { pattern: /^\/admissions\/[^/]+(?:\/edit)?\/?$/,  any: ["visites.read", "visites.write"] },

  // Laboratoire
  { pattern: /^\/laboratoire\/?$/,                   any: ["labo.view", "labo.request.create", "labo.result.write"] },

  // === Caisse / Finance (aligné avec tes middlewares Laravel) ===
  // Module caisse (page principale)
  { pattern: /^\/caisse(?:\/.*)?$/,                  any: ["*", "caisse.access"] },

  // Factures (consultation / édition ouvertes aux caissiers)
  { pattern: /^\/factures(?:\/.*)?$/,                any: ["*", "caisse.access", "caisse.facture.view"] },

  // (Ajoute d’autres services/pages si besoin…)
];
