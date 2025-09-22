export default function Forbidden() {
  return (
    <div className="min-h-screen grid place-items-center bg-ink-100 text-ink-900">
      <div className="rounded-2xl bg-white p-8 shadow border border-ink-200 text-center">
        <div className="text-2xl font-semibold mb-2">Accès refusé (403)</div>
        <p className="text-ink-600">Vous n’avez pas les autorisations pour cette page.</p>
      </div>
    </div>
  );
}
