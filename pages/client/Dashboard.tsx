import React, { useEffect, useRef, useState } from "react";
import { useSession } from "../../src/hooks/useSession";
import { useAuth } from "../../src/hooks/useAuth";
import AIChat from "./components/AIChat";
import AIContentGenerator from "./components/AIContentGenerator";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import BusinessInsights from "./components/BusinessInsights";
import GoogleReviews from "./components/GoogleReviews";
import SEOOptimizer from "./components/SEOOptimizer";
import WhatsAppManager from "./components/WhatsAppManager";
import LeadScoring from "./components/LeadScoring";
import { AICopywriter } from "@/components/ui/ai-copywriter";
import { DashboardCardSkeleton, MetricsSkeleton, ContentSkeleton } from "@/components/ui/loading-skeletons";

/* ================= CONFIG ================= */
const PLAN_TIMEOUT_MS = 3000;         // descobrir VIP - OTIMIZADO
const CARDS_TIMEOUT_MS = 5000;        // cards paralelo - OTIMIZADO
const UPGRADE_URL =
  (import.meta as any).env?.VITE_UPGRADE_URL ||
  "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=99dceb0e108a4f238a84fbef3e91bab8";

/* Paletas demo */
const PALETAS = [
  { name: "Azul Futurista", colors: ["#0f172a", "#3b82f6", "#38bdf8"] },
  { name: "Verde Tech", colors: ["#064e3b", "#10b981", "#34d399"] },
  { name: "Roxo Premium", colors: ["#312e81", "#8b5cf6", "#a78bfa"] },
  { name: "Laranja Energia", colors: ["#7c2d12", "#f97316", "#fb923c"] },
];

/* ===== Tipos ===== */
type StatusResp = {
  ok: boolean;
  siteSlug: string;
  status?: string;
  plan?: string;
  nextCharge?: string | null;
  lastPayment?: { date: string; amount: number } | null;
};

type Feedback = {
  id: string;
  name?: string;
  message: string;
  timestamp: string;
  approved?: boolean;
  email?: string;
  phone?: string;
  sentiment?: {
    rating: number;
    confidence: number;
    emotion: string;
    summary: string;
  };
};

type ClientSettings = {
  showBrand?: boolean;
  showPhone?: boolean;
  showWhatsApp?: boolean;
  whatsAppNumber?: string;
  footerText?: string;
  theme?: { primary: string; background: string; accent: string };
  customCSS?: string;
  vipPin?: string;
};

type ImageSlot = { key: string; label: string; url?: string };

/* ===== fetch com timeout real (AbortController) ===== */
async function getJSON<T = any>(url: string, ms: number): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, credentials: "include" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function postJSON<T = any>(url: string, body: any, ms: number): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
      credentials: "include",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ===== helpers ===== */
const norm = (s?: string) => String(s ?? "").trim().toLowerCase();
const looksVip = (p?: string) => !!p && (norm(p) === "vip" || norm(p).includes("vip"));
const isActiveStatus = (s?: string) =>
  ["approved", "authorized", "active", "processing", "in_process", "charged", "authorized_pending_capture"]
    .includes(norm(s));

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

