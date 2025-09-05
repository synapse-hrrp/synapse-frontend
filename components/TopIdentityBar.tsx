"use client";

import Image from "next/image";

export default function TopIdentityBar() {
  return (
    <div className="bg-congo-green text-white">
      <div className="mx-auto max-w-7xl px-4 py-2 text-xs sm:text-sm flex items-center justify-between">
        {/* Logo à gauche */}
        <Image
          src="/logo-hospital.png"
          alt="Logo Hôpital"
          width={32}
          height={20}
          className="object-contain"
        />

        {/* Texte centré */}
        <div className="flex-1 text-center font-medium">
          République du Congo – Ministère de la Santé et de la Population
        </div>

        {/* Drapeau à droite */}
        <Image
          src="/congo.png"
          alt="Drapeau Congo"
          width={32}
          height={20}
          className="object-contain"
        />
      </div>
    </div>
  );
}
