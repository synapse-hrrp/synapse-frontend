// components/Footer.tsx
export default function Footer() {
  return (
    <footer
      className="
        fixed bottom-0 left-0 right-0 z-50
        bg-white/90 backdrop-blur
        border-t-4 border-green-600 shadow-inner
        text-center text-sm text-gray-600
      "
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        © {new Date().getFullYear()} Hôpital de Référence Raymond Poaty
      </div>
    </footer>
  );
}
