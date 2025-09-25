import React, { useEffect, useRef, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useAuth } from "@/hooks/useAuth";
import AIChat from "./components/AIChat";
import AIContentGenerator from "./components/AIContentGenerator";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import BusinessInsights from "./components/BusinessInsights";
import GoogleReviews from "./components/GoogleReviews";
import SEOOptimizer from "./components/SEOOptimizer";
import WhatsAppManager from "./components/WhatsAppManager";
import LeadScoring from "./components/LeadScoring";
import MultiLanguageManager from "./components/MultiLanguageManager";
import AppointmentScheduling from "./components/AppointmentScheduling";
import FeatureManager from "./components/FeatureManager";
import { EcommerceDashboard } from "./components/EcommerceDashboard";
import TemplateMarketplace from "./components/TemplateMarketplace";
import AuditLogs from "./components/AuditLogs";
import { AICopywriter } from "@/components/ui/ai-copywriter";
// mantendo seus imports de skeletons
import { DashboardCardSkeleton, MetricsSkeleton, ContentSkeleton } from "@/components/ui/loading-skeletons";
import { interceptNetlifyFunctions } from "@/utils/devMocks";

/* ================= CONFIG ================= */
const PLAN_TIMEOUT_MS = 8000; // Increased from 3s to 8s for better reliability
const PLAN_RETRY_COUNT = 2; // Number of retries for plan validation
const CARDS_TIMEOUT_MS = 5000;
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
  lastPayment?: string | null;
};

type ClientSettings = {
  showBrand?: boolean;
  showPhone?: boolean;
  phone?: string;
  primaryColor?: string;
  palette?: string;
};

type Feedback = {
  id: string;
  name: string;
  email?: string;
  rating: number;
  message?: string;
  sentiment?: any;
  approved?: boolean;
  createdAt?: string;
};

type ImageSlot = {
  key: string;
  label: string;
  url?: string;
};

interface SiteStructure {
  description?: string;
  category?: string;
  sections: Array<{
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
  }>;
}

/* ===== MOCK FUNCTIONS ===== */
function getJSON<T>(url: string, timeoutMs = 10000): Promise<T> {
  // Mock data handling for development

  const devMode = (import.meta as any).env?.DEV;
  if (devMode && (url.includes("client-plan") || url.includes("auth-status"))) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, { signal: controller.signal })
      .then(async (r) => {
        clearTimeout(timeoutId);
        if (url.includes("client-plan")) {
          const mockData = {
            ok: true,
            siteSlug: "MATHEUS",
            status: "active",
            plan: "vip",
            nextCharge: "2025-02-25",
            lastPayment: "2025-01-25"
          };
          console.log('[DEV MOCK] client-plan returning:', mockData);
          return mockData as T;
        }
        if (url.includes("auth-status")) {
          const mockData = {
            ok: true,
            user: { email: "matheus@elevea.com.br", siteSlug: "MATHEUS", role: "client" },
            authenticated: true
          };
          console.log('[DEV MOCK] auth-status returning:', mockData);
          return mockData as T;
        }
        return await r.json();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        throw error;
      });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return fetch(url, { signal: controller.signal })
    .then(async (r) => {
      clearTimeout(timeoutId);
      return await r.json();
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      throw error;
    });
}

function postJSON<T>(url: string, data: any, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(async (r) => {
      clearTimeout(timeoutId);
      return await r.json();
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      throw error;
    });
}

function looksVip(plan?: string) {
  return ["vip", "pro", "premium", "plus"].some(p => plan?.toLowerCase().includes(p));
}

