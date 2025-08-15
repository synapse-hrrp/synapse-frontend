// app/(site)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const query = useSearchParams();
  const { login, ready, token } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (ready && token) {
    router.replace("/services");
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login(email.trim(), password);
    const redirect = query.get("redirect") || "/services";
    router.push(redirect);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fond animé dynamique */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-green-600 to-green-800 animate-gradient"></div>

      {/* Formulaire flottant */}
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-green-200 p-6 space-y-4 transform transition duration-500 hover:scale-[1.02]"
      >
        <h1 className="text-2xl font-bold text-green-800 text-center">
          Connexion
        </h1>

        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="ex: lab@hrrp.cg"
          />
        </label>

        <label className="block text-sm relative">
          Mot de passe
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-green-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="ex: lab123"
          />
          {/* Icône œil */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-gray-500 hover:text-green-700"
          >
            {showPassword ? (
              // Icône œil ouvert
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 
                  9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 
                  0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              // Icône œil barré
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M13.875 18.825A10.05 10.05 0 0112 
                  19c-4.478 0-8.268-2.943-9.542-7a10.05 
                  10.05 0 012.314-3.592m3.203-2.377A9.96 
                  9.96 0 0112 5c4.478 0 8.268 2.943 
                  9.542 7-.38 1.21-1.003 2.31-1.82 
                  3.248M15 12a3 3 0 11-6 0 3 3 0 
                  016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 3l18 18" />
              </svg>
            )}
          </button>
        </label>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-green-700 text-white font-semibold shadow-lg shadow-green-800/30 hover:bg-green-800 transition"
        >
          Se connecter
        </button>
      </form>

      {/* Styles d'animation */}
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 300% 300%;
          animation: gradient 10s ease infinite;
        }
      `}</style>
    </div>
  );
}
