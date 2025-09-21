import posthog from 'posthog-js';

// Configuração do Posthog
export function initAnalytics() {
  const isDev = import.meta.env.DEV;
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

  // Em desenvolvimento, só habilita se API key fornecida
  if (isDev && !apiKey) {
    console.log('📊 Analytics: Modo desenvolvimento - tracking desabilitado (configure VITE_POSTHOG_KEY para habilitar)');
    return;
  }

  // Em produção, avisa se não configurado
  if (!isDev && !apiKey) {
    console.warn('⚠️ VITE_POSTHOG_KEY não configurado em produção - analytics desabilitado');
    return;
  }

  try {
    posthog.init(apiKey, {
      api_host: host,
      
      // Privacy settings - GDPR/CCPA compliance
      respect_dnt: true,
      opt_out_capturing_by_default: true, // Requer opt-in explícito
      
      // Session recording desabilitado por padrão (privacidade)
      disable_session_recording: true,
      
      // Masking para privacidade quando recording habilitado
      session_recording: {
        mask_all_text: true,
        mask_all_inputs: true,
        block_class: 'ph-no-capture',
      },
      
      // Capture settings
      capture_pageview: false, // Desabilitado para evitar duplicação
      capture_pageleave: true,
      
      // Performance
      loaded: () => {
        console.log('✅ Analytics inicializado (opt-out por padrão)');
      },
      
      // Cross domain tracking
      cross_subdomain_cookie: false,
      
      // Development vs Production
      debug: isDev,
      
      // Autocapture config
      autocapture: {
        dom_event_allowlist: ['click', 'submit', 'change'],
        url_allowlist: [window.location.origin],
        element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea'],
      },
    });

    // Configurações adicionais
    if (!isDev) {
      // Em produção, configura feature flags
      posthog.onFeatureFlags(() => {
        // Feature flags carregadas
      });
    }

  } catch (error) {
    console.warn('⚠️ Erro ao inicializar analytics:', error);
  }
}

// Identificar usuário após login (sem PII por padrão)
export function identifyUser(user: {
  id: string;
  email?: string;
  role?: string;
  siteSlug?: string;
  plan?: string;
}, hasConsent: boolean = false) {
  if (!posthog.__loaded) return;

  // Propriedades básicas sem PII
  const baseProps = {
    role: user.role,
    site_slug: user.siteSlug,
    plan: user.plan,
  };

  // Adiciona email apenas com consentimento explícito
  const props = hasConsent ? { ...baseProps, email: user.email } : baseProps;

  posthog.identify(user.id, props);
  
  // Set first_seen apenas uma vez
  posthog.setPersonPropertiesOnce({
    first_seen: new Date().toISOString(),
  });
}

// Reset ao fazer logout
export function resetUser() {
  posthog.reset();
}

// Tracking de eventos específicos do negócio
export const analytics = {
  // Dashboard events
  dashboardViewed: (role: string) => {
    posthog.capture('dashboard_viewed', { role });
  },

  // Site editing events
  siteEdited: (section: string, action: string) => {
    posthog.capture('site_edited', { section, action });
  },

  contentChanged: (type: 'text' | 'image' | 'color' | 'layout', details?: any) => {
    posthog.capture('content_changed', { type, ...details });
  },

  // Business events
  leadGenerated: (source: string, details?: any) => {
    posthog.capture('lead_generated', { source, ...details });
  },

  planUpgraded: (fromPlan: string, toPlan: string) => {
    posthog.capture('plan_upgraded', { from_plan: fromPlan, to_plan: toPlan });
  },

  // User journey
  onboardingStarted: () => {
    posthog.capture('onboarding_started');
  },

  onboardingCompleted: (steps_completed: number, time_taken: number) => {
    posthog.capture('onboarding_completed', { steps_completed, time_taken });
  },

  // Feature usage
  featureUsed: (feature: string, details?: any) => {
    posthog.capture('feature_used', { feature, ...details });
  },

  // Errors and issues
  errorEncountered: (error_type: string, error_message: string) => {
    posthog.capture('error_encountered', { error_type, error_message });
  },

  // Performance tracking
  pageLoadTime: (page: string, load_time: number) => {
    posthog.capture('page_load_time', { page, load_time });
  },

  // Conversion tracking
  ctaClicked: (cta_type: string, location: string) => {
    posthog.capture('cta_clicked', { cta_type, location });
  },

  formSubmitted: (form_type: string, success: boolean) => {
    posthog.capture('form_submitted', { form_type, success });
  },

  // A/B Testing helpers
  getFeatureFlag: (flag: string) => {
    return posthog.isFeatureEnabled(flag);
  },

  // Custom properties for segmentation
  setUserProperties: (properties: Record<string, any>) => {
    posthog.setPersonProperties(properties);
  },

  // Group analytics (por site/agência)
  groupIdentify: (groupType: 'site' | 'agency', groupKey: string, properties: Record<string, any>) => {
    posthog.group(groupType, groupKey, properties);
  },
};

// Hook React para analytics
export function useAnalytics() {
  const trackEvent = (event: string, properties?: Record<string, any>) => {
    posthog.capture(event, properties);
  };

  const trackPage = (pageName: string, properties?: Record<string, any>) => {
    posthog.capture('$pageview', { 
      $current_url: window.location.href,
      page_name: pageName,
      ...properties 
    });
  };

  const setUserProperty = (key: string, value: any) => {
    posthog.setPersonProperties({ [key]: value });
  };

  return {
    trackEvent,
    trackPage,
    setUserProperty,
    analytics,
  };
}

// Utilitário para medir performance
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start;
      analytics.pageLoadTime(name, duration);
    });
  } else {
    const duration = performance.now() - start;
    analytics.pageLoadTime(name, duration);
    return result;
  }
}

export default posthog;