/* ================= MAIN COMPONENT ================= */
export default function Dashboard() {
  const { user } = useSession();
  const { logout: authLogout } = useAuth();
  const canQuery = !!user?.email && !!user?.siteSlug && user?.role === "client";

  /* ------- DEV FORCE VIP ------- */
  const devMode = (import.meta as any).env?.DEV;
  const DEV_FORCE_VIP = devMode && user?.email === "matheus@elevea.com.br";

  // Estados
  const [plan, setPlan] = useState<string>(""); 
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  // Cards
  const [settings, setSettings] = useState<ClientSettings>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [slots, setSlots] = useState<ImageSlot[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [siteStructure, setSiteStructure] = useState<SiteStructure | null>(null);
  const [loadingStructure, setLoadingStructure] = useState(true);

  // Misc
  const [saving, setSaving] = useState(false);
  const [vipPin, setVipPin] = useState("");
  const [planFetchTick, setPlanFetchTick] = useState(0);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showContentGenerator, setShowContentGenerator] = useState(false);
  const [savingStructure, setSavingStructure] = useState(false);

  // VIP habilita se QUALQUER fonte indicar isso (ou DEV force)
  // Agora também considera cache e fallbacks para resilência
  const vipEnabledRaw =
    looksVip(plan || undefined) ||
    looksVip(status?.plan) ||
    looksVip(localStorage.getItem("last_plan") || undefined);

  // Força "VIP ativo" para Matheus no dev, mesmo se o fetch falhar
  useEffect(() => {
    if (DEV_FORCE_VIP && !vipPin) {
      setVipPin("123456"); // PIN automático para dev
    }
  }, [DEV_FORCE_VIP, vipPin]);

  const vipEnabled = DEV_FORCE_VIP || vipEnabledRaw;

  // helpers de features (não esconda nada se for VIP/forçado)
  const isFeatureEnabled = (featureId: string) => {
    if (vipEnabled) return true; // VIP real ou forçado vê tudo
    return enabledFeatures.includes(featureId);
  };

  // Helper para operações VIP que requerem PIN (operações críticas)
  const canPerformVipAction = (requirePin: boolean = false) => {
    if (DEV_FORCE_VIP) return true; // Force VIP ignora PIN
    if (!vipEnabled) return false; // Não VIP não pode
    return requirePin ? !!vipPin : true; // Se requer PIN, verifica se tem
  };

  const loadUserFeatures = async () => {
    if (!canQuery) {
      setFeaturesLoaded(true);
      return;
    }
    try {
      const resp = await getJSON<{ ok: boolean; features: string[] }>(
        `/.netlify/functions/features?site=${encodeURIComponent(user!.siteSlug!)}`,
        3000
      );
      if (resp.ok && resp.features) {
        setEnabledFeatures(resp.features);
      }
    } catch {
      // silencioso, usa default vazio
    } finally {
      setFeaturesLoaded(true);
    }
  };

  // Chama loadUserFeatures uma vez ao montar
  useEffect(() => {
    loadUserFeatures();
  }, [canQuery]);

  // Cache do último plano no localStorage para resilência
  const planLabel = vipEnabled
    ? (status?.plan?.toUpperCase?.() || plan?.toUpperCase?.() || (DEV_FORCE_VIP ? "VIP (FORÇADO)" : "VIP"))
    : (plan || status?.plan || "—");

  /* 1) Carrega plano principal */
  useEffect(() => {
    if (!canQuery) return;

    // abre com último plano conhecido (se existir)
    const lastKnown = localStorage.getItem("last_plan");
    if (lastKnown && !plan) setPlan(lastKnown);

    let alive = true;
    setCheckingPlan(true);

    (async () => {
      const MAX_ATTEMPTS = PLAN_RETRY_COUNT;
      let attempt = 0;
      
      while (attempt < MAX_ATTEMPTS && alive) {
        try {
          attempt++;
          
          // Tenta buscar plano e status em paralelo para melhor UX
          const [planResp, statusResp] = await Promise.allSettled([
            getJSON<{ ok: boolean; plan?: string }>(`/.netlify/functions/client-plan?site=${encodeURIComponent(user!.siteSlug!)}`, PLAN_TIMEOUT_MS),
            getJSON<StatusResp>(`/.netlify/functions/subscription-status?site=${encodeURIComponent(user!.siteSlug!)}`, PLAN_TIMEOUT_MS)
          ]);

          if (!alive) return;

          // Processa resposta do plano
          if (planResp.status === "fulfilled" && planResp.value?.ok) {
            const newPlan = planResp.value.plan || "";
            setPlan(newPlan);
            if (newPlan) localStorage.setItem("last_plan", newPlan);
          }

          // Processa resposta do status
          if (statusResp.status === "fulfilled" && statusResp.value?.ok) {
            setStatus(statusResp.value);
            if (statusResp.value.plan) {
              localStorage.setItem("last_plan", statusResp.value.plan);
            }
          }

          // Se conseguiu pelo menos uma resposta bem-sucedida, para de tentar
          if (planResp.status === "fulfilled" || statusResp.status === "fulfilled") {
            break;
          }

        } catch (error) {
          console.warn(`Attempt ${attempt}/${MAX_ATTEMPTS} failed:`, error);
          if (attempt < MAX_ATTEMPTS) {
            // Espera exponencial entre tentativas
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    })().finally(() => {
      if (alive) setCheckingPlan(false);
    });

    // cleanup
    return () => {
      alive = false;
    };
  }, [canQuery, user?.siteSlug, user?.email, planFetchTick, DEV_FORCE_VIP]);

  const retryPlan = () => {
    setPlanFetchTick(prev => prev + 1);
  };

  // Função auxiliar para buscar settings em paralelo
  const fetchSettings = async () => {
    const url = `/.netlify/functions/client-api?action=get_settings&site=${encodeURIComponent(user!.siteSlug!)}`;
    const r = await getJSON<{ ok: boolean; settings?: ClientSettings }>(url, CARDS_TIMEOUT_MS);
    return r.settings || {};
  };

  /* 2) Cards em paralelo (não bloqueiam a decisão VIP) */
  useEffect(() => {
    if (!canQuery) {
      setLoadingAssets(false);
      setLoadingSettings(false);
      return;
    }
    let alive = true;

    // 2a) Settings
    (async () => {
      try {
        const settings = await fetchSettings();
        if (!alive) return;
        setSettings(settings);
      } catch {
        // silencioso
      } finally {
        if (alive) setLoadingSettings(false);
      }
    })();

    // 2b) Assets
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
      } catch {
        // silencioso
      } finally {
        if (alive) setLoadingAssets(false);
      }
    })();

    // cleanup
    return () => {
      alive = false;
    };
  }, [canQuery, user?.siteSlug, status?.nextCharge, status?.lastPayment, DEV_FORCE_VIP]);

  /* 3) FEEDBACKS */
  useEffect(() => {
    if (!canQuery) return;
    let alive = true;

    (async () => {
      try {
        let fb: { ok: boolean; items: Feedback[] };

        // VIP pode ver feedbacks seguros se tiver PIN, senão vê básicos
        if (canPerformVipAction(true)) { // true = requer PIN para feedbacks seguros
          fb = await postJSON<{ ok: boolean; items: Feedback[] }>(
            "/.netlify/functions/client-api",
            { action: "list_feedbacks_secure", site: user!.siteSlug!, pin: vipPin || "FORCED" },
            CARDS_TIMEOUT_MS
          ).catch(() => ({ ok: true, items: [] as Feedback[] }));
        } else if (vipEnabled) {
          // VIP sem PIN ainda pode ver feedbacks básicos
          fb = await getJSON<{ ok: boolean; items: Feedback[] }>(
            `/.netlify/functions/client-api?action=list_feedbacks&site=${encodeURIComponent(user!.siteSlug!)}`,
            CARDS_TIMEOUT_MS
          ).catch(() => ({ ok: true, items: [] as Feedback[] }));
        } else {
          // Não VIP vê feedbacks básicos
          fb = await getJSON<{ ok: boolean; items: Feedback[] }>(
            `/.netlify/functions/client-api?action=list_feedbacks&site=${encodeURIComponent(user!.siteSlug!)}`,
            CARDS_TIMEOUT_MS
          ).catch(() => ({ ok: true, items: [] as Feedback[] }));
        }

        if (!alive) return;
        const items = fb.items || [];
        setFeedbacks(items);

        // análise automática (não bloqueia) - VIP tem acesso independente de PIN
        if (vipEnabled && items.length > 0) {
          (async () => {
            try {
              const toAnalyze = items.filter(f => !f.sentiment && f.message?.trim()).slice(0, 10);
              if (toAnalyze.length === 0) return;
              const resp = await fetch("/.netlify/functions/ai-sentiment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  batch: toAnalyze.map(f => ({ id: f.id, feedback: f.message, clientName: f.name })),
                }),
              });
              if (resp.ok) {
                const data = await resp.json();
                if (data.ok && data.results) {
                  setFeedbacks(prev => prev.map(f => {
                    const a = data.results.find((r: any) => r.id === f.id && r.success);
                    return a ? { ...f, sentiment: a.analysis } : f;
                  }));
                }
              }
            } catch {}
          })();
        }
      } catch {
      } finally {
        if (alive) setLoadingFeedbacks(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [canQuery, user?.siteSlug, vipEnabled, vipPin, DEV_FORCE_VIP]);

  /* 4) ESTRUTURA DO SITE */
  useEffect(() => {
    // VIP pode ver estrutura, mas precisa de PIN para salvar
    if (!canQuery || !vipEnabled) {
      setSiteStructure(null);
      setLoadingStructure(false);
      return;
    }
    let alive = true;

    (async () => {
      try {
        const resp = await getJSON<{ ok: boolean; structure?: SiteStructure }>(
          `/.netlify/functions/client-api?action=get_structure&site=${encodeURIComponent(user!.siteSlug!)}`,
          CARDS_TIMEOUT_MS
        );
        if (!alive) return;
        if (resp.ok && resp.structure) {
          setSiteStructure(resp.structure);
        }
      } catch {
        // silencioso
      } finally {
        if (alive) setLoadingStructure(false);
      }
    })();

    return () => { alive = false; };
  }, [canQuery, user?.siteSlug, vipEnabled, vipPin, DEV_FORCE_VIP]);

  /* Ações */
  async function saveSettings(partial: Partial<ClientSettings>) {
    if (!canQuery) return;
    setSaving(true);
    try {
      const response = await fetch("/.netlify/functions/client-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_settings",
          site: user!.siteSlug!,
          settings: { ...settings, ...partial },
        }),
      });
      if (!response.ok) throw new Error("Falha ao salvar configurações");
      setSettings((prev) => ({ ...prev, ...partial }));
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
    fd.append("key", slot.key);
    fd.append("file", file);
    const r = await fetch("/.netlify/functions/upload-drive", { method: "POST", body: fd });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "Erro no upload");
    setSlots((prev) => prev.map((s) => (s.key === slot.key ? { ...s, url: j.url } : s)));
  }

  // Inicializa slots básicos
  useEffect(() => {
    setSlots([
      { key: "hero-image", label: "Imagem Principal" },
      { key: "about-image", label: "Imagem Sobre" },
      { key: "services-bg", label: "Fundo Serviços" },
    ]);
  }, []);

  async function saveSiteStructure(structureToSave: SiteStructure) {
    if (!canQuery) return;
    setSavingStructure(true);
    try {
      const response = await fetch("/.netlify/functions/client-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_structure",
          site: user!.siteSlug!,
          structure: structureToSave,
          pin: vipPin || "FORCED"
        }),
      });
      if (!response.ok) throw new Error("Falha ao salvar estrutura");
      setSiteStructure(structureToSave);
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar estrutura do site");
    } finally {
      setSavingStructure(false);
    }
  }

  const handleContentGenerated = (content: any[]) => {
    if (!siteStructure || !content.length) return;
    const updatedStructure = { ...siteStructure };
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
      ),
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
                <span className="rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-300 px-3 py-1 text-xs font-medium">
                  VIP ativo{DEV_FORCE_VIP ? " (forçado)" : ""}
                </span>
                <input
                  value={vipPin}
                  onChange={(e) => setVipPin(e.target.value)}
                  placeholder="PIN VIP"
                  className="rounded-xl bg-white/70 text-black px-3 py-2 text-xs"
                />
              </>
            ) : checkingPlan ? (
              <span className="rounded-xl bg-yellow-500/15 text-yellow-700 border border-yellow-300 px-3 py-1 text-xs font-medium">
                Verificando…
              </span>
            ) : (
              <span className="rounded-xl bg-slate-500/15 text-slate-700 border border-slate-300 px-3 py-1 text-xs font-medium">
                Plano Essential
              </span>
            )}
            <button
              onClick={logout}
              className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:opacity-90"
            >
              Sair
            </button>
          </div>
        </header>

        {/* RETRY BUTTON PARA PLANO */}
        {(!vipEnabled && !checkingPlan && !DEV_FORCE_VIP) && (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4 text-center">
            <p className="text-sm text-amber-200 mb-3">
              Não foi possível verificar seu plano automaticamente.
            </p>
            <button
              onClick={retryPlan}
              className="rounded-xl bg-amber-500 text-black px-4 py-2 text-sm font-medium hover:bg-amber-400"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Analytics do Site */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
          <h2 className="text-lg font-semibold mb-4">Analytics do Site</h2>
          <p className="text-sm text-white/60 mb-4">Dados dos últimos 30 dias</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card title="VISITAS TOTAIS" value="1.609" />
            <Card title="LEADS GERADOS" value="80" />
            <Card title="AVALIAÇÃO MÉDIA" value="4.2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-sm text-white/80">Visão Geral</div>
            </div>
            <div className="rounded-xl bg-blue-600 px-3 py-2">
              <div className="text-sm text-white">Tráfego</div>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-sm text-white/80">Conversões</div>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-sm text-white/80">Feedbacks</div>
            </div>
          </div>
        </div>

        {/* Grid Principal de Funcionalidades */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* CONFIGURAÇÕES */}
          <VipGate
            enabled={vipEnabled}
            checking={checkingPlan && !DEV_FORCE_VIP}
            teaser="Configure aparência, tema e PIN VIP"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h2 className="text-lg font-semibold mb-4">Configurações Gerais</h2>
              
              {loadingSettings && !DEV_FORCE_VIP ? (
                <DashboardCardSkeleton />
              ) : (
                <div className="space-y-4">
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

                  <div>
                    <label className="block text-sm font-medium mb-1">Número WhatsApp</label>
                    <input
                      type="tel"
                      value={settings.phone || ""}
                      onChange={(e) => saveSettings({ phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">PIN VIP</label>
                <input
                  type="password"
                  value={vipPin}
                  onChange={(e) => setVipPin(e.target.value)}
                  placeholder="Use um PIN para acessar recursos VIP"
                  disabled={saving}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use um PIN para acessar todas as funcionalidades VIP
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Paleta de Cores</label>
                <div className="grid grid-cols-2 gap-2">
                  {PALETAS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => saveSettings({ palette: p.name })}
                      className={`p-2 rounded-lg border text-left ${
                        settings.palette === p.name
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-white/20 hover:border-white/40"
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">{p.name}</div>
                      <div className="flex gap-1">
                        {p.colors.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {saving && (
                <div className="text-center text-blue-400 text-sm">Salvando...</div>
              )}
            </div>
          </VipGate>

          {/* MÍDIAS */}
          <VipGate
            enabled={vipEnabled}
            checking={loadingAssets && !DEV_FORCE_VIP}
            teaser="Personalize imagens e vídeos do seu site"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h2 className="text-lg font-semibold mb-4">Mídias do Site</h2>
              <div className="grid gap-4">
                {slots.map((slot) => (
                  <MediaSlot key={slot.key} slot={slot} onUpload={handleUpload} />
                ))}
              </div>
            </div>
          </VipGate>

          {/* PERSONALIZAÇÃO DE SEÇÕES */}
          <VipGate
            enabled={vipEnabled && !!(vipPin || DEV_FORCE_VIP)}
            checking={loadingStructure && !DEV_FORCE_VIP}
            teaser="Personalize títulos, subtítulos e conteúdo das seções do seu site"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Personalização de Seções</h2>
                {vipEnabled && (
                  <button
                    onClick={() => setShowContentGenerator(true)}
                    className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full hover:opacity-90"
                  >
                    ✨ Gerar com IA
                  </button>
                )}
              </div>

              {loadingStructure && !DEV_FORCE_VIP ? (
                <ContentSkeleton />
              ) : siteStructure ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Descrição do Negócio</label>
                    <textarea
                      value={siteStructure.description || ""}
                      onChange={(e) => {
                        const updatedStructure = { ...siteStructure, description: e.target.value };
                        setSiteStructure(updatedStructure);
                      }}
                      onBlur={() => saveSiteStructure(siteStructure)}
                      placeholder="Descreva brevemente o que sua empresa faz, seus diferenciais..."
                      className="w-full px-3 py-2 border rounded-lg text-black"
                      rows={3}
                    />
                  </div>

                  <button
                    onClick={() => saveSiteStructure(siteStructure)}
                    disabled={savingStructure}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-medium py-2 px-4 rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {savingStructure ? "Salvando..." : "💾 Gerar Conteúdo"}
                  </button>

                  {siteStructure.sections && siteStructure.sections.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h3 className="text-sm font-medium">Seções do Site:</h3>
                      {siteStructure.sections.map((section) => (
                        <div key={section.id} className="border border-white/20 rounded-lg p-3">
                          <div className="text-sm font-medium mb-2">{section.id.toUpperCase()}</div>
                          <input
                            type="text"
                            value={section.title || ""}
                            onChange={(e) => updateSectionField(section.id, "title", e.target.value)}
                            onBlur={() => saveSiteStructure(siteStructure)}
                            placeholder="Título da seção"
                            className="w-full px-2 py-1 text-xs border rounded mb-2 text-black"
                          />
                          <input
                            type="text"
                            value={section.subtitle || ""}
                            onChange={(e) => updateSectionField(section.id, "subtitle", e.target.value)}
                            onBlur={() => saveSiteStructure(siteStructure)}
                            placeholder="Subtítulo (opcional)"
                            className="w-full px-2 py-1 text-xs border rounded mb-2 text-black"
                          />
                          <textarea
                            value={section.description || ""}
                            onChange={(e) => updateSectionField(section.id, "description", e.target.value)}
                            onBlur={() => saveSiteStructure(siteStructure)}
                            placeholder="Descrição da seção"
                            className="w-full px-2 py-1 text-xs border rounded text-black"
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-white/60 py-8">
                  <p className="mb-4">Estrutura do site não disponível</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Recarregar
                  </button>
                </div>
              )}
            </div>
          </VipGate>

          {/* FEEDBACKS RECENTES */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Feedbacks Recentes</h2>
                <span className="text-xs text-white/60">
                  {canPerformVipAction(true)
                    ? "Todos os feedbacks (com PIN)"
                    : vipEnabled 
                    ? "Feedbacks básicos (VIP)"
                    : "Apenas aprovados"}
                </span>
              </div>
            </div>

            {loadingFeedbacks && !DEV_FORCE_VIP ? (
              <DashboardCardSkeleton />
            ) : feedbacks.length > 0 ? (
              <div className="space-y-3">
                {feedbacks.slice(0, 5).map((feedback) => (
                  <div
                    key={feedback.id}
                    className="border border-white/20 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm">{feedback.name}</div>
                        <div className="text-xs text-white/60">{feedback.email}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {"★".repeat(feedback.rating)}
                        <span className="text-xs text-white/60 ml-1">
                          {feedback.rating}/5
                        </span>
                      </div>
                    </div>
                    
                    {feedback.message && (
                      <p className="text-sm text-white/80 mb-2">"{feedback.message}"</p>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">
                        {feedback.createdAt 
                          ? new Date(feedback.createdAt).toLocaleDateString()
                          : "Data não disponível"}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        {feedback.sentiment && (
                          <span className={`px-2 py-1 rounded text-xs ${
                            feedback.sentiment.score > 0.5 
                              ? "bg-green-500/20 text-green-300" 
                              : feedback.sentiment.score > -0.2
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-red-500/20 text-red-300"
                          }`}>
                            {feedback.sentiment.label}
                          </span>
                        )}

                        {vipEnabled && (
                          <div className="flex gap-1">
                            <button
                              className="text-green-400 hover:text-green-300 px-1"
                              title="Aprovar"
                            >
                              ✓
                            </button>
                            <button
                              className="text-red-400 hover:text-red-300 px-1"
                              title="Rejeitar"
                            >
                              ✗
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-white/60 py-8">
                E-mail e telefone foram "bloqueados" não são publicados.
                <br />
                Nenhum feedback ainda.
              </div>
            )}
          </div>
        </div>

        {/* Outras funcionalidades VIP em grid expandido */}
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Analytics Avançado */}
          <VipGate
            enabled={vipEnabled}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Analytics avançado com insights de IA"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Analytics Avançado</h3>
              <p className="text-sm text-white/60">Analytics inteligente em desenvolvimento...</p>
            </div>
          </VipGate>

          {/* Google Reviews */}
          <VipGate
            enabled={vipEnabled}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Gestão completa de reviews do Google"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Google Reviews</h3>
              <p className="text-sm text-white/60">Gestão de reviews em desenvolvimento...</p>
            </div>
          </VipGate>

          {/* SEO Optimizer */}
          <VipGate
            enabled={vipEnabled}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Otimização automática de SEO com IA"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">SEO Optimizer</h3>
              <p className="text-sm text-white/60">Otimização de SEO em desenvolvimento...</p>
            </div>
          </VipGate>

          {/* WhatsApp Manager */}
          <VipGate
            enabled={vipEnabled}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Chatbot WhatsApp automatizado"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">WhatsApp Manager</h3>
              <p className="text-sm text-white/60">Chatbot WhatsApp em desenvolvimento...</p>
            </div>
          </VipGate>

          {/* Lead Scoring */}
          <VipGate
            enabled={vipEnabled}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Pontuação inteligente de leads"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Lead Scoring</h3>
              <p className="text-sm text-white/60">Pontuação de leads em desenvolvimento...</p>
            </div>
          </VipGate>

          {/* Template Marketplace */}
          <VipGate
            enabled={vipEnabled}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Loja de templates premium"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Template Marketplace</h3>
              <p className="text-sm text-white/60">Loja de templates em desenvolvimento...</p>
            </div>
          </VipGate>

          {/* Multi-Language Manager */}
          <VipGate
            enabled={isFeatureEnabled("multi-language")}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Suporte completo a múltiplos idiomas"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Multi-Language</h3>
              <p className="text-sm text-white/60">Múltiplos idiomas em desenvolvimento...</p>
            </div>
          </VipGate>

          {/* Appointment Scheduling */}
          <VipGate
            enabled={isFeatureEnabled("appointment-scheduling")}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Sistema de agendamento inteligente"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Agendamento</h3>
              <p className="text-sm text-white/60">Sistema de agendamento em desenvolvimento...</p>
            </div>
          </VipGate>

          {/* E-commerce Dashboard */}
          <VipGate
            enabled={isFeatureEnabled("ecommerce")}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Funcionalidades completas de e-commerce"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">E-commerce</h3>
              <p className="text-sm text-white/60">Funcionalidades de e-commerce em desenvolvimento...</p>
            </div>
          </VipGate>

          {/* Business Insights */}
          <VipGate
            enabled={vipEnabled}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Insights preditivos com IA"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Business Insights</h3>
              <p className="text-sm text-white/60">Insights preditivos em desenvolvimento...</p>
            </div>
          </VipGate>

          {/* Feature Manager */}
          <VipGate
            enabled={vipEnabled}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Gestão avançada de funcionalidades"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Feature Manager</h3>
              <p className="text-sm text-white/60">Gestão de funcionalidades em desenvolvimento...</p>
            </div>
          </VipGate>

          {/* Audit Logs */}
          <VipGate
            enabled={vipEnabled}
            checking={!featuresLoaded && !DEV_FORCE_VIP}
            teaser="Logs de auditoria e segurança"
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Audit Logs</h3>
              <p className="text-sm text-white/60">Logs de auditoria em desenvolvimento...</p>
            </div>
          </VipGate>
        </div>
      </div>

      {/* Botão flutuante do Chat AI - apenas para VIP */}
      {vipEnabled && (
        <button
          onClick={() => setShowAIChat(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:opacity-90 z-50"
          title="Chat com IA"
        >
          <span className="text-xl">🤖</span>
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
  enabled,
  checking,
  children,
  teaser,
}: {
  enabled: boolean;
  checking?: boolean;
  teaser: string;
  children: React.ReactNode;
}) {
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

function MediaSlot({
  slot,
  onUpload,
}: {
  slot: ImageSlot;
  onUpload: (slot: ImageSlot, file: File) => Promise<void>;
}) {
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