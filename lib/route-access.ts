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
  /^\/403$/,
  /^\/_next\//,
  /^\/favicon\.(?:ico|svg|png)$/,
  /^\/images?\//,
];

// RBAC matrix
export const ACCESS_RULES: AccessRule[] = [
  // Portail → admin/dg
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

  // ================== Caisse (ALIGNÉ AVEC TON SEEDER) ==================
  // POS /caisse → permission générique du module
 { pattern: /^\/caisse\/ma\/?$/, any: ["caisse.access"] },

  // Rapport → permission dédiée report
  { pattern: /^\/caisse\/rapport(?:\/.*)?$/,         any: ["caisse.report.view"] },

  // Audit admin → permission dédiée audit
  { pattern: /^\/caisse\/admin\/audit(?:\/.*)?$/,    any: ["caisse.audit.view"] },

  // Factures (si tu les exposes par ici)
  { pattern: /^\/factures(?:\/.*)?$/,                any: ["caisse.access", "caisse.facture.view"] },

  // Admin Caisse → écran d’affectation (autorisé à admin, admin_caisse ou roles.assign)
{ pattern: /^\/admin\/caisse\/affectations(?:\/.*)?$/, allowRoles: ["admin", "admin_caisse"], any: ["roles.assign"] },

];
