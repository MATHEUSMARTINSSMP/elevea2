import React, { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, identifyUser, resetUser, analytics, useAnalytics } from '@/lib/analytics';
import { useSession } from '@/hooks/useSession';

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

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { user } = useSession();
  const location = useLocation();
  const analyticsHook = useAnalytics();

  // Inicializar analytics quando o provider monta
  useEffect(() => {
    initAnalytics();
  }, []);

  // Identificar/resetar usuário baseado na sessão  
  useEffect(() => {
    if (user) {
      // Por padrão sem consentimento de PII
      identifyUser({
        id: user.email, // usar email como ID
        email: user.email,
        role: user.role,
        siteSlug: user.siteSlug,
        plan: user.plan || 'free',
      }, false); // hasConsent = false por padrão

      // Track login
      analytics.featureUsed('login', {
        role: user.role,
        site_slug: user.siteSlug,
      });
    } else {
      resetUser();
    }
  }, [user]);

  // Rastrear mudanças de rota usando useLocation (mais limpo)
  useEffect(() => {
    const path = location.pathname;
    let pageName = 'unknown';

    // Mapear rotas para nomes amigáveis
    if (path === '/') {
      pageName = 'home';
    } else if (path.includes('/client')) {
      pageName = 'client_dashboard';
    } else if (path.includes('/admin')) {
      pageName = 'admin_dashboard';
    } else if (path.includes('/login')) {
      pageName = 'login';
    }

    analyticsHook.trackPage(pageName, {
      path,
      user_role: user?.role,
      site_slug: user?.siteSlug,
    });
  }, [location, user, analyticsHook]);

  const contextValue: AnalyticsContextType = {
    trackEvent: analyticsHook.trackEvent,
    trackPage: analyticsHook.trackPage,
    setUserProperty: analyticsHook.setUserProperty,
    analytics,
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// Hook para usar analytics em componentes
export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext deve ser usado dentro de AnalyticsProvider');
  }
  return context;
}

// Componente para rastrear interações específicas
interface TrackingComponentProps {
  event: string;
  properties?: Record<string, any>;
  children: React.ReactElement;
}

export function TrackingComponent({ event, properties, children }: TrackingComponentProps) {
  const { trackEvent } = useAnalyticsContext();

  const handleClick = () => {
    trackEvent(event, properties);
  };

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      handleClick();
      children.props.onClick?.(e);
    },
  });
}

// Hook para rastrear performance de componentes
export function useComponentTracking(componentName: string) {
  const { trackEvent } = useAnalyticsContext();

  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;
      trackEvent('component_render_time', {
        component: componentName,
        render_time: renderTime,
      });
    };
  }, [componentName, trackEvent]);

  const trackComponentEvent = (event: string, properties?: Record<string, any>) => {
    trackEvent(`${componentName}_${event}`, properties);
  };

  return { trackComponentEvent };
}

// Hook para rastrear formulários
export function useFormTracking(formName: string) {
  const { trackEvent } = useAnalyticsContext();

  const trackFormStart = () => {
    trackEvent('form_started', { form_name: formName });
  };

  const trackFormSubmit = (success: boolean, errors?: string[]) => {
    trackEvent('form_submitted', {
      form_name: formName,
      success,
      errors: errors?.join(', '),
    });
  };

  const trackFieldInteraction = (fieldName: string, action: 'focus' | 'blur' | 'change') => {
    trackEvent('form_field_interaction', {
      form_name: formName,
      field_name: fieldName,
      action,
    });
  };

  return {
    trackFormStart,
    trackFormSubmit,
    trackFieldInteraction,
  };
}

export default AnalyticsProvider;