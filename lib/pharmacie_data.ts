// lib/pharmacie_data.ts
export type Prod = {
  id: string;
  name: string;
  img: string;
  forme: "comprimé" | "gélule" | "sirop" | "injectable" | "pommade";
  labo: "Pfizer" | "Sanofi" | "GSK" | "Roche" | "Local";
  dosage: string;
  stock: number;
};
export type Famille = { slug: string; label: string; items: Prod[] };

const FORMES: Prod["forme"][] = ["comprimé","gélule","sirop","injectable","pommade"];
const LABOS: Prod["labo"][]  = ["Pfizer","Sanofi","GSK","Roche","Local"];

// Générateur de démo (placeholders)
function gen(prefix: string, img: string, n = 20): Prod[] {
  return Array.from({ length: n }).map((_, i) => ({
    id: `${prefix}-${i + 1}`,
    name: `${prefix.toUpperCase()} ${i + 1}`,
    img,
    forme: FORMES[i % FORMES.length],
    labo: LABOS[i % LABOS.length],
    dosage: ["125 mg","250 mg","500 mg","250 mg/5 ml","1 g"][i % 5],
    stock: (i * 7) % 120,
  }));
}

/** Étend une liste d'items en la répétant jusqu'à 'count', avec IDs uniques */
function expandItems(base: Prod[], count = 20): Prod[] {
  if (base.length === 0) return [];
  const out: Prod[] = [];
  for (let i = 0; i < count; i++) {
    const b = base[i % base.length];
    out.push({
      ...b,
      id: `${b.id}-${i + 1}`, // évite les doublons d'ID
    });
  }
  return out;
}

/* =========
 * Assure-toi que ces fichiers existent sous /public :
 * /images/pharmacie/antibiotiques/amoxicilline.png
 * /images/pharmacie/antibiotiques/azithromycine.png
 * /images/pharmacie/antibiotiques/ceftriaxone.png
 * /images/pharmacie/antalgique/paracetamol.png
 * /images/pharmacie/antalgique/ibuprofene.png
 * /images/pharmacie/antalgique/tramadol.png
 * /images/pharmacie/vitamines/vitamine-c.png
 * /images/pharmacie/vitamines/vitamine-d.png
 * /images/pharmacie/vitamines/multivitamine.png
 * ========= */

const ANTIBIOTIQUES_BASE: Prod[] = [
  {
    id: "amoxicilline",
    name: "Amoxicilline",
    img: "/images/pharmacie/antibiotiques/amoxicilline.png",
    forme: "gélule",
    labo: "Sanofi",
    dosage: "500 mg",
    stock: 42,
  },
  {
    id: "azithromycine",
    name: "Azithromycine",
    img: "/images/pharmacie/antibiotiques/azithromycine.png",
    forme: "comprimé",
    labo: "Pfizer",
    dosage: "500 mg",
    stock: 30,
  },
  {
    id: "ceftriaxone",
    name: "Ceftriaxone",
    img: "/images/pharmacie/antibiotiques/ceftriaxone.png",
    forme: "injectable",
    labo: "Roche",
    dosage: "1 g",
    stock: 15,
  },
];

const ANTALGIQUES_BASE: Prod[] = [
  {
    id: "paracetamol",
    name: "Paracétamol",
    img: "/images/pharmacie/antalgique/paracetamol.png",
    forme: "comprimé",
    labo: "Local",
    dosage: "500 mg",
    stock: 120,
  },
  {
    id: "ibuprofene",
    name: "Ibuprofène",
    img: "/images/pharmacie/antalgique/ibuprofene.png",
    forme: "comprimé",
    labo: "GSK",
    dosage: "400 mg",
    stock: 65,
  },
  {
    id: "tramadol",
    name: "Tramadol",
    img: "/images/pharmacie/antalgique/tramadol.png",
    forme: "comprimé",
    labo: "Sanofi",
    dosage: "50 mg",
    stock: 22,
  },
];

const VITAMINES_BASE: Prod[] = [
  {
    id: "vitamine-c",
    name: "Vitamine C",
    img: "/images/pharmacie/vitamines/vitamine-c.png",
    forme: "comprimé",
    labo: "Local",
    dosage: "500 mg",
    stock: 80,
  },
  
  {
    id: "multivitamine",
    name: "Multivitamines",
    img: "/images/pharmacie/vitamines/multivitamine.png",
    forme: "comprimé",
    labo: "Local",
    dosage: "—",
    stock: 50,
  },
];

const SIROPS_BASE: Prod[] = [
  {
    id: "Siro 1",
    name: "Siro 1",
    img: "/images/pharmacie/sirops/Siro1.png",
    forme: "comprimé",
    labo: "Local",
    dosage: "500 mg",
    stock: 80,
  },
  
  {
    id: "Siro 2",
    name: "Siro 2",
    img: "/images/pharmacie/sirops/Siro2.png",
    forme: "comprimé",
    labo: "Local",
    dosage: "500 mg",
    stock: 80,
  },
  {
    id: "Siro 3",
    name: "Siro 3",
    img: "/images/pharmacie/sirops/Siro3.png",
    forme: "comprimé",
    labo: "Local",
    dosage: "500 mg",
    stock: 80,
  },
  {
    id: "Siro 4",
    name: "Siro 4",
    img: "/images/pharmacie/sirops/Siro4.png",
    forme: "comprimé",
    labo: "Local",
    dosage: "500 mg",
    stock: 80,
  },
];

export const FAMILLES: Famille[] = [
  {
    slug: "antibiotiques",
    label: "ANTIBIOTIQUES",
    items: expandItems(ANTIBIOTIQUES_BASE, 20), // → 5 lignes × 4 colonnes
  },
  {
    slug: "antalgiques",
    label: "ANTALGIQUES",
    items: expandItems(ANTALGIQUES_BASE, 20),
  },
  {
    slug: "vitamines",
    label: "VITAMINES",
    items: expandItems(VITAMINES_BASE, 20),
  },

  // Familles en démo avec placeholders
  {
    slug: "sirops",
    label: "SIROPS",
    items: expandItems(SIROPS_BASE, 20),
  },
  {
    slug: "injectables",
    label: "INJECTABLES",
    items: gen("Inj", "/images/pharmacie/_placeholders/box4.png"),
  },
  {
    slug: "pediatrie",
    label: "PÉDIATRIE",
    items: gen("Pedia", "/images/pharmacie/_placeholders/box6.png"),
  },
  {
    slug: "antipaludeens",
    label: "ANTIPALUDÉENS",
    items: gen("Pal", "/images/pharmacie/_placeholders/box1.png"),
  },
  {
    slug: "dermato",
    label: "DERMATO",
    items: gen("Derm", "/images/pharmacie/_placeholders/box2.png"),
  },
];
