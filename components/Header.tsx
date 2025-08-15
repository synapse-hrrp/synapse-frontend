// components/Header.tsx
"use client";

import Image from "next/image";
import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";

export default function Header() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-50
        bg-white/90 backdrop-blur
        border-b-4 border-green-600 shadow-md
      "
    >
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        
        {/* Logo gauche */}
        <Image
          src="/logo-ministere.png"
          alt="Logo Ministère"
          width={60}
          height={60}
        />

        {/* Textes au centre */}
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">
            Ministère de la Santé et de la Population
          </p>
          <p className="text-xl font-bold text-green-700">
            République du Congo - Brazzaville
          </p>
        </div>

        {/* Logo droite + bouton déconnexion si connecté */}
        <div className="flex items-center gap-4">
          <Image
            src="/logo-ministere.png"
            alt="Logo Ministère"
            width={60}
            height={60}
          />
          {token && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
            >
              Déconnexion
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
