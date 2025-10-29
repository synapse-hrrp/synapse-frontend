// app/personnels/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  getToken,
  me,
  getPersonnel,
  updatePersonnel,
  listAllServices,
  listUsersPaginated,
  // ↓↓↓ ajoutés pour l’upload (avatar/extra)
  uploadPersonnelAvatar,
  uploadPersonnelExtra,      // optionnel si tu as la route côté back
  deletePersonnelAvatar,
  deletePersonnelExtra,      // optionnel si tu as la route côté back
} from "@/lib/api";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  User as UserIcon,
  Building2,
  Briefcase,
  MapPin,
} from "lucide-react";

/* ---------------- Types ---------------- */
type Payload = {
  user_id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  sex: "M" | "F";
  date_of_birth: string; // YYYY-MM-DD | ""
  cin: string;
  phone_alt: string;
  address: string;
  city: string;
  country: string;
  job_title: string;
  hired_at: string; // YYYY-MM-DD | ""
  service_id: string;
  avatar_path: string;
  extra: string; // JSON stringifié
};

type ServiceDTO = { id: number; slug: string; name: string };
type UserMini = { id: number; name: string; email?: string | null };

const steps = [
  { key: "identite", label: "Identité", icon: UserIcon },
  { key: "coordonnees", label: "Coordonnées", icon: MapPin },
  { key: "emploi", label: "Emploi & Service", icon: Briefcase },
  { key: "fichiers", label: "Avatar & Extra", icon: Building2 },
] as const;

/* ---------------- Helpers ---------------- */
function toNumberOrNull(v: string) {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" ? n : null;
}
function nullifyEmpty<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj))
    out[k] = v === "" || v === undefined ? null : v;
  return out;
}
function telMask(v: string) {
  return v.replace(/[^\d+ ]/g, "");
}
// URL publique (pour afficher /storage/xxx.jpg)
const API_BASE_PUBLIC = process.env.NEXT_PUBLIC_API_BASE || "";
function publicUrlMaybe(path: string) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path;
  return `${API_BASE_PUBLIC.replace(/\/+$/, "")}${path}`;
}

