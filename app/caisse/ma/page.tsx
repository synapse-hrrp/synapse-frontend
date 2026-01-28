// app/caisse/ma/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { AbilityGuard, useAuthz } from "@/lib/authz";
import { listAllServices, me, listFacturesPaginated } from "@/lib/api";
import {
  cashSessionSummary,
  cashSessionOpen,
  cashSessionClose,
  findFactureByNumero,
  getFactureLite,
  createReglement,
  ticketPdfUrl,
} from "@/lib/api/caisse";

type Session = {
  id: number;
  workstation: string;
  opened_at: string | null;
  payments_count: number;
  total_amount: number;
  currency: string;
  service_id?: number | null;
};

type FactureLite = {
  id: string;
  numero: string;
  statut?: string;
  devise?: string;
  total?: number;
  paye?: number;
  reste?: number;
  service_id?: number | null;
  last_reglement_id?: string | null;
  last_reglement_at?: string | null;
};

type ServiceMini = { id: number; name: string; slug?: string };

export default function MaCaissePage() {
  return (
    <AbilityGuard anyOf={["caisse.access"]}>
      <MaCaisseInner />
    </AbilityGuard>
  );
}

function MaCaisseInner() {
  const { roles, user } = useAuthz();

  // ⚠️ Tous les hooks au même endroit et dans le même ordre
  const [mounted, setMounted] = useState(false);

  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);

  const [serviceOptions, setServiceOptions] = useState<ServiceMini[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | "">("");

  const [numero, setNumero] = useState("");
  const [facture, setFacture] = useState<FactureLite | null>(null);
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("CASH");
  const [reference, setReference] = useState("");

  const [factureOptions, setFactureOptions] = useState<FactureLite[]>([]);
  const [selectedFactureId, setSelectedFactureId] = useState<string>("");

  const [allowedServiceIds, setAllowedServiceIds] = useState<number[]>([]);

  const ws =
    (typeof window !== "undefined"
      ? localStorage.getItem("cash:workstation")
      : null) || "POS-01";

  const isCaisseGeneral =
    roles.includes("caissier_general") ||
    roles.includes("admin_caisse") ||
    roles.includes("admin");

  const isCaisseService = roles.includes("caissier_service");

  // -- effets / logique --

  // marquer le composant comme monté (utile pour certaines intégrations)
  useEffect(() => {
    setMounted(true);
  }, []);

  // sécurité login
  useEffect(() => {
    me().catch(() => window.location.replace("/login?next=/caisse/ma"));
  }, []);

  // charger tous les services
  useEffect(() => {
    (async () => {
      try {
        const raw = await listAllServices();
        const arr: any[] = Array.isArray(raw) ? raw : raw?.data ?? [];
        const clean: ServiceMini[] = arr
          .filter((s) => s?.id && s?.name)
          .map((s) => ({
            id: Number(s.id),
            name: String(s.name),
            slug: (s as any).slug,
          }));

        setServiceOptions(clean);
      } catch {
        setServiceOptions([]);
      }
    })();
  }, []);

  // déduire allowedServiceIds (services du caissier)
  useEffect(() => {
    if (!user) {
      setAllowedServiceIds([]);
      return;
    }

    const u: any = user;
    const out: number[] = [];

    if (Array.isArray(u.service_ids)) {
      for (const v of u.service_ids) {
        const n = Number(v);
        if (Number.isFinite(n)) out.push(n);
      }
    }

    if (Array.isArray(u.services)) {
      for (const s of u.services) {
        const n = Number(s?.id);
        if (Number.isFinite(n)) out.push(n);
      }
    }

    if (u.personnel?.service_id) {
      const n = Number(u.personnel.service_id);
      if (Number.isFinite(n)) out.push(n);
    }

    if (u.personnel?.service?.id) {
      const n = Number(u.personnel.service.id);
      if (Number.isFinite(n)) out.push(n);
    }

    if (Array.isArray(u.personnel?.services)) {
      for (const s of u.personnel.services) {
        const n = Number(s?.id);
        if (Number.isFinite(n)) out.push(n);
      }
    }

    // cas slug/name
    if (u.personnel?.service && serviceOptions.length > 0) {
      const ps = u.personnel.service;
      const matches = serviceOptions.filter((s) => {
        if (ps.id && Number(ps.id) === s.id) return true;
        if (ps.slug && s.slug && ps.slug === s.slug) return true;
        if (ps.name && s.name && ps.name === s.name) return true;
        return false;
      });
      for (const m of matches) out.push(m.id);
    }

    const unique = Array.from(new Set(out));
    setAllowedServiceIds(unique);
  }, [user, serviceOptions]);

  // session de caisse
  async function refreshSession() {
    try {
      const res = await cashSessionSummary();
      const raw: any = res?.data ?? res;

      if (!raw || (raw.status && raw.status !== "open") || !raw.id) {
        setSession(null);
        return;
      }

      const opened_at =
        raw.opened_at ||
        raw.started_at ||
        raw.opened_at_iso ||
        raw.created_at ||
        null;

      const payments_count = Number(
        raw.payments_count ?? raw.nb_reglements ?? raw.count ?? 0
      );

      const total_amount = Number(
        raw.total_amount ?? raw.total ?? raw.total_ttc ?? raw.montant ?? 0
      );

      const currency = raw.currency ?? raw.devise ?? "XAF";

      const workstation =
        raw.workstation ?? raw.workstation_name ?? raw.poste ?? ws;

      const service_id = raw.service_id ?? raw.service?.id ?? null;

      setSession({
        id: Number(raw.id),
        workstation: String(workstation || ws),
        opened_at,
        payments_count: Number.isFinite(payments_count) ? payments_count : 0,
        total_amount: Number.isFinite(total_amount) ? total_amount : 0,
        currency,
        service_id,
      });
    } catch {
      setSession(null);
    }
  }

  useEffect(() => {
    refreshSession();
    const id = setInterval(refreshSession, 60000);
    return () => clearInterval(id);
  }, []);

  async function openSession() {
    setBusy(true);
    try {
      let service_id: number | null = null;

      if (isCaisseService) {
        if (allowedServiceIds.length === 0) {
          throw new Error(
            "Aucun service n'est affecté à votre compte. Contactez l'administrateur."
          );
        }
        service_id = allowedServiceIds[0];
      } else if (isCaisseGeneral) {
        service_id = selectedServiceId ? Number(selectedServiceId) : null;
      } else {
        service_id = selectedServiceId ? Number(selectedServiceId) : null;
      }

      await cashSessionOpen({
        currency: "XAF",
        service_id,
        opening_note: null,
      });
      await refreshSession();
      alert(`Session ouverte sur ${ws}`);
    } catch (e: any) {
      alert(e?.message || "Ouverture impossible");
    } finally {
      setBusy(false);
    }
  }

  async function closeSession() {
    setBusy(true);
    try {
      await cashSessionClose({});
      await refreshSession();
      setFacture(null);
      alert("Session fermée.");
    } catch (e: any) {
      alert(e?.message || "Fermeture impossible");
    } finally {
      setBusy(false);
    }
  }

  // factures (dropdown) — ❗️backend filtre déjà par service.
  async function loadFacturesForSelect() {
    try {
      const res: any = await listFacturesPaginated({
        page: 1,
        per_page: 50,
        // pas de "status": le backend gère déjà la visibilité
      });

      const data: any[] = res?.data ?? (Array.isArray(res) ? res : []);
      const mapped: FactureLite[] = data.map((f: any) => {
        const sid = f.service_id ?? f.serviceId ?? f.service?.id ?? null;
        const totalRaw =
          f.total_ttc ?? f.total ?? f.montant_total ?? f.montant ?? 0;
        const payeRaw =
          f.paye ??
          f.montant_paye ??
          (Array.isArray(f.reglements)
            ? f.reglements.reduce(
                (s: any, r: any) => s + Number(r.montant || 0),
                0
              )
            : 0);

        const total = Number(totalRaw || 0);
        const paye = Number(payeRaw || 0);
        const reste =
          Number(f.reste ?? f.montant_du ?? Math.max(total - paye, 0)) || 0;

        return {
          id: String(f.id),
          numero: String(f.numero ?? f.reference ?? f.code ?? "—"),
          statut: f.status ?? f.statut,
          devise: f.currency ?? f.devise ?? "XAF",
          total,
          paye,
          reste,
          service_id: sid != null ? Number(sid) : null,
        };
      });

      // ⛔️ NE PAS refiltrer par service ici : ServiceAccess le fait déjà côté backend
      setFactureOptions(mapped);
    } catch {
      setFactureOptions([]);
    }
  }

  useEffect(() => {
    if (session) {
      loadFacturesForSelect();
    }
  }, [session?.id]);

  async function loadFactureById(id: string) {
    try {
      const full = await getFactureLite(id);
      const data = (full as any)?.data ?? full;

      const sid = data.service_id ?? data.serviceId ?? data.service?.id ?? null;

      const total = Number(data.total ?? data.montant_total ?? 0) || 0;
      const paye =
        Number(
          data.paye ??
            data.montant_paye ??
            (Array.isArray(data.reglements)
              ? data.reglements.reduce(
                  (s: any, r: any) => s + Number(r.montant || 0),
                  0
                )
              : 0)
        ) || 0;
      const reste =
        Number(
          data.reste ?? data.montant_du ?? Math.max(total - paye, 0)
        ) || 0;

      // récupérer le dernier règlement (pour ticket)
      let lastRegId: string | null = null;
      let lastRegAt: string | null = null;
      if (Array.isArray(data.reglements) && data.reglements.length > 0) {
        const sorted = [...data.reglements].sort((a, b) => {
          const da = new Date(
            a.created_at || a.createdAt || a.created_at_iso || 0
          ).getTime();
          const db = new Date(
            b.created_at || b.createdAt || b.created_at_iso || 0
          ).getTime();
          return db - da;
        });
        const last = sorted[0];
        if (last?.id) lastRegId = String(last.id);
        lastRegAt =
          last?.created_at || last?.createdAt || last?.created_at_iso || null;
      }

      if (
        isCaisseService &&
        allowedServiceIds.length > 0 &&
        sid != null &&
        !allowedServiceIds.includes(Number(sid))
      ) {
        alert(
          "Cette facture appartient à un service qui ne vous est pas autorisé."
        );
        setFacture(null);
        return;
      }

      setFacture({
        id: data.id,
        numero: data.numero,
        statut: data.statut,
        devise: data.devise,
        total,
        paye,
        reste,
        service_id: sid != null ? Number(sid) : null,
        last_reglement_id: lastRegId,
        last_reglement_at: lastRegAt,
      });
    } catch (e: any) {
      alert(e?.message || "Erreur chargement facture");
    }
  }

  async function searchFacture(e: any) {
    e.preventDefault();
    setBusy(true);
    try {
      const f = await findFactureByNumero(numero.trim());
      if (!f?.id) {
        alert("Facture introuvable");
        setFacture(null);
        return;
      }
      await loadFactureById(f.id);
    } catch (e: any) {
      alert(e?.message || "Erreur recherche facture");
    } finally {
      setBusy(false);
    }
  }

  async function doPay() {
    if (!session?.id) {
      alert("Session requise pour encaisser.");
      return;
    }
    if (!facture?.id) {
      alert("Sélectionnez ou recherchez une facture d'abord.");
      return;
    }
    const m = Number(montant);
    if (!(m > 0)) {
      alert("Montant invalide");
      return;
    }
    if (facture.reste != null && m > Number(facture.reste)) {
      alert("Montant supérieur au reste à payer.");
      return;
    }

    if (
      isCaisseService &&
      allowedServiceIds.length > 0 &&
      facture.service_id != null &&
      !allowedServiceIds.includes(Number(facture.service_id))
    ) {
      alert("Service de la facture non autorisé pour votre caisse.");
      return;
    }

    setBusy(true);
    try {
      const body: any = {
        montant: m,
        mode,
        reference: reference || null,
      };

      if (session.service_id) {
        body.service_id = session.service_id;
      }

      const res = await createReglement(facture.id, body);
      const payload = (res as any)?.data ?? res;
      const recap = payload?.facture || {};

      setFacture((old) => ({
        id: recap.id || old?.id || facture.id,
        numero: recap.numero || old?.numero || facture.numero,
        statut: recap.statut || old?.statut || facture.statut,
        devise: recap.devise || old?.devise || facture.devise,
        total: Number(recap.total ?? old?.total ?? facture.total ?? 0),
        paye: Number(recap.paye ?? old?.paye ?? 0),
        reste: Number(recap.reste ?? old?.reste ?? 0),
        service_id: old?.service_id ?? facture.service_id ?? null,
        last_reglement_id: payload?.reglement?.id
          ? String(payload.reglement.id)
          : old?.last_reglement_id ?? null,
        last_reglement_at:
          payload?.reglement?.created_at || old?.last_reglement_at || null,
      }));
      setMontant("");
      setReference("");
      refreshSession();

      alert(
        `Encaissement enregistré (${m.toLocaleString()} ${
          facture.devise || "XAF"
        })`
      );
      const rid = payload?.reglement?.id;
      if (rid) window.open(ticketPdfUrl(String(rid)), "_blank");
    } catch (e: any) {
      alert(e?.message || "Paiement refusé");
    } finally {
      setBusy(false);
    }
  }

  const resteText = useMemo(
    () => (facture ? Number(facture.reste || 0).toLocaleString() : "—"),
    [facture]
  );

  // helpers impression (frontend)
  function handlePrintReceipt() {
    if (!facture?.id) {
      alert("Sélectionnez d'abord une facture à imprimer.");
      return;
    }
    window.print();
  }

  function handlePrintTicket() {
    if (!facture?.last_reglement_id) return;
    const url = ticketPdfUrl(facture.last_reglement_id);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const cashierName =
    (user as any)?.name ||
    `${(user as any)?.personnel?.first_name ?? ""} ${
      (user as any)?.personnel?.last_name ?? ""
    }`.trim() ||
    "Caissier";

  // 🧊 Maintenant qu’on a déclaré tous les hooks, on peut conditionner le rendu
  if (!mounted) {
    return <div className="p-4 text-sm">Chargement…</div>;
  }

  return (
    <>
      {/* --- Interface écran --- */}
      <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white print:hidden">
        <TopIdentityBar />
        <SiteHeader
          title="Ma Caisse"
          subtitle="Session, encaissement & tickets"
        />

        <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
          {/* Ligne du haut : poste + (sélecteur seulement pour caisse générale) + bouton rapport */}
          <section className="rounded-xl border bg-white p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-ink-700">
              Poste: <b>{ws}</b>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              {isCaisseGeneral && serviceOptions.length > 0 && (
                <select
                  value={
                    selectedServiceId === "" ? "" : String(selectedServiceId)
                  }
                  onChange={(e) =>
                    setSelectedServiceId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">
                    — Service (optionnel pour caisse générale) —
                  </option>
                  {serviceOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}

              {/* 🔥 Bouton Rapports visible uniquement pour caissier_general / admin_caisse / admin */}
              {isCaisseGeneral && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/caisse/rapport";
                  }}
                  className="rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-semibold shadow-sm hover:bg-slate-800 active:scale-95 transition"
                >
                  📊 Rapport caisse
                </button>
              )}
            </div>
          </section>

          {/* Session */}
          <section
            className={`rounded-xl border p-4 shadow-sm ${
              session ? "bg-green-50 border-green-200" : "bg-ink-50"
            }`}
          >
            {session ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm text-ink-700">
                    <b>Session active</b> — Poste{" "}
                    <b>{session.workstation || ws}</b> • Ouverte:{" "}
                    {session.opened_at
                      ? (() => {
                          const d = new Date(session.opened_at);
                          return isNaN(d.getTime()) ? "—" : d.toLocaleString();
                        })()
                      : "—"}
                  </div>
                  <div className="text-sm text-ink-700">
                    Encaissements:{" "}
                    <b>{Number(session.payments_count || 0)}</b> • Total:{" "}
                    <b>
                      {Number.isFinite(Number(session.total_amount))
                        ? Number(session.total_amount).toLocaleString()
                        : "0"}{" "}
                      {session.currency || "XAF"}
                    </b>
                  </div>
                </div>
                <button
                  disabled={busy}
                  onClick={closeSession}
                  className="rounded-lg bg-red-600 text-white px-3 py-2 text-sm disabled:opacity-60"
                >
                  Fermer la session
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-sm text-ink-700">
                  Aucune session ouverte
                </div>
                <button
                  disabled={busy}
                  onClick={openSession}
                  className="rounded-lg bg-congo-green text-white px-3 py-2 text-sm disabled:opacity-60"
                >
                  Ouvrir la session
                </button>
              </div>
            )}
          </section>

          {/* Sélection / recherche facture */}
          <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-sm flex-1">
                <div className="text-ink-700">
                  Facture à encaisser (liste déroulante)
                </div>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={selectedFactureId}
                  onChange={async (e) => {
                    const id = e.target.value;
                    setSelectedFactureId(id);
                    if (id) {
                      await loadFactureById(id);
                    } else {
                      setFacture(null);
                    }
                  }}
                >
                  <option value="">— Sélectionner une facture —</option>
                  {factureOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.numero} • reste{" "}
                      {Number(f.reste || 0).toLocaleString()}{" "}
                      {f.devise || "XAF"}
                    </option>
                  ))}
                </select>
              </label>

              {/* Recherche par numéro */}
              <form
                onSubmit={searchFacture}
                className="flex flex-col gap-1 sm:w-64"
              >
                <div className="text-xs text-ink-600">
                  ou recherche par N° facture
                </div>
                <div className="flex gap-2">
                  <input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="FAC-2025-000030"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  <button className="rounded-lg border px-3 py-2 text-sm bg-ink-50">
                    Chercher
                  </button>
                </div>
              </form>
            </div>

            {facture && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                <K k="Facture" v={facture.numero} />
                <K k="Statut" v={facture.statut ?? "—"} />
                <K
                  k="Total"
                  v={`${Number(facture.total || 0).toLocaleString()} ${
                    facture.devise || "XAF"
                  }`}
                />
                <K
                  k="Reste"
                  v={`${resteText} ${facture.devise || "XAF"}`}
                />

                {/* Actions impression */}
                <div className="sm:col-span-4 mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-ink-500">
                    {facture.last_reglement_at
                      ? `Dernier paiement le ${new Date(
                          facture.last_reglement_at
                        ).toLocaleString()}`
                      : "Aucun paiement enregistré pour cette facture."}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-50"
                    >
                      🧾 Imprimer le reçu
                    </button>
                    {facture.last_reglement_id && (
                      <button
                        type="button"
                        onClick={handlePrintTicket}
                        className="inline-flex items-center gap-1 rounded-lg border border-congo-green/40 bg-congo-green/10 px-3 py-1.5 text-xs font-medium text-congo-green-900 hover:bg-congo-green/20"
                      >
                        🎟️ Ticket de paiement
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Encaissement */}
          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Field label="Montant">
                <input
                  value={montant}
                  onChange={(e) =>
                    setMontant(
                      e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                    )
                  }
                  className="rounded-lg border px-3 py-2 text-sm"
                  inputMode="decimal"
                />
              </Field>
              <Field label="Mode">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="CASH">ESPECES</option>
                  <option value="MOBILE">MOBILE_MONEY</option>
                  <option value="CARD">CARTE</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="VIREMENT">VIREMENT</option>
                </select>
              </Field>
              <Field label="Référence (optionnel)">
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                />
              </Field>
              <div className="flex items-end">
                <button
                  disabled={busy || !session}
                  onClick={doPay}
                  className="w-full rounded-lg bg-congo-green text-white px-3 py-2 text-sm disabled:opacity-60"
                >
                  Valider le paiement
                </button>
              </div>
            </div>
            {!session && (
              <p className="mt-2 text-sm text-amber-700">
                Session requise pour encaisser.
              </p>
            )}
          </section>
        </main>

        <SiteFooter />
      </div>

      {/* --- Reçu imprimable (uniquement en mode impression) --- */}
      {facture && (
        <div className="hidden print:block px-8 py-6 text-sm text-slate-900">
          {/* En-tête avec logo + infos structure */}
          <div className="flex items-center justify-between border-b pb-3 mb-3">
            <div className="flex items-center gap-3">
              <img
                src="/logo-hospitals.png"
                alt="Logo de la structure"
                className="h-12 w-auto"
              />
              <div className="text-xs">
                <div className="text-base font-semibold">
                  Hopital Raymond Poaty
                </div>
                <div className="text-[11px] text-slate-600">
                  Adresse complète • Tél : 00 00 00 00 • Email :
                  contact@exemple.com
                </div>
              </div>
            </div>

            <div className="text-right text-xs">
              <div className="text-lg font-semibold">
                Reçu d&apos;encaissement
              </div>
              <div className="text-[11px] text-slate-600">
                Caisse / Poste {session?.workstation || ws}
              </div>
            </div>
          </div>

          <div className="flex justify-between text-xs mb-2">
            <div>
              <div>
                Facture : <b>{facture.numero}</b>
              </div>
              <div>
                Statut : <b>{facture.statut ?? "—"}</b>
              </div>
              {session?.id && (
                <div className="mt-1 text-[11px]">
                  Session n° <b>{session.id}</b>
                </div>
              )}
            </div>
            <div className="text-right">
              <div>Date impression :</div>
              <div>{new Date().toLocaleString()}</div>
              {facture.last_reglement_at && (
                <div className="mt-1 text-[11px] text-slate-600">
                  Dernier paiement :{" "}
                  {new Date(facture.last_reglement_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 border rounded-lg p-3">
            <div className="flex justify-between">
              <span>Total facture</span>
              <span className="font-semibold">
                {Number(facture.total || 0).toLocaleString()}{" "}
                {facture.devise || "XAF"}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Montant payé</span>
              <span>
                {Number(facture.paye || 0).toLocaleString()}{" "}
                {facture.devise || "XAF"}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Reste à payer</span>
              <span>
                {Number(facture.reste || 0).toLocaleString()}{" "}
                {facture.devise || "XAF"}
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-between text-xs">
            <div>
              Caissier : <b>{cashierName}</b>
              <div className="mt-4 h-10 border-t border-dashed border-slate-300 w-40" />
            </div>
            <div className="text-right text-[11px] text-slate-500">
              Merci pour votre confiance.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function K({ k, v }: { k: string; v: any }) {
  return (
    <div>
      <div className="text-xs text-ink-600">{k}</div>
      <div className="rounded-lg border bg-ink-50 px-3 py-2">
        {v ?? "—"}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm">
      <div className="text-ink-700">{label}</div>
      <div className="mt-1">{children}</div>
    </label>
  );
}
