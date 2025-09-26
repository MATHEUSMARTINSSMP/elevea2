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
import { LeadCapture } from "@/components/dashboard/LeadCapture";
import MultiLanguageManager from "./components/MultiLanguageManager";
import AppointmentScheduling from "./components/AppointmentScheduling";
import FeatureManager from "./components/FeatureManager";
import { EcommerceDashboard } from "./components/EcommerceDashboard";
import TemplateMarketplace from "./components/TemplateMarketplace";
import AuditLogs from "./components/AuditLogs";
import { AICopywriter } from "@/components/ui/ai-copywriter";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
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
  colorScheme?: string;
  theme?: { primary: string; background: string; accent: string };
  customCSS?: string;
  vipPin?: string;
};

type ImageSlot = { key: string; label: string; url?: string };

/* ===== fetch com timeout real (AbortController) ===== */
async function getJSON<T = any>(url: string, ms: number): Promise<T> {
  // DEV MOCK: intercepta chamadas a funções Netlify quando rodando em localhost
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    url.includes("/.netlify/functions/")
  ) {
    console.log("[DEV MOCK] Intercepting:", url);

    if (url.includes("/client-plan")) {
      const mockData = {
        ok: true,
        vip: true,
        plan: "vip",
        status: "active",
        nextCharge: "2025-10-25T10:00:00.000Z",
        lastPayment: {
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 97.0,
        },
      };
      console.log("[DEV MOCK] client-plan returning:", mockData);
      return mockData as T;
    }

    if (url.includes("/auth-status")) {
      const mockData = {
        ok: true,
        siteSlug: "demo",
        status: "active",
        plan: "vip",
        nextCharge: "2025-10-25T10:00:00.000Z",
        lastPayment: {
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 97.0,
        },
        error: null,
      };
      console.log("[DEV MOCK] auth-status returning:", mockData);
      return mockData as T;
    }
  }

  // Chamada real com timeout
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
    // Usa o interceptor de mocks em dev (quando for função Netlify)
    const r = await interceptNetlifyFunctions(url, (fetchUrl) =>
      fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctl.signal,
        credentials: "include",
      })
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

// Normaliza feedbacks vindos do backend/Netlify para um único formato no front
function normalizeFeedbackItemsFront(items: any[]): Feedback[] {
  if (!Array.isArray(items)) return [];
  return items.map((it) => ({
    id: String(it.id ?? ""),
    name: String(it.name ?? ""),
    message: String(it.message ?? it.comment ?? ""),
    timestamp: String(it.timestamp ?? it.ts ?? ""),
    approved: String(it.approved ?? "").toLowerCase() === "true",
    email: it.email ? String(it.email) : undefined,
    phone: it.phone ? String(it.phone) : undefined,
    sentiment: it.sentiment || undefined,
  }));
}

/* ===== helpers ===== */
const norm = (s?: string) => String(s ?? "").trim().toLowerCase();
const looksVip = (p?: string) => !!p && (norm(p) === "vip" || norm(p).includes("vip"));
const isActiveStatus = (s?: string) =>
  ["approved", "authorized", "active", "processing", "in_process", "charged", "authorized_pending_capture"].includes(norm(s));

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

/* Helpers de query-string */
const getQS = (key: string) => {
  try { return new URLSearchParams(window.location.search).get(key) ?? undefined; } catch { return undefined; }
};
const getQSBool = (key: string) => {
  const v = getQS(key);
  return v === "1" || v === "true";
};

