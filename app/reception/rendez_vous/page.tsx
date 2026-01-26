"use client";

import React from "react";

const fakeMedecins = [
  {
    id: 1,
    nom: "Dr. MBOULOU Arlette",
    service: "Médecine générale",
    planning: [
      { date: "14/11/2025", heure: "08h00", patient: "BISSILA Brice" },
      { date: "14/11/2025", heure: "08h30", patient: "MABIKA Sonia" },
      { date: "15/11/2025", heure: "09h15", patient: "NGUIMBI Fabrice" },
      { date: "16/11/2025", heure: "10h00", patient: "MOUKOKO Prisca" },
      { date: "18/11/2025", heure: "11h30", patient: "KOUVOUAMA Kelly" },
    ],
  },
  {
    id: 2,
    nom: "Dr. KOUVOUAMA Romain",
    service: "Cardiologie",
    planning: [
      { date: "13/11/2025", heure: "08h45", patient: "LENGA Christ" },
      { date: "13/11/2025", heure: "09h30", patient: "MASSAMBA Grâce" },
      { date: "14/11/2025", heure: "11h00", patient: "MISSAMBA Junior" },
      { date: "17/11/2025", heure: "09h00", patient: "MOUANDA Aurélie" },
      { date: "20/11/2025", heure: "15h30", patient: "OKOMBI Régis" },
    ],
  },
  {
    id: 3,
    nom: "Dr. NGUIMBI Rodrigue",
    service: "Pédiatrie",
    planning: [
      { date: "12/11/2025", heure: "08h00", patient: "NDAKA Maëlys" },
      { date: "12/11/2025", heure: "08h45", patient: "KIMBEMBE Nathan" },
      { date: "15/11/2025", heure: "10h15", patient: "MASSOUA Clarisse" },
      { date: "19/11/2025", heure: "09h30", patient: "BOUETOU Elie" },
      { date: "21/11/2025", heure: "14h00", patient: "MOUISSI Christelle" },
    ],
  },
  {
    id: 4,
    nom: "Dr. OKOMBI Prisca",
    service: "Gynécologie-Obstétrique",
    planning: [
      { date: "11/11/2025", heure: "09h00", patient: "MABIALA Dorcas" },
      { date: "14/11/2025", heure: "12h30", patient: "LEKASSA Daniella" },
      { date: "16/11/2025", heure: "15h00", patient: "MOUNDOUNGA Huguette" },
      { date: "18/11/2025", heure: "09h45", patient: "NGOMA Christvie" },
      { date: "22/11/2025", heure: "11h15", patient: "YOKA Grâce-Line" },
    ],
  },
  {
    id: 5,
    nom: "Dr. LOUMOU Jean-Didier",
    service: "Neurologie",
    planning: [
      { date: "10/11/2025", heure: "08h15", patient: "KIMBANGU Kevin" },
      { date: "13/11/2025", heure: "10h45", patient: "MATSANGA Trésor" },
      { date: "17/11/2025", heure: "13h00", patient: "MPOUHO Sylvie" },
      { date: "19/11/2025", heure: "16h00", patient: "MASSAMBA Yann" },
      { date: "23/11/2025", heure: "09h30", patient: "MOUYABI Kelly-Ange" },
    ],
  },
  {
    id: 6,
    nom: "Dr. BOUANGA Mireille",
    service: "Dermatologie",
    planning: [
      { date: "09/11/2025", heure: "08h00", patient: "MOUKALA Chancel" },
      { date: "14/11/2025", heure: "10h00", patient: "NGATSÉ Prisca" },
      { date: "18/11/2025", heure: "11h45", patient: "LONTSI Arnaud" },
      { date: "20/11/2025", heure: "14h30", patient: "NGAZANA Ruth" },
      { date: "24/11/2025", heure: "16h15", patient: "MASSANGO Kelly" },
    ],
  },
];

export default function RendezVousPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📅 Planning des Rendez-vous</h1>

        {/* Bouton factice qui n'agit sur rien pour la démo */}
        <button
          type="button"
          onClick={() => {
            // volontairement vide pour la démo
            console.log("Créer un rendez-vous (démo)");
          }}
          className="inline-flex items-center rounded-lg border border-congo-green px-4 py-2 text-sm font-medium text-congo-green hover:bg-congo-green/10 transition"
        >
          + Créer un rendez-vous
        </button>
      </div>

      <p className="text-xs text-ink-600">
        Données provisoires de démonstration générées côté front-end pour illustrer
        le planning dynamique des médecins.
      </p>

      {fakeMedecins.map((m) => (
        <div
          key={m.id}
          className="rounded-xl bg-white/70 p-4 shadow-md border border-ink-100 space-y-3"
        >
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="font-semibold text-lg">{m.nom}</h2>
              <p className="text-sm text-ink-700">Service : {m.service}</p>
            </div>
            <span className="text-xs text-ink-500">
              {m.planning.length} rendez-vous planifiés
            </span>
          </div>

          <ul className="space-y-2">
            {m.planning.map((p, i) => (
              <li
                key={i}
                className="flex justify-between bg-ink-50 rounded-lg px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {p.date} • {p.heure}
                </span>
                <span>{p.patient}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