/* ================= Página ================= */
export default function ClientDashboard() {
  const { user } = useSession();
  const { logout: authLogout } = useAuth();
  const canQuery = !!user?.email && !!user?.siteSlug && user?.role === "client";

  /* Plano / gate VIP */
  const [plan, setPlan] = useState<string | null>(null); // null=desconhecido
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const cacheKey = `dashboard:lastPlan:${user?.siteSlug || ""}`;
  const onceRef = useRef(false);
  const [planFetchTick, setPlanFetchTick] = useState(0); // força refetch

  /* Outros cards */
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [settings, setSettings] = useState<ClientSettings>({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  const [slots, setSlots] = useState<ImageSlot[]>(
    Array.from({ length: 6 }).map((_, i) => ({ key: `media_${i + 1}`, label: `Mídia ${i + 1}` }))
  );
  const [loadingAssets, setLoadingAssets] = useState(true);

  const [vipPin, setVipPin] = useState("");
  const [saving, setSaving] = useState(false);

  /* Chat AI */
  const [showAIChat, setShowAIChat] = useState(false);
  
  /* Gerador de Conteúdo IA */
  const [showContentGenerator, setShowContentGenerator] = useState(false);

  /* Estrutura do site (personalização VIP) */
  const [siteStructure, setSiteStructure] = useState<any>(null);
  const [loadingStructure, setLoadingStructure] = useState(true);
  const [savingStructure, setSavingStructure] = useState(false);

  // VIP habilita se QUALQUER fonte indicar isso
  const vipEnabled =
    looksVip(plan || undefined) ||
    looksVip(status?.plan) ||
    isActiveStatus(status?.status);

  const planLabel = plan === null ? "—" : (vipEnabled ? "vip" : (plan || "—"));

  // Redireciona admin
  useEffect(() => {
    if (user?.role === "admin") window.location.replace("/admin/dashboard");
  }, [user?.role]);

  /* 1) Carrega plano principal */
  useEffect(() => {
    if (!canQuery) return;

    // abre com último plano conhecido (se existir)
    if (!onceRef.current) {
      onceRef.current = true;
      try {
        const last = sessionStorage.getItem(cacheKey);
        if (last) setPlan(last);
      } catch {}
    }

    let alive = true;
    (async () => {
      setCheckingPlan(true);
      setPlanErr(null);
      try {
        const r = await getJSON<{
          ok: boolean;
          vip: boolean;
          plan: string;
          status?: string;
          nextCharge?: string | null;
          lastPayment?: { date: string; amount: number } | null;
        }>(
          `/.netlify/functions/client-plan?site=${encodeURIComponent(user!.siteSlug!)}&email=${encodeURIComponent(
            user!.email
          )}`,
          PLAN_TIMEOUT_MS
        );

        if (!alive) return;
        const resolvedPlan = r.vip ? "vip" : (r.plan || "");
        setPlan(resolvedPlan);
        try { sessionStorage.setItem(cacheKey, resolvedPlan); } catch {}

        // hidrata status com o que já veio
        setStatus({
          ok: true,
          siteSlug: user!.siteSlug!,
          status: r.status,
          nextCharge: r.nextCharge,
          lastPayment: r.lastPayment,
          plan: resolvedPlan,
        });
      } catch (e: any) {
        setPlanErr("Não foi possível validar sua assinatura agora.");
      } finally {
        if (alive) setCheckingPlan(false);
      }
    })();

    return () => { alive = false; };
  }, [canQuery, user?.siteSlug, user?.email, planFetchTick]);

  const retryPlan = () => {
    try { sessionStorage.removeItem(cacheKey); } catch {}
    setPlan(null);
    setPlanErr(null);
    setLoadingStatus(true);
    setPlanFetchTick((n) => n + 1);
  };

  /* 2) Cards em paralelo (não bloqueiam a decisão VIP) */
  useEffect(() => {
    if (!canQuery) return;
    let alive = true;

    // STATUS (atualiza se necessário)
    (async () => {
      if (status?.nextCharge && status?.lastPayment) {
        setLoadingStatus(false);
        return; // já tem dados do plano
      }
      
      try {
        const s = await getJSON<StatusResp>(
          `/.netlify/functions/client-api?action=get_status&site=${encodeURIComponent(user!.siteSlug!)}`,
          CARDS_TIMEOUT_MS
        );
        if (!alive) return;
        setStatus(prev => ({ ...prev, ...s }));
      } catch {}
      finally {
        if (alive) setLoadingStatus(false);
      }
    })();

    // SETTINGS
    (async () => {
      try {
        const st = await getJSON<{ ok: boolean; settings?: ClientSettings }>(
          `/.netlify/functions/client-api?action=get_settings&site=${encodeURIComponent(user!.siteSlug!)}`,
          CARDS_TIMEOUT_MS
        ).catch(() => ({ ok: true, settings: {} as ClientSettings }));
        if (!alive) return;
        setSettings(st.settings || {});
        setVipPin(st.settings?.vipPin || "");
      } catch {}
      finally {
        if (alive) setLoadingSettings(false);
      }
    })();

    // ASSETS
    (async () => {
      try {
        const assets = await getJSON<{ ok: boolean; items: Array<{ key: string; url: string }> }>(
          `/.netlify/functions/assets?site=${encodeURIComponent(user!.siteSlug!)}`,
          CARDS_TIMEOUT_MS
        ).catch(() => ({ ok: true, items: [] as any[] }));
        if (!alive) return;
        const mapped = new Map<string, string>();
        assets.items.forEach((a) => mapped.set(a.key, a.url));
        setSlots((prev) => prev.map((s) => ({ ...s, url: mapped.get(s.key) || undefined })));
      } catch {}
      finally {
        if (alive) setLoadingAssets(false);
      }
    })();

    return () => { alive = false; };
  }, [canQuery, user?.siteSlug, status?.nextCharge, status?.lastPayment]);

  /* 3) FEEDBACKS - depende do estado VIP e PIN */
  useEffect(() => {
    if (!canQuery) return;
    let alive = true;

    (async () => {
      try {
        let fb: { ok: boolean; items: Feedback[] };

        if (vipEnabled && vipPin) {
          // VIP com PIN: vê todos os feedbacks (POST para segurança)
          fb = await postJSON<{ ok: boolean; items: Feedback[] }>(
            "/.netlify/functions/client-api",
            { action: "list_feedbacks_secure", site: user!.siteSlug!, pin: vipPin },
            CARDS_TIMEOUT_MS
          ).catch(() => ({ ok: true, items: [] as Feedback[] }));
        } else {
          // Sem PIN ou não-VIP: apenas feedbacks públicos/aprovados
          fb = await getJSON<{ ok: boolean; items: Feedback[] }>(
            `/.netlify/functions/client-api?action=list_feedbacks&site=${encodeURIComponent(user!.siteSlug!)}`,
            CARDS_TIMEOUT_MS
          ).catch(() => ({ ok: true, items: [] as Feedback[] }));
        }

        if (!alive) return;
        const feedbacks = fb.items || [];
        setFeedbacks(feedbacks);
        
        // Análise automática de sentimentos para feedbacks VIP
        if (vipEnabled && feedbacks.length > 0) {
          (async () => {
            try {
              const feedbacksToAnalyze = feedbacks
                .filter(f => !f.sentiment && f.message?.trim())
                .slice(0, 10); // Limita análise para não sobrecarregar API
                
              if (feedbacksToAnalyze.length > 0) {
                const response = await fetch('/.netlify/functions/ai-sentiment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    batch: feedbacksToAnalyze.map(f => ({
                      id: f.id,
                      feedback: f.message,
                      clientName: f.name
                    }))
                  })
                });
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.ok && data.results) {
                    setFeedbacks(prev => prev.map(f => {
                      const analysis = data.results.find((r: any) => r.id === f.id && r.success);
                      return analysis ? { ...f, sentiment: analysis.analysis } : f;
                    }));
                  }
                }
              }
            } catch (error) {
              console.log('Análise de sentimento indisponível:', error);
            }
          })();
        }
      } catch {}
      finally {
        if (alive) setLoadingFeedbacks(false);
      }
    })();

    return () => { alive = false; };
  }, [canQuery, user?.siteSlug, vipEnabled, vipPin]);

  /* 4) ESTRUTURA DO SITE - apenas para VIP com PIN */
  useEffect(() => {
    if (!canQuery || !vipEnabled || !vipPin) {
      setSiteStructure(null);
      setLoadingStructure(false);
      return;
    }

    let alive = true;
    (async () => {
      setLoadingStructure(true);
      try {
        const response = await getJSON<{
          ok: boolean;
          structure?: any;
          isDefault?: boolean;
        }>(
          `/.netlify/functions/site-structure?site=${encodeURIComponent(user!.siteSlug!)}`,
          CARDS_TIMEOUT_MS
        );

        if (!alive) return;
        if (response.ok && response.structure) {
          setSiteStructure(response.structure);
        }
      } catch (e) {
        console.log("Erro ao carregar estrutura:", e);
      } finally {
        if (alive) setLoadingStructure(false);
      }
    })();

    return () => { alive = false; };
  }, [canQuery, user?.siteSlug, vipEnabled, vipPin]);

  /* Ações */
  async function saveSettings(partial: Partial<ClientSettings>) {
    if (!canQuery) return;
    setSaving(true);
    try {
      const payload = { ...settings, ...partial };
      const res = await postJSON<{ ok: boolean }>(
        "/.netlify/functions/client-api",
        { action: "save_settings", site: user!.siteSlug!, settings: payload, pin: vipPin || undefined },
        CARDS_TIMEOUT_MS
      );
      if (!res.ok) throw new Error("Falha ao salvar");
      setSettings(payload);
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(slot: ImageSlot, file: File) {
    if (!canQuery) return;
    const fd = new FormData();
    fd.append("site", user!.siteSlug!);
    fd.append("section", "generic");
    fd.append("key", slot.key);
    fd.append("file", file);
    fd.append("email", user!.email);
    const r = await fetch("/.netlify/functions/assets", { method: "PUT", body: fd, credentials: "include" });
    const data = await r.json().catch(() => ({} as any));
    if (!r.ok || data.ok === false) throw new Error(data?.error || `Falha no upload (${r.status})`);
    const newUrl: string = data.url;
    setSlots((prev) => prev.map((s) => (s.key === slot.key ? { ...s, url: newUrl } : s)));
  }

  async function setFeedbackApproval(id: string, approved: boolean) {
    if (!canQuery) return;
    try {
      await postJSON(
        "/.netlify/functions/client-api",
        { action: "feedback_set_approval", site: user!.siteSlug!, id, approved, pin: vipPin || undefined },
        CARDS_TIMEOUT_MS
      );
      setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, approved } : f)));
    } catch (e: any) {
      alert(e?.message || "Não foi possível atualizar a aprovação.");
    }
  }

  async function saveSiteStructure(updatedStructure?: any) {
    if (!canQuery || !vipPin) return;
    const structureToSave = updatedStructure || siteStructure;
    if (!structureToSave) return;
    
    setSavingStructure(true);
    try {
      const response = await postJSON<{ ok: boolean }>(
        "/.netlify/functions/site-structure",
        { 
          structure: structureToSave,
          pin: vipPin,
          site: user!.siteSlug!
        },
        CARDS_TIMEOUT_MS
      );
      if (!response.ok) throw new Error("Falha ao salvar estrutura");
      setSiteStructure(structureToSave);
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar estrutura do site");
    } finally {
      setSavingStructure(false);
    }
  }

  // Aplicar conteúdo gerado pela IA
  const handleContentGenerated = (content: any[]) => {
    if (!siteStructure || !content.length) return;
    
    const updatedStructure = { ...siteStructure };
    
    // Mapear conteúdo gerado para seções existentes
    content.forEach((item, index) => {
      if (updatedStructure.sections && updatedStructure.sections[index]) {
        updatedStructure.sections[index] = {
          ...updatedStructure.sections[index],
          title: item.title || updatedStructure.sections[index].title,
          subtitle: item.subtitle || updatedStructure.sections[index].subtitle,
          description: item.description || updatedStructure.sections[index].description,
        };
      }
    });
    
    setSiteStructure(updatedStructure);
    saveSiteStructure(updatedStructure);
  };

  function updateSectionField(sectionId: string, field: string, value: any) {
    if (!siteStructure) return;
    
    const updatedStructure = {
      ...siteStructure,
      sections: siteStructure.sections.map((section: any) =>
        section.id === sectionId ? { ...section, [field]: value } : section
      )
    };
    
    setSiteStructure(updatedStructure);
  }

  function logout() {
    authLogout();
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0B1220] p-6 text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="rounded-2xl border border-white/10 bg-white text-slate-900 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-elevea.png" alt="ELEVEA" className="h-6 w-auto" />
            <div className="text-xs md:text-sm text-slate-600">
              {user.email} {user.siteSlug ? `• ${user.siteSlug}` : "• sem site"} {`• ${planLabel}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {vipEnabled ? (
              <>
                <span className="rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-300 px-3 py-1 text-xs font-medium">VIP ativo</span>
                <input
                  value={vipPin}
                  onChange={(e) => setVipPin(e.target.value)}
                  placeholder="PIN VIP"
                  className="rounded-xl bg-white/70 text-black px-3 py-2 text-xs"
                />
              </>
            ) : checkingPlan ? (
              <span className="rounded-xl bg-yellow-500/15 text-yellow-700 border border-yellow-300 px-3 py-1 text-xs font-medium">Verificando…</span>
            ) : (
              <span className="rounded-xl bg-slate-500/15 text-slate-700 border border-slate-300 px-3 py-1 text-xs font-medium">Plano Essential</span>
            )}
            <button onClick={logout} className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:opacity-90">
              Sair
            </button>
          </div>
        </header>

        {/* ERRO DE PLANO */}
        {planErr && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900">
            <div className="flex items-center justify-between">
              <span className="text-sm">{planErr}</span>
              <button onClick={retryPlan} className="rounded-lg bg-red-500 text-white px-3 py-1 text-xs hover:bg-red-600">
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* RESUMO */}
        <section className="grid md:grid-cols-4 gap-4">
          <Card title="Status" value={loadingStatus ? "—" : status?.status ? status.status.toUpperCase() : "—"} />
          <Card title="Plano" value={planLabel} />
          <Card title="Próxima Cobrança" value={loadingStatus ? "—" : fmtDateTime(status?.nextCharge)} />
          <Card title="Último Pagamento" value={
            loadingStatus ? "—" :
              status?.lastPayment ? `${fmtDateTime(status.lastPayment.date)} • R$ ${status.lastPayment.amount.toFixed(2)}` : "—"
          }/>
        </section>

        {/* ANALYTICS DASHBOARD VIP */}
        {vipEnabled && vipPin && (
          <section className="space-y-6">
            <AnalyticsDashboard siteSlug={user.siteSlug || ''} vipPin={vipPin} />
          </section>
        )}

        {/* BUSINESS INSIGHTS VIP */}
        {vipEnabled && vipPin && siteStructure && (
          <section className="space-y-6">
            <BusinessInsights 
              siteSlug={user.siteSlug || ''} 
              businessType={siteStructure?.category || 'geral'}
              businessName={user?.siteSlug || 'seu negócio'}
              vipPin={vipPin}
              analytics={{
                totalVisits: 2500,
                conversionRate: 3.2,
                bounceRate: 35.8,
                avgSessionDuration: '2:34',
                topPages: [
                  { page: '/', visits: 1250 },
                  { page: '/servicos', visits: 850 }
                ],
                deviceTypes: [
                  { name: 'Mobile', value: 65 },
                  { name: 'Desktop', value: 35 }
                ]
              }}
              feedback={{
                avgRating: 4.2,
                recentFeedbacks: [
                  { rating: 5, comment: 'Excelente atendimento!', sentiment: 'positive' },
                  { rating: 4, comment: 'Muito bom serviço', sentiment: 'positive' }
                ]
              }}
            />
          </section>
        )}

        {/* GOOGLE REVIEWS VIP */}
        {vipEnabled && vipPin && (
          <section className="space-y-6">
            <GoogleReviews 
              siteSlug={user.siteSlug || ''} 
              vipPin={vipPin}
            />
          </section>
        )}

        {/* WHATSAPP MANAGER VIP */}
        {vipEnabled && vipPin && (
          <section className="space-y-6">
            <WhatsAppManager 
              siteSlug={user.siteSlug || ''} 
              vipPin={vipPin}
            />
          </section>
        )}

        {/* LEAD SCORING VIP */}
        {vipEnabled && vipPin && (
          <section className="space-y-6">
            <LeadScoring 
              siteSlug={user.siteSlug || ''} 
              vipPin={vipPin}
            />
          </section>
        )}

        {/* SEO OPTIMIZER VIP */}
        {vipEnabled && vipPin && (
          <section className="space-y-6">
            <SEOOptimizer 
              siteSlug={user.siteSlug || ''} 
              vipPin={vipPin}
              businessData={{
                name: user.siteSlug || 'seu negócio',
                type: siteStructure?.category || 'negócio',
                location: 'Brasil',
                description: siteStructure?.description || ''
              }}
            />
          </section>
        )}

        {/* AI COPYWRITER VIP */}
        {vipEnabled && vipPin && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white text-slate-900 p-6">
              <AICopywriter 
                businessName={user.siteSlug || 'seu negócio'}
                businessType={siteStructure?.category || 'negócio'}
                businessDescription={siteStructure?.description || ''}
              />
            </div>
          </section>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* CONFIGURAÇÕES */}
            <VipGate enabled={vipEnabled} checking={checkingPlan} teaser="Configure aparência, tema e PIN VIP">
              <section className="rounded-2xl border border-white/10 bg-white text-slate-900 p-6 space-y-4">
                <h2 className="text-lg font-semibold">Configurações Gerais</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.showBrand ?? true}
                      onChange={(e) => saveSettings({ showBrand: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Mostrar marca no rodapé</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.showPhone ?? false}
                      onChange={(e) => saveSettings({ showPhone: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Mostrar telefone</span>
                  </label>
                </div>

                {settings.showPhone && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Número WhatsApp</label>
                    <input
                      type="tel"
                      value={settings.whatsAppNumber || ""}
                      onChange={(e) => saveSettings({ whatsAppNumber: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">PIN VIP</label>
                  <input
                    type="password"
                    value={vipPin}
                    onChange={(e) => {
                      setVipPin(e.target.value);
                      saveSettings({ vipPin: e.target.value });
                    }}
                    placeholder="Defina um PIN para acessar recursos VIP"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use este PIN para acessar todas as funcionalidades do painel</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Paleta de cores</label>
                  <div className="grid grid-cols-2 gap-3">
                    {PALETAS.map((pal, i) => (
                      <button
                        key={i}
                        onClick={() => saveSettings({
                          theme: { primary: pal.colors[1], background: pal.colors[0], accent: pal.colors[2] }
                        })}
                        className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex gap-1">
                          {pal.colors.map((c, j) => (
                            <div key={j} className="w-4 h-4 rounded" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span className="text-xs">{pal.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </VipGate>

            {/* MÍDIAS */}
            <VipGate enabled={vipEnabled} checking={loadingAssets} teaser="Personalize imagens e vídeos do seu site">
              <section className="rounded-2xl border border-white/10 bg-white text-slate-900 p-6 space-y-4">
                <h2 className="text-lg font-semibold">Gerenciar Mídias</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {slots.map((slot) => (
                    <MediaSlot key={slot.key} slot={slot} onUpload={handleUpload} />
                  ))}
                </div>
              </section>
            </VipGate>

            {/* PERSONALIZAÇÃO DE SEÇÕES */}
            <VipGate enabled={vipEnabled && !!vipPin} checking={loadingStructure} teaser="Personalize títulos, subtítulos e conteúdo das seções do seu site">
              <section className="rounded-2xl border border-white/10 bg-white text-slate-900 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Personalizar Seções do Site</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowContentGenerator(true)}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors"
                      title="Gerar conteúdo com IA"
                    >
                      🤖 IA
                    </button>
                    {savingStructure && (
                      <span className="text-xs text-blue-600">Salvando...</span>
                    )}
                  </div>
                </div>

                {loadingStructure ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                ) : !siteStructure ? (
                  <div className="text-slate-500 text-sm">Nenhuma estrutura disponível. Certifique-se de ter inserido o PIN VIP correto.</div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div className="text-xs text-slate-600 mb-4">
                      Personalize o conteúdo das seções do seu site. Tipo de negócio detectado: <strong>{siteStructure.category || 'geral'}</strong>
                    </div>
                    {siteStructure.sections?.map((section: any) => (
                      <div key={section.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm capitalize">{section.id.replace('-', ' ')}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${section.visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {section.visible ? 'Visível' : 'Oculta'}
                          </span>
                        </div>
                        
                        <div className="grid gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Título</label>
                            <input
                              type="text"
                              value={section.title || ''}
                              onChange={(e) => updateSectionField(section.id, 'title', e.target.value)}
                              placeholder="Título da seção"
                              className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Subtítulo</label>
                            <input
                              type="text"
                              value={section.subtitle || ''}
                              onChange={(e) => updateSectionField(section.id, 'subtitle', e.target.value)}
                              placeholder="Subtítulo da seção"
                              className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                            />
                          </div>

                          {section.description !== undefined && (
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                              <textarea
                                value={section.description || ''}
                                onChange={(e) => updateSectionField(section.id, 'description', e.target.value)}
                                placeholder="Descrição detalhada da seção"
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">URL da Imagem</label>
                              <input
                                type="url"
                                value={section.image || ''}
                                onChange={(e) => updateSectionField(section.id, 'image', e.target.value)}
                                placeholder="https://..."
                                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Visibilidade</label>
                              <select
                                value={section.visible ? 'true' : 'false'}
                                onChange={(e) => updateSectionField(section.id, 'visible', e.target.value === 'true')}
                                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                              >
                                <option value="true">Visível</option>
                                <option value="false">Oculta</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {section.image && (
                          <div className="mt-2">
                            <img 
                              src={section.image} 
                              alt={section.title || 'Preview'} 
                              className="w-20 h-12 object-cover rounded border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="pt-4 border-t">
                      <button
                        onClick={saveSiteStructure}
                        disabled={savingStructure}
                        className={`w-full px-4 py-2 rounded-lg font-medium text-sm ${
                          savingStructure 
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {savingStructure ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </VipGate>
          </div>

          <div className="space-y-6">
            {/* FEEDBACKS */}
            <section className="rounded-2xl border border-white/10 bg-slate-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Feedbacks Recentes</h2>
                <span className="text-xs text-white/60">
                  {vipEnabled && vipPin ? "Todos os feedbacks" : "Apenas aprovados"}
                </span>
              </div>
              <div className="text-xs text-white/60">E-mail e telefone ficam **somente aqui** (não são publicados).</div>

              {loadingFeedbacks ? (
                <div className="space-y-2">
                  <div className="h-3 bg-white/20 rounded animate-pulse"></div>
                  <div className="h-3 bg-white/20 rounded animate-pulse w-2/3"></div>
                </div>
              ) : feedbacks.length === 0 ? (
                <div className="text-white/60 text-sm">Nenhum feedback ainda.</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {feedbacks.slice(0, 10).map((f) => (
                    <div key={f.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-white/60">
                            <span>{f.name || "Anônimo"}</span>
                            <span>•</span>
                            <span>{fmtDateTime(f.timestamp)}</span>
                            {f.approved && <span className="text-emerald-400">✓ Aprovado</span>}
                            {/* Análise de Sentimento */}
                            {f.sentiment && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                f.sentiment.rating >= 4 ? 'bg-emerald-500/20 text-emerald-300' :
                                f.sentiment.rating >= 3 ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-red-500/20 text-red-300'
                              }`}>
                                {f.sentiment.emotion} ({f.sentiment.rating}/5)
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white mt-1 break-words">{f.message}</p>
                          {/* Resumo da IA */}
                          {f.sentiment?.summary && (
                            <p className="text-xs text-blue-300 mt-1 italic">
                              💡 {f.sentiment.summary}
                            </p>
                          )}
                          {(f.email || f.phone) && (
                            <div className="text-xs text-white/50 mt-1">
                              {f.email && <span>📧 {f.email}</span>}
                              {f.email && f.phone && <span> • </span>}
                              {f.phone && <span>📞 {f.phone}</span>}
                            </div>
                          )}
                        </div>
                        
                        {vipEnabled && vipPin && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setFeedbackApproval(f.id, true)}
                              className={`px-2 py-1 text-xs rounded ${f.approved ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/70 hover:bg-emerald-600'}`}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setFeedbackApproval(f.id, false)}
                              className={`px-2 py-1 text-xs rounded ${!f.approved ? 'bg-red-600 text-white' : 'bg-white/10 text-white/70 hover:bg-red-600'}`}
                            >
                              ✗
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Botão flutuante do Chat AI - apenas para VIP */}
      {vipEnabled && (
        <button
          onClick={() => setShowAIChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center z-40"
          title="Chat de Suporte Inteligente"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Chat AI Modal */}
      {showAIChat && vipEnabled && (
        <AIChat
          businessType={siteStructure?.category || "geral"}
          businessName={user?.siteSlug || "seu negócio"}
          onClose={() => setShowAIChat(false)}
        />
      )}

      {/* Gerador de Conteúdo IA Modal */}
      {showContentGenerator && vipEnabled && (
        <AIContentGenerator
          businessType={siteStructure?.category || "geral"}
          businessName={user?.siteSlug || "seu negócio"}
          businessDescription={siteStructure?.description}
          onContentGenerated={handleContentGenerated}
          onClose={() => setShowContentGenerator(false)}
        />
      )}
    </div>
  );
}

/* ================= COMPONENTES ================= */
function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white text-slate-900 p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function VipGate({
  enabled, checking, children, teaser,
}: { enabled: boolean; checking?: boolean; teaser: string; children: React.ReactNode; }) {
  if (enabled) return <>{children}</>;
  if (checking) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-70">{children}</div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent via-[#0B1220]/80 to-[#0B1220]" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur px-4 py-3 text-sm text-white">
            Verificando sua assinatura…
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[1.1px] opacity-80">{children}</div>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent via-[#0B1220]/80 to-[#0B1220]" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-white">{teaser}</div>
          <a
            href={UPGRADE_URL}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-black hover:bg-emerald-400"
          >
            Fazer upgrade
          </a>
        </div>
      </div>
    </div>
  );
}

function MediaSlot({ slot, onUpload }: { slot: ImageSlot; onUpload: (slot: ImageSlot, file: File) => Promise<void> }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      await onUpload(slot, file);
    } catch (err: any) {
      alert(err?.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border rounded-lg p-3">
      <div className="text-sm font-medium mb-2">{slot.label}</div>
      {slot.url ? (
        <div className="space-y-2">
          <img src={slot.url} alt={slot.label} className="w-full h-24 object-cover rounded" />
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="w-full text-xs"
          />
        </div>
      ) : (
        <input
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="w-full text-xs"
        />
      )}
      {uploading && <div className="text-xs text-blue-600">Enviando...</div>}
    </div>
  );
}