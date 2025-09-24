
import React, { useEffect, useRef, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useAuth } from "@/hooks/useAuth";

const PLAN_TIMEOUT_MS = 3000;
const CARDS_TIMEOUT_MS = 5000;

type StatusResp = {
  ok: boolean;
  siteSlug: string;
  status?: string | null;
  plan?: string | null;
  nextPayment?: string | null;
  lastPayment?: { date: string; amount?: number } | null;
  error?: string | null;
};

const norm = (s?: string) => String(s ?? "").trim().toLowerCase();
const looksVip = (p?: string) => !!p && (norm(p) === "vip" || norm(p).includes("vip"));
const isActiveStatus = (s?: string) =>
  ["approved", "authorized", "active", "processing", "in_process", "charged", "authorized_pending_capture"].includes(
    norm(s)
  );

const fmtDateTime = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s as string;
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " • " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
};

export default function ClientDashboard() {
  const { user } = useSession();
  const { logout: authLogout } = useAuth();
  const canQuery = !!user?.email && !!user?.siteSlug && user?.role === "client";

  const [plan, setPlan] = useState<string | null>(null);
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const cacheKey = `dashboard:lastPlan:${user?.siteSlug || ""}`;
  const onceRef = useRef(false);
  const [planFetchTick, setPlanFetchTick] = useState(0);

  const [status, setStatus] = useState<StatusResp | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const vipEnabled = looksVip(plan || undefined) || looksVip(status?.plan) || isActiveStatus(status?.status);
  const planLabel = plan === null ? "—" : vipEnabled ? "vip" : plan || "—";

  function logout() {
    authLogout();
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0B1220] p-6 text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="rounded-2xl border border-white/10 bg-white text-slate-900 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-elevea.png" alt="ELEVEA" className="h-6 w-auto" />
            <div className="text-xs md:text-sm text-slate-600">
              {user.email} {user.siteSlug ? `• ${user.siteSlug}` : "• sem site"} {`• ${planLabel}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {vipEnabled ? (
              <span className="rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-300 px-3 py-1 text-xs font-medium">
                VIP ativo
              </span>
            ) : checkingPlan ? (
              <span className="rounded-xl bg-yellow-500/15 text-yellow-700 border border-yellow-300 px-3 py-1 text-xs font-medium">
                Verificando…
              </span>
            ) : (
              <span className="rounded-xl bg-slate-500/15 text-slate-700 border border-slate-300 px-3 py-1 text-xs font-medium">
                Plano Essential
              </span>
            )}
            <button onClick={logout} className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:opacity-90">
              Sair
            </button>
          </div>
        </header>

        {(planErr || status?.error) && !vipEnabled && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900">
            <div className="flex items-center justify-between">
              <span className="text-sm">{planErr || status?.error}</span>
              <button onClick={() => setPlanFetchTick((n) => n + 1)} className="rounded-lg bg-red-500 text-white px-3 py-1 text-xs hover:bg-red-600">
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        <section className="grid md:grid-cols-4 gap-4">
          <Card title="Status" value={loadingStatus ? "—" : status?.status ? status.status.toUpperCase() : "—"} />
          <Card title="Plano" value={planLabel} />
          <Card title="Próxima Cobrança" value={loadingStatus ? "—" : fmtDateTime(status?.nextPayment)} />
          <Card
            title="Último Pagamento"
            value={
              loadingStatus
                ? "—"
                : status?.lastPayment
                ? `${fmtDateTime(status.lastPayment.date)}${
                    typeof status.lastPayment.amount === "number" ? ` • R$ ${status.lastPayment.amount.toFixed(2)}` : ""
                  }`
                : "—"
            }
          />
        </section>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white text-slate-900 p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