/* ================= Página ================= */
export default function ClientDashboard() {
  const { user } = useSession();
  const { logout: authLogout } = useAuth();
  const canQuery = !!user?.email && !!user?.siteSlug && user?.role === "client";

  /* ------- DEV FORCE VIP ------- */
  const DEV_FORCE_VIP =
    typeof window !== "undefined" &&
    (getQSBool("forceVIP") || localStorage.getItem("elevea:forceVIP") === "1");

  /* Plano / gate VIP */
  const [plan, setPlan] = useState<string | null>(null);
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const cacheKey = `dashboard:lastPlan:${user?.siteSlug || ""}`;
  const onceRef = useRef(false);
  const [planFetchTick, setPlanFetchTick] = useState(0);

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

  const [vipPin, setVipPin] = useState<string>(() => {
    // Prioridade: ?pin=... > sessionStorage > vazio (será preenchido pelos settings depois)
    try {
      const qsPin = getQS("pin");
      if (qsPin) return qsPin;
      const ss = sessionStorage.getItem("dashboard:vipPin") || "";
      return ss;
    } catch {
      return "";
    }
  });
  const [saving, setSaving] = useState(false);

  /* Gerenciamento de Funcionalidades */
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [userPlan, setUserPlan] = useState<"essential" | "vip">("essential");
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  /* Chat AI */
  const [showAIChat, setShowAIChat] = useState(false);

  /* Gerador de Conteúdo IA */
  const [showContentGenerator, setShowContentGenerator] = useState(false);

  /* Estrutura do site (personalização VIP) */
  const [siteStructure, setSiteStructure] = useState<any>(null);
  const [loadingStructure, setLoadingStructure] = useState(true);
  const [savingStructure, setSavingStructure] = useState(false);

  // Persistir vipPin sempre que mudar
  useEffect(() => {
    try { sessionStorage.setItem("dashboard:vipPin", vipPin || ""); } catch {}
  }, [vipPin]);

  // Detecção de plano: dev (acesso total) ou vip (limitado) ou essential
  const isDevUser = user?.plan === "dev" || user?.email === "dev";
  const isVipUser = looksVip(plan || undefined) || looksVip(status?.plan) || isActiveStatus(status?.status);
  
  // VIP habilita se QUALQUER fonte indicar isso (ou DEV force) 
  // Agora também considera cache e fallbacks para resilência
  const vipEnabledRaw =
    isDevUser || // Dev sempre tem acesso total
    isVipUser ||
    (function() {
      // Fallback: verifica cache de último plano VIP conhecido
      try {
        const cached = sessionStorage.getItem(cacheKey);
        return cached && looksVip(cached);
      } catch { return false; }
    })();

  const vipEnabled = DEV_FORCE_VIP || vipEnabledRaw;

  // helpers de features
  const isFeatureEnabled = (featureId: string) => {
    // Dev user sempre tem acesso a todas as features
    if (isDevUser) return true;
    
    // VIP tem acesso apenas às 5 funcionalidades permitidas
    const vipAllowedFeatures = [
      "whatsapp-chatbot",    // Agente WhatsApp
      "google-reviews",      // Google Meu Negócio  
      "feedback-management", // Feedbacks
      "color-palette",       // Paleta de cores
      "traffic-analytics"    // Tráfego do site
    ];
    
    if (vipEnabled) {
      return vipAllowedFeatures.includes(featureId);
    }
    
    return enabledFeatures.includes(featureId);
  };

  const isFeatureInDevelopment = (featureId: string) => {
    // Se é dev, nada está em desenvolvimento
    if (isDevUser) return false;
    
    // Para VIP, funcionalidades fora da lista permitida estão em desenvolvimento
    const vipAllowedFeatures = [
      "whatsapp-chatbot",
      "google-reviews", 
      "feedback-management",
      "color-palette",
      "traffic-analytics"
    ];
    
    return !vipAllowedFeatures.includes(featureId);
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
      const response = await fetch("/.netlify/functions/feature-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_user_features",
          siteSlug: user?.siteSlug,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.ok) {
          setEnabledFeatures(result.userSettings.enabledFeatures || []);
          setUserPlan(result.userSettings.plan || "essential");
        }
      }
    } catch (error) {
      console.error("Erro ao carregar funcionalidades:", error);
      // não bloqueie a UI em caso de erro
    } finally {
      setFeaturesLoaded(true);
    }
  };

  // Mostra "VIP" (ou o valor do plano) mesmo se o fetch principal falhar,
  // usando também status.plan como fallback.
  const planLabel = vipEnabled
    ? (status?.plan?.toUpperCase?.() || plan?.toUpperCase?.() || (DEV_FORCE_VIP ? "VIP (FORÇADO)" : "VIP"))
    : (plan || status?.plan || "—");

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

    // se forçado, não bloqueia a página
    if (DEV_FORCE_VIP) {
      setCheckingPlan(false);
      setLoadingStatus(false);
      return;
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
        // Se backend retorna vip=true, forçar plan="vip"
        const resolvedPlan = r.vip ? "vip" : (r.plan || "");
        setPlan(resolvedPlan);
        
        try {
          sessionStorage.setItem(cacheKey, resolvedPlan);
        } catch {}

        // hidrata status com o que já veio
        setStatus({
          ok: true,
          siteSlug: user!.siteSlug!,
          status: r.status,
          nextCharge: r.nextCharge,
          lastPayment: r.lastPayment,
          plan: resolvedPlan,
        });

        setLoadingStatus(false);
      } catch (e: any) {
        setPlanErr("Não foi possível validar sua assinatura agora.");
      } finally {
        if (alive) setCheckingPlan(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [canQuery, user?.siteSlug, user?.email, planFetchTick, DEV_FORCE_VIP]);

  const retryPlan = () => {
    try {
      sessionStorage.removeItem(cacheKey);
    } catch {}
    setPlan(null);
    setPlanErr(null);
    setLoadingStatus(true);
    setPlanFetchTick((n) => n + 1);
  };

  /* 2) Cards em paralelo (não bloqueiam a decisão VIP) */
  useEffect(() => {
    if (!canQuery) {
      setLoadingAssets(false);
      setLoadingSettings(false);
      setLoadingStructure(false);
      setLoadingFeedbacks(false);
      setFeaturesLoaded(true);
      return;
    }

    let alive = true;

    // STATUS (atualiza se necessário)
    (async () => {
      if (DEV_FORCE_VIP) {
        setLoadingStatus(false);
        return;
      }
      // Se já tem dados válidos da primeira chamada, não faz segunda chamada
      if (status?.nextCharge || status?.lastPayment) {
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
      } catch {
        // silencioso
      } finally {
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
      } catch {
        // silencioso
      } finally {
        if (alive) setLoadingSettings(false);
      }
    })();

    // FUNCIONALIDADES DO USUÁRIO
    (async () => {
      await loadUserFeatures();
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

  async function fetchFeedbacks() {
    setLoadingFeedbacks(true);

    try {
      // 1) VIP + PIN => consulta segura (POST)
      if ((vipEnabled && (vipPin || DEV_FORCE_VIP))) {
        try {
          const secure = await postJSON<{ ok: boolean; items: Feedback[] }>(
            "/.netlify/functions/client-api",
            {
              action: "list_feedbacks_secure",
              site: user!.siteSlug!,
              pin: vipPin || "FORCED",
              page: 1,
              pageSize: 50,
            },
            CARDS_TIMEOUT_MS
          );

          if (alive && secure?.ok) {
            const ordered = (secure.items || []).slice().sort((a, b) => {
              const ta = new Date(a.timestamp as any).getTime();
              const tb = new Date(b.timestamp as any).getTime();
              return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
            });
            setFeedbacks(ordered.map(f => ({
              id: String(f.id ?? ""),
              name: String(f.name ?? ""),
              message: String((f as any).message ?? (f as any).comment ?? ""),
              timestamp: String((f as any).timestamp ?? (f as any).ts ?? ""),
              approved: String((f as any).approved ?? "").toLowerCase() === "true",
              email: (f as any).email || undefined,
              phone: (f as any).phone || undefined,
              sentiment: (f as any).sentiment || undefined,
            })));
          }
        } catch {
          // se falhar, cai no público abaixo
        }
      }

      // 2) Se ainda não carregou nada (ou não é VIP), busca PÚBLICO **via POST**
      if (alive && feedbacks.length === 0) {
        const pub = await postJSON<{ ok: boolean; items: Feedback[] }>(
          "/.netlify/functions/client-api",
          {
            action: "list_feedbacks",
            site: user!.siteSlug!,
            page: 1,
            pageSize: 50,
          },
          CARDS_TIMEOUT_MS
        ).catch(() => ({ ok: true, items: [] as Feedback[] }));

        if (alive && pub?.ok) {
          const ordered = (pub.items || []).slice().sort((a, b) => {
            const ta = new Date(a.timestamp as any).getTime();
            const tb = new Date(b.timestamp as any).getTime();
            return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
          });
          setFeedbacks(ordered.map(f => ({
            id: String(f.id ?? ""),
            name: String(f.name ?? ""),
            message: String((f as any).message ?? (f as any).comment ?? ""),
            timestamp: String((f as any).timestamp ?? (f as any).ts ?? ""),
            approved: String((f as any).approved ?? "").toLowerCase() === "true",
            // público nunca traz e-mail/telefone
          })));
        }
      }

      // 3) Enfileira análise de sentimento (VIP) em background
      if ((vipEnabled || DEV_FORCE_VIP) && alive) {
        const toAnalyze = feedbacks
          .filter((f) => !f.sentiment && f.message?.trim())
          .slice(0, 10);

        if (toAnalyze.length > 0) {
          try {
            const resp = await fetch("/.netlify/functions/ai-sentiment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                batch: toAnalyze.map(f => ({ id: f.id, feedback: f.message, clientName: f.name })),
              }),
            });
            if (resp.ok) {
              const data = await resp.json().catch(() => null);
              if (alive && data?.ok && Array.isArray(data.results)) {
                setFeedbacks(prev => prev.map(f => {
                  const a = data.results.find((r: any) => r.id === f.id && r.success && r.analysis);
                  return a ? { ...f, sentiment: a.analysis } : f;
                }));
              }
            }
          } catch {}
        }
      }
    } finally {
      if (alive) setLoadingFeedbacks(false);
    }
  }

  fetchFeedbacks();
  return () => { alive = false; };
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
        if (response.ok && response.structure) setSiteStructure(response.structure);
      } catch (e) {
        console.log("Erro ao carregar estrutura:", e);
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
    const res = await postJSON<{ ok: boolean }>(
      "/.netlify/functions/client-api",
      {
        action: "feedback_set_approval",
        site: user!.siteSlug!,   // importante enviar o slug correto
        id,
        approved,
        pin: vipPin || undefined // o GAS confere o PIN
      },
      CARDS_TIMEOUT_MS
    );
    if (!res.ok) throw new Error("Falha ao aprovar/reprovar");
    setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, approved } : f)));
  } catch (e: any) {
    alert(e?.message || "Não foi possível atualizar a aprovação.");
  }
}

  async function saveSiteStructure(updatedStructure?: any) {
    if (!canQuery || !canPerformVipAction(true)) return; // true = requer PIN para salvar
    const structureToSave = updatedStructure || siteStructure;
    if (!structureToSave) return;

    setSavingStructure(true);
    try {
      const response = await postJSON<{ ok: boolean }>(
        "/.netlify/functions/site-structure",
        {
          structure: structureToSave,
          pin: vipPin || "FORCED",
          site: user!.siteSlug!,
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

        {/* ERRO DE PLANO — só mostra se NÃO estiver VIP */}
        {planErr && !vipEnabled && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900">
            <div className="flex items-center justify-between">
              <span className="text-sm">{planErr}</span>
              <button
                onClick={retryPlan}
                className="rounded-lg bg-red-500 text-white px-3 py-1 text-xs hover:bg-red-600"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* RESUMO */}
        <section className="grid md:grid-cols-4 gap-4">
          <Card
            title="Status"
            value={loadingStatus ? "—" : status?.status ? status.status.toUpperCase() : "—"}
          />
          <Card title="Plano" value={planLabel} />
          <Card
            title="Próxima Cobrança"
            value={loadingStatus ? "—" : fmtDateTime(status?.nextCharge)}
          />
          <Card
            title="Último Pagamento"
            value={
              loadingStatus
                ? "—"
                : status?.lastPayment
                ? `${fmtDateTime(status.lastPayment.date)} • R$ ${
                    status.lastPayment.amount?.toFixed?.(2) ??
                    status.lastPayment.amount
                  }`
                : "—"
            }
          />
        </section>

        {/* ================== FUNCIONALIDADES VIP FUNCIONAIS ================== */}
        {vipEnabled && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">🚀 Funcionalidades Disponíveis</h2>
              <p className="text-white/60">Ferramentas prontas para uso</p>
            </div>

            {/* Tráfego do Site - Analytics Dashboard */}
            {isFeatureEnabled("traffic-analytics") && (
              <section className="space-y-6">
                <AnalyticsDashboard siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            {/* Agente WhatsApp */}
            {isFeatureEnabled("whatsapp-chatbot") && (
              <section className="space-y-6">
                <WhatsAppManager siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            {/* Google Meu Negócio */}
            {isFeatureEnabled("google-reviews") && (
              <section className="space-y-6">
                <GoogleReviews siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            {/* Captação de Leads */}
            {isFeatureEnabled("lead-capture") && (
              <section className="space-y-6">
                <LeadCapture siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
              </section>
            )}

            {/* Layout em Grid para Funcionalidades Básicas */}
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* CONFIGURAÇÕES GERAIS */}
                {isFeatureEnabled("color-palette") && (
                  <VipGate
                    enabled={vipEnabled}
                    checking={checkingPlan && !DEV_FORCE_VIP}
                    teaser="Configure aparência, tema e PIN VIP"
                  >
                    <section className="rounded-2xl border border-white/10 bg-white text-slate-900 p-6 space-y-4">
                      <h2 className="text-lg font-semibold">Configurações Gerais</h2>

                      <div className="grid md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.showBrand ?? true}
                            onChange={(e) => saveSettings({ showBrand: e.target.checked })}
                            className="rounded"
                            data-testid="checkbox-show-brand"
                          />
                          <span className="text-sm">Mostrar marca no rodapé</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.showPhone ?? false}
                            onChange={(e) => saveSettings({ showPhone: e.target.checked })}
                            className="rounded"
                            data-testid="checkbox-show-phone"
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
                            data-testid="input-whatsapp-number"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">PIN VIP</label>
                        <input
                          type="password"
                          value={vipPin}
                          onChange={(e) => setVipPin(e.target.value)}
                          placeholder="Digite seu PIN para acessar recursos VIP"
                          className="w-full px-3 py-2 border rounded-lg"
                          data-testid="input-vip-pin"
                        />
                        <div className="text-xs text-slate-500 mt-1">
                          Use seu PIN para acessar todas as funcionalidades do painel.
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Paleta de cores</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => saveSettings({ colorScheme: "azul" })}
                            className={`flex items-center gap-2 p-2 rounded text-xs ${
                              settings.colorScheme === "azul" ? "bg-blue-100 text-blue-800" : "bg-slate-100"
                            }`}
                            data-testid="button-color-azul"
                          >
                            <div className="flex gap-1">
                              <div className="w-4 h-4 rounded bg-blue-500"></div>
                              <div className="w-4 h-4 rounded bg-blue-600"></div>
                              <div className="w-4 h-4 rounded bg-blue-700"></div>
                            </div>
                            Azul Futurista
                          </button>

                          <button
                            onClick={() => saveSettings({ colorScheme: "roxo" })}
                            className={`flex items-center gap-2 p-2 rounded text-xs ${
                              settings.colorScheme === "roxo" ? "bg-purple-100 text-purple-800" : "bg-slate-100"
                            }`}
                            data-testid="button-color-roxo"
                          >
                            <div className="flex gap-1">
                              <div className="w-4 h-4 rounded bg-purple-500"></div>
                              <div className="w-4 h-4 rounded bg-purple-600"></div>
                              <div className="w-4 h-4 rounded bg-purple-700"></div>
                            </div>
                            Roxo Premium
                          </button>

                          <button
                            onClick={() => saveSettings({ colorScheme: "verde" })}
                            className={`flex items-center gap-2 p-2 rounded text-xs ${
                              settings.colorScheme === "verde" ? "bg-teal-100 text-teal-800" : "bg-slate-100"
                            }`}
                            data-testid="button-color-verde"
                          >
                            <div className="flex gap-1">
                              <div className="w-4 h-4 rounded bg-teal-500"></div>
                              <div className="w-4 h-4 rounded bg-teal-600"></div>
                              <div className="w-4 h-4 rounded bg-teal-700"></div>
                            </div>
                            Verde Tech
                          </button>

                          <button
                            onClick={() => saveSettings({ colorScheme: "laranja" })}
                            className={`flex items-center gap-2 p-2 rounded text-xs ${
                              settings.colorScheme === "laranja" ? "bg-orange-100 text-orange-800" : "bg-slate-100"
                            }`}
                            data-testid="button-color-laranja"
                          >
                            <div className="flex gap-1">
                              <div className="w-4 h-4 rounded bg-orange-500"></div>
                              <div className="w-4 h-4 rounded bg-orange-600"></div>
                              <div className="w-4 h-4 rounded bg-orange-700"></div>
                            </div>
                            Laranja Energia
                          </button>
                        </div>
                      </div>

                      {saving && (
                        <div className="flex items-center gap-2 text-blue-600 text-sm">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          Salvando configurações...
                        </div>
                      )}
                    </section>
                  </VipGate>
                )}

                {/* GERENCIADOR DE MÍDIAS */}
                <VipGate
                  enabled={vipEnabled}
                  checking={loadingAssets && !DEV_FORCE_VIP}
                  teaser="Personalize imagens, vídeos e recursos visuais"
                >
                  <section className="rounded-2xl border border-white/10 bg-white text-slate-900 p-6 space-y-4">
                    <h2 className="text-lg font-semibold">Gerenciar Mídias</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {slots.map((slot) => (
                        <MediaSlot key={slot.key} slot={slot} onUpload={handleUpload} />
                      ))}
                    </div>
                  </section>
                </VipGate>
              </div>

              <div className="space-y-6">
                {/* FEEDBACKS */}
                {isFeatureEnabled("feedback-management") && (
                  <section className="rounded-2xl border border-white/10 bg-slate-900 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-white">Feedbacks Recentes</h2>
                      <span className="text-xs text-white/60">
                        {canPerformVipAction(true)
                          ? "Todos os feedbacks (com PIN)"
                          : vipEnabled 
                          ? "Feedbacks básicos (VIP)"
                          : "Apenas aprovados"}
                      </span>
                    </div>
                    <div className="text-xs text-white/60">
                      E-mail e telefone ficam **somente aqui** (não são publicados).
                    </div>

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
                                  {f.sentiment && (
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        f.sentiment.rating >= 4
                                          ? "bg-emerald-500/20 text-emerald-300"
                                          : f.sentiment.rating >= 3
                                          ? "bg-yellow-500/20 text-yellow-300"
                                          : "bg-red-500/20 text-red-300"
                                      }`}
                                    >
                                      {f.sentiment.emotion} ({f.sentiment.rating}/5)
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-white mt-1 break-words">{f.message}</p>
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

                              {(vipEnabled && isFeatureEnabled("feedback-management")) && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => setFeedbackApproval(f.id, true)}
                                    className={`px-2 py-1 text-xs rounded ${
                                      f.approved
                                        ? "bg-emerald-600 text-white"
                                        : "bg-white/10 text-white/70 hover:bg-emerald-600"
                                    }`}
                                    data-testid={`button-approve-feedback-${f.id}`}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setFeedbackApproval(f.id, false)}
                                    className={`px-2 py-1 text-xs rounded ${
                                      !f.approved
                                        ? "bg-red-600 text-white"
                                        : "bg-white/10 text-white/70 hover:bg-red-600"
                                    }`}
                                    data-testid={`button-reject-feedback-${f.id}`}
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
                )}
              </div>
            </div>
          </>
        )}

        {/* ================== FUNCIONALIDADES EM DESENVOLVIMENTO ================== */}
        {vipEnabled && !isDevUser && (
          <>
            <div className="mt-12 mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">🔧 Em Desenvolvimento</h2>
              <p className="text-white/60">Funcionalidades que serão liberadas em breve</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Business Insights */}
              <ComingSoonCard
                title="Business Insights"
                description="Análises inteligentes do seu negócio com IA"
                icon={<span>📊</span>}
              />

              {/* Lead Scoring */}
              <ComingSoonCard
                title="Lead Scoring IA"
                description="Classificação automática e priorização de leads"
                icon={<span>🎯</span>}
              />

              {/* SEO Automático */}
              <ComingSoonCard
                title="SEO Automático"
                description="Otimização automática para mecanismos de busca"
                icon={<span>🚀</span>}
              />

              {/* AI Copywriter */}
              <ComingSoonCard
                title="IA Copywriter"
                description="Geração automática de textos e conteúdo"
                icon={<span>✍️</span>}
              />

              {/* Multi-idiomas */}
              <ComingSoonCard
                title="Multi-idiomas"
                description="Traduza seu site para múltiplos idiomas"
                icon={<span>🌍</span>}
              />

              {/* Sistema de Agendamento */}
              <ComingSoonCard
                title="Agendamento Online"
                description="Calendário online para agendamentos"
                icon={<span>📅</span>}
              />

              {/* E-commerce */}
              <ComingSoonCard
                title="Loja Virtual"
                description="Sistema completo de e-commerce"
                icon={<span>🛒</span>}
              />

              {/* Template Marketplace */}
              <ComingSoonCard
                title="Template Marketplace"
                description="Loja de templates premium"
                icon={<span>🎨</span>}
              />

              {/* Logs de Auditoria */}
              <ComingSoonCard
                title="Logs de Auditoria"
                description="Monitoramento e segurança avançada"
                icon={<span>🔒</span>}
              />

              {/* Chat AI */}
              <ComingSoonCard
                title="Chat IA"
                description="Assistente inteligente para suporte"
                icon={<span>🤖</span>}
              />
            </div>
          </>
        )}

        {/* ================== FUNCIONALIDADES COMPLETAS PARA DEV ================== */}
        {isDevUser && (
          <>
            {/* Business Insights - DEV */}
            {siteStructure && (
              <section className="space-y-6">
                <BusinessInsights
                  siteSlug={user.siteSlug || ""}
                  businessType={siteStructure?.category || "geral"}
                  businessName={user?.siteSlug || "seu negócio"}
                  vipPin={vipPin || "FORCED"}
                  analytics={{
                    totalVisits: 1847,
                    conversionRate: 4.8,
                    bounceRate: 32.8,
                    avgSessionDuration: "2:22",
                    topPages: [
                      { page: "/", visits: 776 },
                      { page: "/servicos", visits: 480 },
                      { page: "/contato", visits: 332 },
                      { page: "/sobre", visits: 185 },
                      { page: "/galeria", visits: 74 },
                    ],
                    deviceTypes: [
                      { name: "Mobile", value: 72 },
                      { name: "Desktop", value: 23 },
                      { name: "Tablet", value: 5 },
                    ],
                  }}
                  feedback={{
                    avgRating: 4.3,
                    recentFeedbacks: [
                      { rating: 5, comment: "Excelente atendimento! Superou minhas expectativas.", sentiment: "positive" },
                      { rating: 4, comment: "Muito bom serviço, recomendo!", sentiment: "positive" },
                      { rating: 5, comment: "Profissionais competentes e pontuais.", sentiment: "positive" },
                    ],
                  }}
                />
              </section>
            )}

            {/* Lead Scoring - DEV */}
            <section className="space-y-6">
              <LeadScoring siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* SEO Optimizer - DEV */}
            <section className="space-y-6">
              <SEOOptimizer
                siteSlug={user.siteSlug || ""}
                vipPin={vipPin || "FORCED"}
                businessData={{
                  name: user.siteSlug || "seu negócio",
                  type: siteStructure?.category || "negócio",
                  location: "Brasil",
                  description: siteStructure?.description || "",
                }}
              />
            </section>

            {/* AI Copywriter - DEV */}
            <section className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white text-slate-900 p-6">
                <AICopywriter
                  businessName={user.siteSlug || "seu negócio"}
                  businessType={siteStructure?.category || "negócio"}
                  businessDescription={siteStructure?.description || ""}
                />
              </div>
            </section>

            {/* Multi-Language Manager - DEV */}
            <section className="space-y-6">
              <MultiLanguageManager siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* Appointment Scheduling - DEV */}
            <section className="space-y-6">
              <AppointmentScheduling siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* E-commerce Dashboard - DEV */}
            <section className="space-y-6">
              <EcommerceDashboard siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* Template Marketplace - DEV */}
            <section className="space-y-6">
              <TemplateMarketplace siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* Audit Logs - DEV */}
            <section className="space-y-6">
              <AuditLogs siteSlug={user.siteSlug || ""} vipPin={vipPin || "FORCED"} />
            </section>

            {/* Feature Manager - DEV */}
            <section className="space-y-6">
              <FeatureManager
                siteSlug={user.siteSlug || ""}
                vipPin={vipPin || "FORCED"}
                userPlan={userPlan}
              />
            </section>
          </>
        )}

      {/* Botão flutuante do Chat AI - apenas para VIP */}
      {vipEnabled && (
        <button
          onClick={() => setShowAIChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center z-40"
          title="Chat de Suporte Inteligente"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
              clipRule="evenodd"
            />
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

      {/* Botão flutuante do Chat AI - apenas para VIP */}
      {vipEnabled && (
        <button
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
