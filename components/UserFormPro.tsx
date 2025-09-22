"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, getUser, updateUser } from "@/lib/api";
import { Check, User, Mail, Phone as PhoneIcon, Shield, Lock } from "lucide-react";

type Mode = "create" | "edit";

type FormData = {
  name: string;
  email: string;
  phone: string;
  is_active: "actif" | "inactif";
  password?: string;                 // requis en création
  password_confirmation?: string;    // requis si password présent
};

export default function UserFormPro({ mode, id }: { mode: Mode; id?: string | number }) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [data, setData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    is_active: "actif",
    password: "",
    password_confirmation: "",
  });
  const [roles, setRoles] = useState<string[]>([]); // lecture seule si renvoyé par le back

  // Charger données si édition
  useEffect(() => {
    if (mode !== "edit" || !id) return;
    (async () => {
      setBusy(true);
      try {
        const res: any = await getUser(String(id));
        const u = Array.isArray(res) ? res[0] : (res?.data ?? res);
        setData((d) => ({
          ...d,
          name: u?.name ?? "",
          email: u?.email ?? "",
          phone: u?.phone ?? "",
          is_active: u?.is_active === false ? "inactif" : "actif",
          password: "",
          password_confirmation: "",
        }));
        const rs = u?.roles ?? u?.data?.roles ?? [];
        if (Array.isArray(rs)) setRoles(rs.map((r: any) => (typeof r === "string" ? r : r?.name)).filter(Boolean));
      } catch (e: any) {
        setServerErr(e?.message || "Impossible de charger l’utilisateur.");
      } finally {
        setBusy(false);
      }
    })();
  }, [mode, id]);

  function upd<K extends keyof FormData>(k: K, v: FormData[K]) {
    setData(d => ({ ...d, [k]: v }));
  }

  // validations simples côté client (évite un aller-retour 422)
  const pwd = (data.password || "").trim();
  const pwd2 = (data.password_confirmation || "").trim();

  const passwordBlockValid =
    mode === "create"
      ? pwd.length >= 8 && pwd === pwd2
      : // en édition : si password est vide => ok ; s'il est rempli => min8 et = confirmation
        (pwd === "" ? true : (pwd.length >= 8 && pwd === pwd2));

  const canSubmit = useMemo(() => {
    if (!data.name.trim()) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return false;
    if (!passwordBlockValid) return false;
    if (mode === "create" && pwd === "") return false;
    return true;
  }, [data, mode, passwordBlockValid, pwd]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setServerErr(null);
    setBusy(true);
    try {
      const payload: any = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim() || null,
        is_active: data.is_active === "actif",
      };
      if (mode === "create") {
        payload.password = pwd;
        payload.password_confirmation = pwd2;
      } else if (pwd !== "") {
        payload.password = pwd;
        payload.password_confirmation = pwd2;
      }

      if (mode === "create") {
        await createUser(payload);
        router.replace("/users?flash=created");
      } else {
        await updateUser(String(id), payload);
        router.replace(`/users/${id}?flash=updated`);
      }
    } catch (err: any) {
      // Affiche le JSON d’erreurs Laravel si disponible
      let msg = "Échec d’enregistrement.";
      try {
        const raw = String(err?.message || "");
        // Essaye d’extraire le JSON à la fin du message
        const m = raw.match(/\{.*\}$/s);
        if (m) {
          const j = JSON.parse(m[0]);
          if (j?.message) msg = j.message;
          const errs = j?.errors || {};
          const first = Object.values(errs).flat()[0];
          if (first) msg = String(first);
        } else {
          msg = raw;
        }
      } catch {}
      setServerErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Colonne gauche : résumé */}
      <aside className="lg:col-span-1">
        <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden sticky top-20">
          <div className="h-1 bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
          <div className="p-4">
            <div className="mb-3 text-sm font-semibold">Résumé</div>
            <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 text-sm">
              <div className="space-y-1 text-ink-700">
                <div><b>Nom :</b> {data.name || "—"}</div>
                <div><b>E-mail :</b> {data.email || "—"}</div>
                <div><b>Téléphone :</b> {data.phone || "—"}</div>
                <div><b>Statut :</b> {data.is_active === "actif" ? "Actif" : "Inactif"}</div>
                {roles.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-ink-600" />
                    <span><b>Rôles :</b> {roles.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

            <ul className="mt-4 space-y-1">
              {[{label: "Identité", Icon: User}, {label: "Contact", Icon: PhoneIcon}, {label: "Sécurité", Icon: Lock}].map((s) => (
                <li key={s.label}>
                  <div className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
                    <span className="h-5 w-5 rounded-md flex items-center justify-center bg-ink-200 text-ink-800">
                      <Check className="h-3 w-3" />
                    </span>
                    <s.Icon className="h-3.5 w-3.5 text-ink-600" />
                    {s.label}
                  </div>
                </li>
              ))}
            </ul>

            {serverErr && (
              <div className="mt-4 rounded-lg border border-congo-red/30 bg-[color:var(--color-congo-red)]/10 p-2 text-sm text-congo-red">
                {serverErr}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Colonne droite : formulaire */}
      <section className="lg:col-span-2 space-y-6">
        <Card title="Identité">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom complet" required icon={<User className="h-4 w-4 text-ink-400" />}>
              <input className={inputCls} value={data.name} onChange={e=>upd("name", e.target.value)} placeholder="Ex : Kadia Alice" />
            </Field>
            <Field label="E-mail" required icon={<Mail className="h-4 w-4 text-ink-400" />}>
              <input type="email" className={inputCls} value={data.email} onChange={e=>upd("email", e.target.value)} placeholder="alice@hopital.cg" />
            </Field>
          </div>
        </Card>

        <Card title="Contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Téléphone" icon={<PhoneIcon className="h-4 w-4 text-ink-400" />}>
              <input className={inputCls} value={data.phone} onChange={e=>upd("phone", e.target.value)} placeholder="+242 06 000 0000" />
            </Field>
            <Field label="Statut">
              <select className={inputCls} value={data.is_active} onChange={e=>upd("is_active", e.target.value as any)}>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card title="Sécurité">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={mode === "create" ? "Mot de passe (min. 8)" : "Nouveau mot de passe (optionnel)"}
                   required={mode === "create"}>
              <input
                className={inputCls}
                type="password"
                value={data.password || ""}
                onChange={e=>upd("password", e.target.value)}
                placeholder={mode === "create" ? "••••••••" : "Laisser vide pour ne pas changer"}
              />
              {pwd !== "" && pwd.length < 8 && (
                <p className="mt-1 text-xs text-congo-red">Minimum 8 caractères.</p>
              )}
            </Field>

            <Field label="Confirmer le mot de passe" required={mode === "create" || !!pwd}>
              <input
                className={inputCls}
                type="password"
                value={data.password_confirmation || ""}
                onChange={e=>upd("password_confirmation", e.target.value)}
                placeholder="Répéter le mot de passe"
              />
              {pwd !== "" && pwd2 !== "" && pwd !== pwd2 && (
                <p className="mt-1 text-xs text-congo-red">La confirmation ne correspond pas.</p>
              )}
            </Field>
          </div>

          <p className="mt-2 text-xs text-ink-600">
            Rôle par défaut <b>staff</b> (côté backend). Les droits fins (ex. accès laboratoire) sont gérés via la fiche <b>Personnel</b>.
          </p>
        </Card>

        {/* Actions */}
        <div className="sticky bottom-4 z-10">
          <div className="rounded-xl bg-white/90 backdrop-blur border border-ink-100 shadow p-3 flex items-center justify-end">
            <button
              type="submit"
              disabled={busy || !canSubmit}
              className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {busy ? "Enregistrement…" : (mode === "create" ? "Créer l’utilisateur" : "Enregistrer les modifications")}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode; }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
function Field({ label, required, icon, children }: { label: string; required?: boolean; icon?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">
        {label} {required && <span className="text-congo-red">*</span>}
      </label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
        {children}
      </div>
    </div>
  );
}
const inputCls =
  "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";