/* ---------------- Page ---------------- */
export default function PersonnelEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Étapes UI
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Chargement fiche
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Payload | null>(null);

  // Listes dropdown
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [users, setUsers] = useState<UserMini[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Garde simple (auth)
  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.replace(`/login?next=/personnels/${id}/edit`);
      return;
    }
    me().catch(() =>
      window.location.replace(`/login?next=/personnels/${id}/edit`)
    );
  }, [id]);

  // Charge la fiche personnel
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const raw: any =
          (await getPersonnel(id))?.data ?? (await getPersonnel(id));
        setData({
          user_id: String(raw.user_id ?? ""),
          matricule: raw.matricule ?? "",
          first_name: raw.first_name ?? "",
          last_name: raw.last_name ?? "",
          sex: (raw.sex as any) || "M",
          date_of_birth: raw.date_of_birth || "",
          cin: raw.cin || "",
          phone_alt: raw.phone_alt || "",
          address: raw.address || "",
          city: raw.city || "",
          country: raw.country || "Congo",
          job_title: raw.job_title || "",
          hired_at: raw.hired_at || "",
          service_id: raw.service_id != null ? String(raw.service_id) : "",
          avatar_path: raw.avatar_path || "",
          extra: raw.extra ? JSON.stringify(raw.extra) : "",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Charge listes (services + users)
  useEffect(() => {
    (async () => {
      try {
        setLoadingLists(true);

        // Services
        const svcRes = await listAllServices();
        const svcArr: ServiceDTO[] = Array.isArray(svcRes?.data)
          ? svcRes.data
          : Array.isArray(svcRes)
          ? svcRes
          : [];
        setServices(svcArr);

        // Users (on charge large pour la dropdown)
        const usrRes: any = await listUsersPaginated({
          page: 1,
          per_page: 200,
          search: "",
        });
        const usrArr: UserMini[] = Array.isArray(usrRes?.data)
          ? usrRes.data
          : Array.isArray(usrRes)
          ? usrRes
          : [];
        setUsers(
          usrArr
            .map((u: any) => ({ id: u.id, name: u.name, email: u.email }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch {
        setServices([]);
        setUsers([]);
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  const progress = ((step + 1) / steps.length) * 100;
  function upd<K extends keyof Payload>(k: K, v: Payload[K]) {
    setData((d) => (d ? { ...d, [k]: v } : d));
  }
  function next() {
    if (step < steps.length - 1) setStep(step + 1);
  }
  function prev() {
    if (step > 0) setStep(step - 1);
  }

  const age = useMemo(() => {
    if (!data?.date_of_birth) return "";
    const d = new Date(data.date_of_birth);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a >= 0 ? a : "";
  }, [data?.date_of_birth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    try {
      // Parse du JSON "extra" sécurisé
      let extraParsed: any = null;
      if (data.extra) {
        try {
          extraParsed = JSON.parse(data.extra);
        } catch {
          alert("Le champ Extra doit être un JSON valide.");
          setBusy(false);
          return;
        }
      }

      const raw = {
        user_id: Number(data.user_id),
        matricule: data.matricule.trim(),
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        sex: data.sex as "M" | "F",
        date_of_birth: data.date_of_birth || null,
        cin: data.cin || null,
        phone_alt: data.phone_alt || null,
        address: data.address || null,
        city: data.city || null,
        country: data.country || null,
        job_title: data.job_title || null,
        hired_at: data.hired_at || null,
        service_id: toNumberOrNull(data.service_id),
        avatar_path: data.avatar_path || null,
        extra: extraParsed,
      };

      await updatePersonnel(id, nullifyEmpty(raw));
      router.replace(`/personnels/${id}?flash=updated`);
    } catch (err: any) {
      alert(
        "Erreur: " +
          (err?.message ||
            "inconnue. Vérifiez les champs requis et réessayez.")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader
        title="Modifier la fiche personnel"
        subtitle="Mettre à jour les informations"
        logoSrc="/logo-hospital.png"
        avatarSrc="/Gloire.png"
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Fil d’Ariane + actions */}
        <div className="mb-6 flex items-center justify-between">
          <nav className="text-sm text-ink-600">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/personnels" className="hover:underline">
                  Personnels
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link
                  href={`/personnels/${id}`}
                  className="hover:underline"
                >
                  Détail
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="font-medium text-ink-900">Modifier</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={`/personnels/${id}`}
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Annuler
            </Link>
            <button
              form="personnel-edit-form"
              type="submit"
              className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Enregistrer
            </button>
          </div>
        </div>

        {/* Form */}
        {loading || !data ? (
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm animate-pulse h-60" />
        ) : (
          <form
            id="personnel-edit-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Étapes */}
            <aside className="lg:col-span-1">
              <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden sticky top-20">
                <div className="h-1 bg-[linear-gradient(90deg,var(--color-congo-green),var(--color-congo-yellow),var(--color-congo-red))]" />
                <div className="p-4">
                  <div className="mb-3 text-sm font-semibold">Progression</div>
                  <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
                    <div
                      className="h-full bg-congo-green transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <ul className="mt-4 space-y-1">
                    {steps.map((s, i) => {
                      const Icon = s.icon;
                      const active = i === step;
                      const done = i < step;
                      return (
                        <li key={s.key}>
                          <button
                            type="button"
                            onClick={() => setStep(i)}
                            className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition
                              ${
                                active
                                  ? "bg-congo-greenL text-congo-green ring-1 ring-congo-green/30"
                                  : done
                                  ? "text-ink-700 hover:bg-ink-50"
                                  : "text-ink-500 hover:bg-ink-50"
                              }`}
                          >
                            <span
                              className={`h-5 w-5 rounded-md flex items-center justify-center
                              ${
                                active
                                  ? "bg-congo-green text-white"
                                  : done
                                  ? "bg-ink-200 text-ink-800"
                                  : "bg-ink-100 text-ink-600"
                              }`}
                            >
                              {done ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Icon className="h-3.5 w-3.5" />
                              )}
                            </span>
                            {s.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {/* résumé */}
                  <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50 p-3 text-sm">
                    <div className="font-medium text-ink-800">Résumé</div>
                    <div className="mt-1 space-y-1 text-ink-700">
                      <div>
                        <b>Nom :</b> {data.last_name || "—"} {data.first_name || ""}
                      </div>
                      <div>
                        <b>Matricule :</b> {data.matricule || "—"}
                      </div>
                      <div>
                        <b>Âge :</b> {age || "—"}
                      </div>
                      <div>
                        <b>Fonction :</b> {data.job_title || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Champs */}
            <section className="lg:col-span-2 space-y-6">
              {/* Identité */}
              {step === 0 && (
                <Card title="Identité" icon={<UserIcon className="h-4 w-4" />}>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    {/* Utilisateur (dropdown) */}
                    <Field label="Utilisateur" required>
                      <select
                        className={inputCls}
                        value={data.user_id}
                        onChange={(e) => upd("user_id", e.target.value)}
                        disabled={loadingLists}
                      >
                        <option value="">
                          {loadingLists ? "Chargement..." : "— Sélectionner —"}
                        </option>
                        {users.map((u) => (
                          <option key={u.id} value={String(u.id)}>
                            {u.name}
                            {u.email ? ` — ${u.email}` : ""}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Matricule" required className="sm:col-span-2">
                      <input
                        className={inputCls}
                        value={data.matricule}
                        onChange={(e) => upd("matricule", e.target.value)}
                        placeholder="HOSP-0001"
                      />
                    </Field>

                    <Field label="Nom" required>
                      <input
                        className={inputCls}
                        value={data.last_name}
                        onChange={(e) => upd("last_name", e.target.value.toUpperCase())}
                        placeholder="NGOMA"
                      />
                    </Field>
                    <Field label="Prénom" required>
                      <input
                        className={inputCls}
                        value={data.first_name}
                        onChange={(e) => upd("first_name", e.target.value)}
                        placeholder="Pierre"
                      />
                    </Field>

                    <Field label="Sexe">
                      <select
                        className={inputCls}
                        value={data.sex}
                        onChange={(e) => upd("sex", e.target.value as any)}
                      >
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </Field>
                    <Field label="Date de naissance">
                      <input
                        type="date"
                        className={inputCls}
                        value={data.date_of_birth}
                        onChange={(e) => upd("date_of_birth", e.target.value)}
                      />
                    </Field>
                    <Field label="CIN">
                      <input
                        className={inputCls}
                        value={data.cin}
                        onChange={(e) => upd("cin", e.target.value)}
                        placeholder="Carte d'identité"
                      />
                    </Field>
                  </div>
                </Card>
              )}

              {/* Coordonnées */}
              {step === 1 && (
                <Card title="Coordonnées" icon={<MapPin className="h-4 w-4" />}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Téléphone (alt)">
                      <input
                        className={inputCls}
                        value={data.phone_alt}
                        onChange={(e) => upd("phone_alt", telMask(e.target.value))}
                        placeholder="+242 06 000 0000"
                      />
                    </Field>
                    <Field label="Adresse">
                      <input
                        className={inputCls}
                        value={data.address}
                        onChange={(e) => upd("address", e.target.value)}
                      />
                    </Field>
                    <Field label="Ville">
                      <input
                        className={inputCls}
                        value={data.city}
                        onChange={(e) => upd("city", e.target.value)}
                      />
                    </Field>
                    <Field label="Pays">
                      <input
                        className={inputCls}
                        value={data.country}
                        onChange={(e) => upd("country", e.target.value)}
                      />
                    </Field>
                  </div>
                </Card>
              )}

              {/* Emploi & Service */}
              {step === 2 && (
                <Card title="Emploi & Service" icon={<Briefcase className="h-4 w-4" />}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Fonction">
                      <input
                        className={inputCls}
                        value={data.job_title}
                        onChange={(e) => upd("job_title", e.target.value)}
                        placeholder="Infirmier, Pharmacien…"
                      />
                    </Field>
                    <Field label="Date d’embauche">
                      <input
                        type="date"
                        className={inputCls}
                        value={data.hired_at}
                        onChange={(e) => upd("hired_at", e.target.value)}
                      />
                    </Field>

                    {/* Service (dropdown) */}
                    <Field label="Service">
                      <select
                        className={inputCls}
                        value={data.service_id}
                        onChange={(e) => upd("service_id", e.target.value)}
                        disabled={loadingLists}
                      >
                        <option value="">
                          {loadingLists ? "Chargement..." : "— Sélectionner —"}
                        </option>
                        {services.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Card>
              )}

              {/* Avatar & Extra */}
              {step === 3 && (
                <Card title="Avatar & Extra" icon={<Building2 className="h-4 w-4" />}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* AVATAR */}
                    <div className="space-y-2">
                      <ImagePickerGeneric
                        label="Avatar (importer / caméra)"
                        currentPath={data.avatar_path || ""}
                        setPath={(p) => upd("avatar_path", p)}
                        onUpload={async (file) => {
                          // envoie vers /admin/personnels/{id}/avatar
                          const path = await uploadPersonnelAvatar(id, file);
                          return path; // ex: "/storage/avatars/xxx.jpg"
                        }}
                        onDelete={async () => { await deletePersonnelAvatar(id); }}
                      />
                      <Field label="Chemin avatar (lecture seule)">
                        <input className={inputCls} value={data.avatar_path} readOnly />
                      </Field>
                    </div>

                    {/* EXTRA : image optionnelle + JSON */}
                    <div className="space-y-2">
                      <ImagePickerGeneric
                        label="Extra (photo/fichier optionnel)"
                        currentPath={(() => {
                          try {
                            const j = data.extra ? JSON.parse(data.extra) : null;
                            return j?.extra_path ?? "";
                          } catch {
                            return "";
                          }
                        })()}
                        setPath={(p) => {
                          // on stocke extra comme JSON avec un champ extra_path
                          const obj = (() => {
                            try { return data.extra ? JSON.parse(data.extra) : {}; } catch { return {}; }
                          })();
                          obj.extra_path = p;
                          upd("extra", JSON.stringify(obj));
                        }}
                        onUpload={async (file) => {
                          // si tu as /admin/personnels/{id}/extra côté Laravel :
                          // const path = await uploadPersonnelExtra(id, file); return path;

                          // sinon provisoire : réutilise l’endpoint avatar
                          const path = await uploadPersonnelAvatar(id, file);
                          return path;
                        }}
                        // onDelete={async () => { await deletePersonnelExtra(id); }} // décommente si tu as la route
                      />

                      <Field label="Extra (JSON)">
                        <textarea
                          rows={4}
                          className={inputCls}
                          value={data.extra}
                          onChange={(e) => upd("extra", e.target.value)}
                          placeholder='{"badge":"or","extra_path":"/storage/extras/xxx.jpg"}'
                        />
                      </Field>

                      <div className="text-xs text-ink-500">
                        🔒 Aucun enregistrement automatique. Téléverse pour obtenir un chemin,
                        puis clique sur <b>“Enregistrer les modifications”</b> pour sauvegarder la fiche.
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Actions */}
              <div className="sticky bottom-4 z-10">
                <div className="rounded-xl bg-white/90 backdrop-blur border border-ink-100 shadow p-3 flex items-center justify-between">
                  <div className="text-xs text-ink-600">
                    Étape <b>{step + 1}</b> / {steps.length}
                  </div>

                  <div className="flex items-center gap-2">
                    {step > 0 && (
                      <button
                        type="button"
                        className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50"
                        onClick={prev}
                      >
                        Précédent
                      </button>
                    )}

                    {step < steps.length - 1 ? (
                      // 🟢 Étapes intermédiaires : juste passer à la suivante
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                        onClick={next}
                      >
                        Suivant <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      // ✅ Dernière étape : enregistrement manuel (pas de "submit" auto)
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleSubmit}
                        className="rounded-lg bg-congo-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {busy ? "Enregistrement…" : "Enregistrer"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </section>
          </form>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

/* ---------------- UI helpers ---------------- */
function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}
function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-ink-600">
        {label} {required && <span className="text-congo-red">*</span>}
      </label>
      {children}
    </div>
  );
}
const inputCls =
  "mt-1 w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20";

/* ---------------- Image Picker (import + caméra) ---------------- */
function ImagePickerGeneric({
  label,
  currentPath,
  setPath,
  onUpload,
  onDelete,
}: {
  label: string;
  currentPath: string;
  setPath: (p: string) => void;
  onUpload: (file: File) => Promise<string>;
  onDelete?: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<string>(currentPath || "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCam, setShowCam] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { setPreview(currentPath || ""); }, [currentPath]);

  useEffect(() => {
    // stop cam au démontage
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setShowCam(true);
    } catch {
      alert("Impossible d'accéder à la caméra.");
    }
  }
  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCam(false);
  }
  function captureFrame() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(f);
      setPreview(URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  }

  async function handleUpload() {
    if (!file) {
      alert("Choisis une image (ou prends une photo) d'abord.");
      return;
    }
    setBusy(true);
    try {
      const path = await onUpload(file);
      setPath(path);
      alert("Fichier téléversé. La fiche n'est PAS encore enregistrée — clique sur “Enregistrer les modifications”.");
    } catch {
      alert("Échec du téléversement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-ink-600">{label}</div>

      {(preview || currentPath) ? (
        <img
          src={publicUrlMaybe(preview || currentPath)}
          alt="preview"
          className="h-32 w-32 object-cover rounded-lg border border-ink-100"
        />
      ) : (
        <div className="h-32 w-32 grid place-items-center rounded-lg border border-dashed border-ink-200 text-ink-400 text-xs">
          Aucune image
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            capture="environment" // mobile → ouvre la caméra
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFile(f);
              setPreview(URL.createObjectURL(f));
            }}
          />
          Importer / Prendre (mobile)
        </label>

        <button
          type="button"
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50"
          onClick={startCamera}
        >
          Prendre une photo (caméra)
        </button>

        <button
          type="button"
          className="rounded-lg bg-congo-green px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-60"
          onClick={handleUpload}
          disabled={busy}
        >
          {busy ? "Téléversement..." : "Téléverser maintenant"}
        </button>

        {onDelete && currentPath ? (
          <button
            type="button"
            className="rounded-lg border border-red-200 text-red-700 bg-white px-3 py-2 text-sm hover:bg-red-50"
            onClick={async () => {
              if (!confirm("Supprimer l'image actuelle ?")) return;
              try { await onDelete(); setPath(""); setPreview(""); } catch { alert("Suppression échouée."); }
            }}
          >
            Supprimer
          </button>
        ) : null}
      </div>

      {/* Modal caméra */}
      {showCam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center z-50">
          <div className="bg-white rounded-2xl p-4 w-full max-w-md space-y-3">
            <video ref={videoRef} className="w-full rounded-lg bg-black" />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50"
                onClick={stopCamera}
              >
                Fermer
              </button>
              <button
                type="button"
                className="rounded-lg bg-congo-green px-3 py-2 text-sm text-white hover:bg-green-700"
                onClick={() => { captureFrame(); stopCamera(); }}
              >
                Capturer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
