// app/(site)/layout.tsx  (SERVER COMPONENT - pas de "use client" nécessaire)
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // AuthProvider est un composant client, c'est OK de l'utiliser dans un layout serveur
  return (
    <AuthProvider>
      <Header />
      <main className="min-h-screen pt-24 pb-20">{children}</main>
      <Footer />
    </AuthProvider>
  );
}
