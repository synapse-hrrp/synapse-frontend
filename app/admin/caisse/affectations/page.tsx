"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminGuard, useAuthz } from "@/lib/authz";
import {
  listUsersPaginated,
  listAllServices,
  assignUserRoles,
  syncUserServices,
} from "@/lib/api";
import { Search, CheckCircle2, X, ShieldAlert } from "lucide-react";

import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

/* ---------------- Types ---------------- */
type UserRow = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;

  roles?: Array<string | { name: string }>;
  services?: Array<{ id: number; name: string }>;

  // champ NORMALISÉ utilisé par le front
  service_ids?: number[];
};

type ServiceMini = { id: number; name: string };

const PAGE_SIZE = 12;
const CASH_ROLES = ["caissier_service", "caissier_general", "admin_caisse"] as const;

/* --------------- Page --------------- */
export default function Page() {
  return (
    <AdminGuard>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <SiteHeader />
        <TopIdentityBar />
        <main className="flex-1">
          <AffectationsInner />
        </main>
        <SiteFooter />
      </div>
    </AdminGuard>
  );
}

function AffectationsInner() {
  const { abilities, roles: myRoles } = useAuthz();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const canAssign =
    myRoles.includes("admin") ||
    myRoles.includes("admin_caisse") ||
    abilities.includes("roles.assign");

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [services, setServices] = useState<ServiceMini[]>([]);
  const [toast, setToast] = useState<{
    show: boolean;
    text: string;
    tone?: "ok" | "err";
  }>({ show: false, text: "" });

  const lastPage = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  // Charge la liste des services (pour les cases à cocher)
  useEffect(() => {
    (async () => {
      try {
        const raw = await listAllServices();
        const arr: ServiceMini[] = Array.isArray(raw) ? raw : raw?.data ?? [];
        setServices(arr);
      } catch {
        // pas dramatique
      }
    })();
  }, []);

  // 🔁 Normalise un user venant de l’API => UserRow pour le front
  function normalizeUser(u: any): UserRow {
    const roles =
      u.roles ??
      u.role_names ??
      u.role_slugs ??
      [];

    // On essaie plusieurs champs possibles pour les IDs de services
    let rawIds: any[] = [];
    if (Array.isArray(u.service_ids)) {
      rawIds = u.service_ids;
    } else if (Array.isArray(u.caisse_service_ids)) {
      rawIds = u.caisse_service_ids;
    }

    let service_ids: number[] = rawIds
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n));

    // Si pas d’ids directs, on essaie via les relations (services / caisse_services)
    if (!service_ids.length) {
      const rel =
        (Array.isArray(u.services) && u.services.length
          ? u.services
          : Array.isArray(u.caisse_services)
          ? u.caisse_services
          : []) ?? [];

      service_ids = rel
        .map((s: any) => Number(s.id))
        .filter((n) => Number.isFinite(n));
    }

    return {
      id: Number(u.id),
      name: String(u.name ?? ""),
      email: String(u.email ?? ""),
      phone: u.phone ?? u.telephone ?? null,
      roles,
      services: u.services ?? u.caisse_services ?? [],
      service_ids,
    };
  }

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const res: any = await listUsersPaginated({
        page,
        per_page: PAGE_SIZE,
        search: q.trim(),
      });

      const rawData: any[] = Array.isArray(res) ? res : res?.data ?? [];
      const data: UserRow[] = rawData.map(normalizeUser);

      setRows(data);

      const meta = res?.meta ?? {};
      setTotal(meta?.total ?? data.length);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
      setRows([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function resetAndSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function extractRoleNames(u: UserRow): string[] {
    const rs = u?.roles ?? [];
    return rs
      .map((r: any) => (typeof r === "string" ? r : r?.name))
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
  }

  function patchUserRow(userId: number, patch: Partial<UserRow>) {
    setRows((old) => old.map((r) => (r.id === userId ? { ...r, ...patch } : r)));
  }

  function RolePills({ user }: { user: UserRow }) {
    const current = extractRoleNames(user);
    const [selected, setSelected] =
      useState<"" | "caissier_service" | "caissier_general" | "admin_caisse">(
        () => (CASH_ROLES.find((r) => current.includes(r)) as any) ?? ""
      );

    // 🔑 Initialisation des services cochés à partir de ce que renvoie l’API
    const [svcIds, setSvcIds] = useState<number[]>(
      () =>
        Array.isArray(user?.service_ids)
          ? user.service_ids.filter((x) => Number.isFinite(x))
          : []
    );

    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    const isServiceMode = selected === "caissier_service";
    useEffect(() => {
      if (!isServiceMode) setSvcIds([]);
    }, [isServiceMode]);

    async function onSave() {
      try {
        if (!canAssign) throw new Error("Droits insuffisants (roles.assign).");

        setSaving(true);
        setJustSaved(false);

        const all = extractRoleNames(user);
        const nonCash = all.filter((r) => !CASH_ROLES.includes(r as any));
        const nextRoles = selected ? [...nonCash, selected] : nonCash;

        // 1) Sauve les rôles
        await assignUserRoles(user.id, nextRoles);

        // 2) Sauve les services seulement si caissier_service
        if (selected === "caissier_service") {
          await syncUserServices(user.id, svcIds);
          patchUserRow(user.id, {
            roles: nextRoles,
            service_ids: [...svcIds],
          });
        } else {
          await syncUserServices(user.id, []); // vide les liaisons caisse-service
          patchUserRow(user.id, { roles: nextRoles, service_ids: [] });
        }

        setToast({ show: true, text: "Affectation enregistrée.", tone: "ok" });
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
        setTimeout(() => setToast({ show: false, text: "" }), 2200);
      } catch (e: any) {
        setToast({
          show: true,
          text: e?.message || "Échec de l’enregistrement",
          tone: "err",
        });
        setTimeout(() => setToast({ show: false, text: "" }), 3500);
      } finally {
        setSaving(false);
      }
    }

    // 🔁 Si l’API renvoie déjà les service_ids, on synchronise le local quand user change
    useEffect(() => {
      if (Array.isArray(user?.service_ids) && selected === "caissier_service") {
        setSvcIds(
          user.service_ids.filter((x) => Number.isFinite(x))
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.service_ids?.join(","), selected]);

    const saveLabel = saving
      ? "Enregistrement…"
      : justSaved
      ? "Enregistré ✓"
      : "Enregistrer";

    const saveClasses = !canAssign
      ? "bg-gray-400 cursor-not-allowed"
      : saving
      ? "bg-blue-600 hover:bg-blue-500"
      : justSaved
      ? "bg-green-600 hover:bg-green-500"
      : "bg-gray-900 hover:bg-gray-800";

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {CASH_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelected((cur) => (cur === r ? "" : r))}
              className={`rounded-full px-2.5 py-1 text-xs font-medium border transition ${
                selected === r
                  ? "bg-green-50 border-green-300 text-green-700 shadow-sm"
                  : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {isServiceMode && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
            <div className="mb-1 text-xs font-medium text-gray-700">
              Services autorisés
            </div>
            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
              {services.map((s) => (
                <label
                  key={s.id}
                  className="inline-flex items-center gap-2 text-xs"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={svcIds.includes(s.id)}
                    onChange={(e) =>
                      setSvcIds((old) =>
                        e.target.checked
                          ? [...old, s.id]
                          : old.filter((id) => id !== s.id)
                      )
                    }
                  />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={onSave}
            disabled={!canAssign || saving}
            title={
              !canAssign
                ? "Vous n’avez pas la permission roles.assign"
                : undefined
            }
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${saveClasses} disabled:opacity-60`}
          >
            {saving && (
              <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
            )}
            {saveLabel}
          </button>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return <div className="p-6 text-sm">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {!canAssign && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          <ShieldAlert className="h-4 w-4" />
          Vous voyez la page, mais vous n’avez pas la permission{" "}
          <b>roles.assign</b> pour modifier.
        </div>
      )}

      <form
        onSubmit={resetAndSearch}
        className="rounded-xl border bg-white p-3 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, e-mail, téléphone…"
              className="w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border bg-white px-3 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            Rechercher
          </button>
        </div>
      </form>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="overflow-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <Th>Utilisateur</Th>
              <Th>E-mail</Th>
              <Th>Téléphone</Th>
              <Th>Rôle caisse</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !busy && (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-gray-500"
                >
                  Aucun utilisateur
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr
                key={u.id}
                className="align-top border-t hover:bg-gray-50/40"
              >
                <Td className="font-medium">{u.name}</Td>
                <Td>{u.email}</Td>
                <Td>{u.phone || "—"}</Td>
                <Td>
                  <RolePills user={u} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-600">
          Page {page} / {lastPage}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="rounded-md border px-2 py-1 disabled:opacity-40"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-2 py-1 disabled:opacity-40"
          >
            ‹
          </button>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage}
            className="rounded-md border px-2 py-1 disabled:opacity-40"
          >
            ›
          </button>
          <button
            onClick={() => setPage(lastPage)}
            disabled={page === lastPage}
            className="rounded-md border px-2 py-1 disabled:opacity-40"
          >
            »
          </button>
        </div>
      </div>

      <Toast
        show={toast.show}
        tone={toast.tone}
        onClose={() => setToast({ show: false, text: "" })}
      >
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">{toast.text}</span>
      </Toast>
    </div>
  );
}

/* -------- Petits composants -------- */
function Th({ children, className = "" }: any) {
  return (
    <th className={`px-3 py-2 text-left font-semibold ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }: any) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
function Toast({
  show,
  tone = "ok",
  onClose,
  children,
}: {
  show: boolean;
  tone?: "ok" | "err";
  onClose: () => void;
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "border-green-300 bg-green-50 text-green-700"
      : "border-red-300 bg-red-50 text-red-700";
  return (
    <div
      aria-live="polite"
      role="status"
      className={`fixed bottom-4 right-4 z-50 transition-all ${
        show
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 shadow-lg ring-1 ${cls}`}
      >
        {children}
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="ml-1 rounded-md p-1 text-gray-600 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
