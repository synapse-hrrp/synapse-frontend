"use client";

export default function SiteFooter() {
  return (
    <footer className="border-t bg-white/80 mt-10">
      <div className="h-1 w-full bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
      <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-ink-700 bg-congo-green text-white">
        © {new Date().getFullYear()} Hôpital de Référence Raymond Pouaty — Brazzaville. Tous droits réservés.
        <div className="mt-1">Besoin d’aide ? Contactez le service informatique.</div>
      </div>
    </footer>
  );
}
