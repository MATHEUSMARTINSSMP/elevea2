// src/components/AnalyticsProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";
import {
  initAnalytics,
  identifyUser,
  resetUser,
  analytics,
  useAnalytics,
} from "@/lib/analytics";
import { useSession } from "@/hooks/useSession";

interface AnalyticsContextType {
  trackEvent: (event: string, properties?: Record<string, any>) => void;
  trackPage: (pageName: string, properties?: Record<string, any>) => void;
  setUserProperty: (key: string, value: any) => void;
  analytics: typeof analytics;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider de Analytics à prova de falhas:
 * - Inicialização idempotente (não duplica no StrictMode/HMR).
 * - Nunca lança erro no render/boot (proteções com try/catch).
 * - Pageview de-duplicado por pathname+search.
 * - Respeita ausência de consentimento PII (hasConsent=false por padrão).
 * - Requer estar dentro de <BrowserRouter> (usa useLocation).
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { user } = useSession();
  const location = useLocation(); // <-- precisa do BrowserRouter acima
  const analyticsHook = useAnalytics();

  // Evita reinit (StrictMode/HMR)
  const initedRef = useRef(false);
  useEffect(() => {
    if (initedRef.current) return;
    try {
      initAnalytics();
      initedRef.current = true;
    } catch (err) {
      // Não derrubar a app por falha do provedor de analytics
      console.warn("[Analytics] falha ao inicializar:", err);
    }
  }, []);

  // Identificar / resetar usuário quando sessão muda
  useEffect(() => {
    try {
      if (user?.email) {
        identifyUser(
          {
            id: user.email, // ID estável (email)
            email: user.email,
            role: user.role ?? "guest",
            siteSlug: user.siteSlug,
            plan: user.plan || "free",
          },
          false // hasConsent = false (sem PII até obter consentimento explícito)
        );

        // Evento de login (featureUsed) — tolerante a falhas
        analytics.featureUsed?.("login", {
          role: user.role,
          site_slug: user.siteSlug,
        });
      } else {
        resetUser();
      }
    } catch (err) {
      console.warn("[Analytics] identify/reset falhou:", err);
    }
  }, [user]);

  // De-duplicar pageview e mapear nomes de páginas
  const lastPathRef = useRef<string | null>(null);
  useEffect(() => {
    try {
      const path = `${location.pathname}${location.search || ""}`;
      if (lastPathRef.current === path) return;
      lastPathRef.current = path;

      let pageName = "unknown";
      if (location.pathname === "/") pageName = "home";
      else if (location.pathname.startsWith("/client")) pageName = "client_dashboard";
      else if (location.pathname.startsWith("/admin")) pageName = "admin_dashboard";
      else if (location.pathname.startsWith("/login")) pageName = "login";

      analyticsHook?.trackPage?.(pageName, {
        path,
        user_role: user?.role,
        site_slug: user?.siteSlug,
      });
    } catch (err) {
      console.warn("[Analytics] trackPage falhou:", err);
    }
  }, [location.pathname, location.search, user, analyticsHook]);

  // Context value estável
  const contextValue: AnalyticsContextType = useMemo(
    () => ({
      trackEvent: (event, props) => {
        try {
          analyticsHook?.trackEvent?.(event, props);
        } catch (err) {
          console.warn("[Analytics] trackEvent falhou:", err);
        }
      },
      trackPage: (page, props) => {
        try {
          analyticsHook?.trackPage?.(page, props);
        } catch (err) {
          console.warn("[Analytics] trackPage falhou:", err);
        }
      },
      setUserProperty: (key, value) => {
        try {
          analyticsHook?.setUserProperty?.(key, value);
        } catch (err) {
          console.warn("[Analytics] setUserProperty falhou:", err);
        }
      },
      analytics, // acesso direto ao adapter para casos avançados
    }),
    [analyticsHook]
  );

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// Hook público — nunca derruba a app se usado fora por engano.
// (Mantém compatibilidade e evita crashes acidentais)
export function useAnalyticsContext(): AnalyticsContextType {
  const ctx = useContext(AnalyticsContext);
  if (ctx) return ctx;
  // NOOP seguro caso alguém use fora do provider por engano
  return {
    trackEvent: () => {},
    trackPage: () => {},
    setUserProperty: () => {},
    analytics,
  };
}

/** Componente para rastrear interações específicas (onClick) */
interface TrackingComponentProps {
  event: string;
  properties?: Record<string, any>;
  children: React.ReactElement;
}

export function TrackingComponent({
  event,
  properties,
  children,
}: TrackingComponentProps) {
  const { trackEvent } = useAnalyticsContext();

  const handleClick = (e: React.MouseEvent) => {
    try {
      trackEvent(event, properties);
    } finally {
      // Mantém o onClick original do filho
      children.props.onClick?.(e);
    }
  };

  return React.cloneElement(children, { onClick: handleClick });
}

/** Hook para rastrear performance de componentes (tempo de vida) */
export function useComponentTracking(componentName: string) {
  const { trackEvent } = useAnalyticsContext();

  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const renderTime = performance.now() - startTime;
      try {
        trackEvent("component_render_time", {
          component: componentName,
          render_time: renderTime,
        });
      } catch {
        /* no-op */
      }
    };
  }, [componentName, trackEvent]);

  const trackComponentEvent = (
    event: string,
    properties?: Record<string, any>
  ) => {
    try {
      trackEvent(`${componentName}_${event}`, properties);
    } catch {
      /* no-op */
    }
  };

  return { trackComponentEvent };
}

/** Hooks utilitários para formulários */
export function useFormTracking(formName: string) {
  const { trackEvent } = useAnalyticsContext();

  const trackFormStart = () => {
    try {
      trackEvent("form_started", { form_name: formName });
    } catch {
      /* no-op */
    }
  };

  const trackFormSubmit = (success: boolean, errors?: string[]) => {
    try {
      trackEvent("form_submitted", {
        form_name: formName,
        success,
        errors: errors?.join(", "),
      });
    } catch {
      /* no-op */
    }
  };

  const trackFieldInteraction = (
    fieldName: string,
    action: "focus" | "blur" | "change"
  ) => {
    try {
      trackEvent("form_field_interaction", {
        form_name: formName,
        field_name: fieldName,
        action,
      });
    } catch {
      /* no-op */
    }
  };

  return {
    trackFormStart,
    trackFormSubmit,
    trackFieldInteraction,
  };
}

export default AnalyticsProvider;
