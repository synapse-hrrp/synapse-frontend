"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopIdentityBar from "@/components/TopIdentityBar";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { AbilityGuard } from "@/lib/authz";
import {
  listFacturesPaginated, getFactureFull, createFactureFromVisite, createFactureLibre,
  addFactureLigne, updateFactureLigne, deleteFactureLigne, encaisserFacture,
  openCashSession, currentCashSession, closeCashSession, getWorkstation, setWorkstation
} from "@/lib/api";
import { Plus, CreditCard, Search, Loader2, Trash2, Pencil, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Receipt, LockOpen, Lock, Cpu, CheckCircle2, X } from "lucide-react";

type Facture = {
  id: string; numero: string; statut: string; devise: string;
  montant_total: number|string; montant_du: number|string;
  lignes?: Array<any>; reglements?: Array<any>;
};

const PAGE_SIZE = 15;

export default function CaissePage() {
  return (
    <AbilityGuard anyOf={["*", "caisse.access"]}>
      <CaisseInner />
    </AbilityGuard>
  );
}

function CaisseInner() {
  // Session
  const [session, setSession] = useState<any>(null);
  const [ws, setWs] = useState(getWorkstation());
  const [loadingSession, setLoadingSession] = useState(true);

  // Liste factures
  const [numero, setNumero] = useState("");
  const [statut, setStatut] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Facture[]>([]);
  const [total, setTotal] = useState(0);
  const [busyList, setBusyList] = useState(false);

  // Détail facture sélectionnée
  const [sel, setSel] = useState<Facture | null>(null);

  // Lignes: formulaire rapide
  const [lgLabel, setLgLabel] = useState("");
  const [lgQty, setLgQty] = useState("1");
  const [lgPu, setLgPu] = useState("");

  // Paiement
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMode, setPayMode] = useState("cash");
  const [payRef, setPayRef] = useState("");

  // Toast
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });

  const lastPage = useMemo(()=>Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(()=>{ (async ()=>{
    setLoadingSession(true);
    try {
      const cur = await currentCashSession();
      setSession(cur?.data ?? cur);
    } finally { setLoadingSession(false); }
  })(); }, []);

  function flash(msg: string) {
    setToast({ show: true, text: msg });
    setTimeout(()=> setToast({ show: false, text: "" }), 3000);
  }

  async function refreshList() {
    setBusyList(true);
    try {
      const resp: any = await listFacturesPaginated({ page, per_page: PAGE_SIZE, numero, statut });
      const data: Facture[] = Array.isArray(resp?.data) ? resp.data : [];
      const meta = resp?.meta || {};
      setRows(data);
      setTotal(meta.total ?? data.length);
    } finally { setBusyList(false); }
  }
  useEffect(()=>{ refreshList(); /* eslint-disable-next-line */ }, [page, statut]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    await refreshList();
  }

  async function openSession() {
    try {
      await openCashSession({ workstation: ws || "CAISSE-1", currency: "XAF" });
      const cur = await currentCashSession();
      setSession(cur?.data ?? cur);
      flash("Session ouverte.");
    } catch (e:any) {
      alert(e?.message || "Ouverture impossible");
    }
  }
  async function closeSession() {
    try {
      await closeCashSession({});
      const cur = await currentCashSession(); // devrait être null
      setSession(cur?.data ?? cur);
      flash("Session fermée.");
    } catch (e:any) {
      alert(e?.message || "Fermeture impossible");
    }
  }

  async function pick(f: Facture) {
    const full = await getFactureFull(f.id);
    setSel(full);
    setPayAmount(String(full.montant_du ?? 0));
  }

  async function createFromVisite(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const id = new FormData(form).get("visite_id") as string;
    if (!id?.trim()) return;
    try {
      const res: any = await createFactureFromVisite(id.trim());
      const fact = res?.data ?? res;
      await refreshList();
      await pick(fact);
      (form.querySelector("[name=visite_id]") as HTMLInputElement).value = "";
      flash("Facture créée depuis visite.");
    } catch (e:any) {
      alert(e?.message || "Création impossible");
    }
  }

  async function createLibre(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const patient_id = (new FormData(form).get("patient_id") as string) || "";
    const devise      = (new FormData(form).get("devise") as string) || "XAF";
    try {
      const res: any = await createFactureLibre({ patient_id: patient_id || undefined, devise: devise || "XAF" });
      const fact = res?.data ?? res;
      await refreshList();
      await pick(fact);
      (form.querySelector("[name=patient_id]") as HTMLInputElement).value = "";
      flash("Facture libre créée.");
    } catch (e:any) {
      alert(e?.message || "Création libre impossible");
    }
  }

  async function addLine() {
    if (!sel) return;
    const qty = Number(lgQty.replace(",", "."));
    const pu  = Number(lgPu.replace(",", "."));
    if (!lgLabel.trim() || !Number.isFinite(qty) || !Number.isFinite(pu)) return alert("Champs ligne invalides.");
    await addFactureLigne(sel.id, { designation: lgLabel.trim(), quantite: qty, prix_unitaire: pu });
    const full = await getFactureFull(sel.id);
    setSel(full);
    setLgLabel(""); setLgQty("1"); setLgPu("");
  }

  async function removeLine(lineId: number|string) {
    if (!sel) return;
    await deleteFactureLigne(lineId);
    const full = await getFactureFull(sel.id);
    setSel(full);
  }

  async function encaisser() {
    if (!sel) return;
    try {
      await encaisserFacture(sel.id, {
        montant: Number(payAmount || 0),
        mode: payMode,
        reference: payRef || undefined,
      }, { workstation: ws });
      const full = await getFactureFull(sel.id);
      setSel(full);
      setPayAmount(String(full.montant_du ?? 0));
      setPayRef("");
      flash("Paiement enregistré.");
    } catch (e:any) {
      alert(e?.message || "Encaissement impossible");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-100 to-white text-ink-900">
      <TopIdentityBar />
      <SiteHeader title="Caisse" subtitle="Sessions, factures, encaissements" logoSrc="/logo-hospital.png" avatarSrc="/Gloire.png" />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Session caisse */}
        <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              <div className="text-sm">
                <div className="font-semibold">Poste</div>
                <div className="text-ink-600">X-Workstation : <code className="text-xs">{ws}</code></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={ws}
                onChange={(e)=>{ setWs(e.target.value || "CAISSE-1"); setWorkstation(e.target.value || "CAISSE-1"); }}
                placeholder="CAISSE-1"
                className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
              />
              {loadingSession ? (
                <span className="text-sm text-ink-600">Chargement…</span>
              ) : session ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 text-green-700 px-2 py-1 text-xs">
                    <LockOpen className="h-3.5 w-3.5" /> OUVERTE
                  </span>
                  <button onClick={closeSession} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:bg-ink-50">
                    <Lock className="h-4 w-4 inline mr-1" /> Fermer
                  </button>
                </div>
              ) : (
                <button onClick={openSession} className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
                  Ouvrir la caisse
                </button>
              )}
            </div>
          </div>
          {session && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
              <Card k="Workstation" v={session?.workstation || "—"} />
              <Card k="Ouverte le" v={session?.opened_at ? new Date(session.opened_at).toLocaleString() : "—"} />
              <Card k="Nb paiements" v={String(session?.payments_count ?? session?.live_payments_count ?? 0)} />
              <Card k="Total encaissé" v={(Number(session?.total_amount ?? session?.live_total_amount ?? 0)).toLocaleString()} />
            </div>
          )}
        </section>

        {/* Création facture : depuis visite / libre */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={createFromVisite} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-2">Créer facture depuis une visite</h3>
            <div className="flex items-center gap-2">
              <input name="visite_id" placeholder="UUID visite" className="flex-1 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm" />
              <button className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
                <Plus className="h-4 w-4 inline mr-1" /> Créer
              </button>
            </div>
          </form>

          <form onSubmit={createLibre} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-2">Créer facture libre (caisse)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input name="patient_id" placeholder="UUID patient (optionnel)" className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm" />
              <input name="devise" defaultValue="XAF" className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm" />
              <button className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
                <Plus className="h-4 w-4 inline mr-1" /> Créer
              </button>
            </div>
          </form>
        </section>

        {/* Liste + Détail */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste */}
          <div className="lg:col-span-1 space-y-3">
            <form onSubmit={onSearch} className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                  <input value={numero} onChange={(e)=>setNumero(e.target.value)} placeholder="N° facture (FAC-…)" className="w-full rounded-lg border border-ink-100 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-congo-green focus:ring-2 focus:ring-congo-green/20" />
                </div>
                <button className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm hover:bg-ink-50">
                  {busyList ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}
                </button>
              </div>
              <div className="mt-2">
                <select value={statut} onChange={(e)=>{ setStatut(e.target.value); setPage(1); }} className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm">
                  <option value="">— Tous statuts —</option>
                  <option value="IMPAYEE">IMPAYÉE</option>
                  <option value="PARTIELLE">PARTIELLE</option>
                  <option value="PAYEE">PAYÉE</option>
                  <option value="ANNULEE">ANNULÉE</option>
                </select>
              </div>
            </form>

            <div className="overflow-auto rounded-xl border border-ink-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-700">
                  <tr><Th>N°</Th><Th>Statut</Th><Th>Total</Th><Th>Reste</Th><Th></Th></tr>
                </thead>
                <tbody>
                  {rows.map(r=>(
                    <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/40">
                      <Td className="font-mono">{r.numero}</Td>
                      <Td>{r.statut}</Td>
                      <Td>{Number(r.montant_total).toLocaleString()}</Td>
                      <Td>{Number(r.montant_du).toLocaleString()}</Td>
                      <Td className="text-right pr-3">
                        <button onClick={()=>pick(r)} className="icon-btn" title="Voir"><Receipt className="h-4 w-4" /></button>
                      </Td>
                    </tr>
                  ))}
                  {!rows.length && !busyList && <tr><td colSpan={5} className="p-4 text-center text-ink-500">Aucun résultat</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-sm">
              <div className="text-ink-600">Page {page} / {lastPage}</div>
              <div className="flex items-center gap-1">
                <PageBtn onClick={()=>setPage(1)} disabled={page===1}><ChevronsLeft className="h-4 w-4" /></PageBtn>
                <PageBtn onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}><ChevronLeft className="h-4 w-4" /></PageBtn>
                <PageBtn onClick={()=>setPage(p=>Math.min(lastPage,p+1))} disabled={page===lastPage}><ChevronRight className="h-4 w-4" /></PageBtn>
                <PageBtn onClick={()=>setPage(lastPage)} disabled={page===lastPage}><ChevronsRight className="h-4 w-4" /></PageBtn>
              </div>
            </div>
          </div>

          {/* Détail */}
          <div className="lg:col-span-2 space-y-4">
            {!sel ? (
              <div className="rounded-2xl border border-ink-100 bg-white p-10 text-center text-ink-500 shadow-sm">Sélectionnez une facture à gauche…</div>
            ) : (
              <>
                {/* En-tête facture */}
                <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-ink-600">Facture</div>
                      <div className="text-lg font-semibold">{sel.numero}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div><b>Statut</b> {sel.statut}</div>
                      <div><b>Total</b> {Number(sel.montant_total).toLocaleString()} {sel.devise}</div>
                      <div><b>Reste</b> {Number(sel.montant_du).toLocaleString()} {sel.devise}</div>
                    </div>
                  </div>
                </section>

                {/* Lignes */}
                <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Lignes</h3>
                    <Link href={`/factures/${sel.id}`} className="text-xs text-ink-600 hover:underline">Ouvrir la fiche</Link>
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-ink-50 text-ink-700">
                        <tr><Th>Désignation</Th><Th className="text-right">Qté</Th><Th className="text-right">P.U.</Th><Th className="text-right">Montant</Th><Th className="text-right pr-3">Actions</Th></tr>
                      </thead>
                      <tbody>
                        {(sel.lignes||[]).map((l:any)=>(
                          <tr key={l.id} className="border-t border-ink-100">
                            <Td>{l.designation}</Td>
                            <Td className="text-right">{Number(l.quantite).toLocaleString()}</Td>
                            <Td className="text-right">{Number(l.prix_unitaire).toLocaleString()}</Td>
                            <Td className="text-right">{Number(l.montant).toLocaleString()}</Td>
                            <Td className="text-right pr-3">
                              {/* Edition inline simple: pour raccourcir on montre juste Delete (tu pourras ajouter un modal edit) */}
                              <button onClick={()=>removeLine(l.id)} className="icon-btn text-congo-red" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                            </Td>
                          </tr>
                        ))}
                        {!sel.lignes?.length && <tr><td colSpan={5} className="p-4 text-center text-ink-500">Aucune ligne</td></tr>}
                      </tbody>
                    </table>
                  </div>

                  {/* Ajout rapide */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <input value={lgLabel} onChange={e=>setLgLabel(e.target.value)} placeholder="Désignation" className="sm:col-span-2 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm" />
                    <input value={lgQty} onChange={e=>setLgQty(e.target.value)} placeholder="Qté" className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm" />
                    <input value={lgPu} onChange={e=>setLgPu(e.target.value)} placeholder="P.U." className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm" />
                    <button onClick={addLine} className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
                      <Plus className="h-4 w-4 inline mr-1" /> Ajouter
                    </button>
                  </div>
                </section>

                {/* Encaissement */}
                <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold mb-2">Encaissement</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="Montant" inputMode="decimal" className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm" />
                    <select value={payMode} onChange={e=>setPayMode(e.target.value)} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm">
                      <option value="cash">Espèces</option>
                      <option value="momo">Mobile Money</option>
                      <option value="card">Carte</option>
                      <option value="cheque">Chèque</option>
                    </select>
                    <input value={payRef} onChange={e=>setPayRef(e.target.value)} placeholder="Référence (optionnelle)" className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm" />
                    <button onClick={encaisser} disabled={!session} className="rounded-lg bg-congo-green px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                      <CreditCard className="h-4 w-4 inline mr-1" /> Encaisser
                    </button>
                  </div>
                  {!session && <div className="mt-2 text-xs text-ink-600">Ouvrez d’abord la session de caisse.</div>}
                </section>
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />

      {/* Toast */}
      <Toast show={toast.show} onClose={()=>setToast({ show:false, text:"" })}>
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">{toast.text}</span>
      </Toast>

      <style jsx global>{`
        .icon-btn { display:inline-flex; align-items:center; justify-content:center; padding:6px; border-radius:8px; color:#111827; }
        .icon-btn:hover { background:#f3f4f6; }
      `}</style>
    </div>
  );
}

function Card({ k, v }: { k: string; v: any }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50 p-3">
      <div className="text-xs text-ink-600">{k}</div>
      <div className="text-sm font-medium">{v ?? "—"}</div>
    </div>
  );
}
function Th({ children, className="" }: any) { return <th className={`px-3 py-2 text-left font-semibold ${className}`}>{children}</th>; }
function Td({ children, className="" }: any) { return <td className={`px-3 py-2 ${className}`}>{children}</td>; }
function PageBtn({ children, disabled, onClick }: any) {
  return <button disabled={disabled} onClick={onClick} className="rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 hover:bg-ink-50 disabled:opacity-40">{children}</button>;
}
function Toast({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode; }) {
  return (
    <div aria-live="polite" role="status" className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${show ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"}`}>
      <div className="flex items-center gap-2 rounded-xl border border-congo-green/30 bg-congo-greenL px-3 py-2 shadow-lg ring-1 ring-congo-green/20 text-congo-green">
        {children}
        <button onClick={onClose} aria-label="Fermer" className="ml-1 rounded-md p-1 hover:bg-ink-100 text-ink-600"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
