import * as Sentry from "@sentry/react";

// Configuração básica do Sentry
export function initSentry() {
  const isDev = import.meta.env.DEV;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  // Em produção, DSN é obrigatório
  if (!isDev && !dsn) {
    console.warn('⚠️ VITE_SENTRY_DSN não configurado em produção - error tracking desabilitado');
    return;
  }
  
  // Em desenvolvimento, só habilita se DSN fornecido
  if (isDev && !dsn) {
    console.log('🚀 Sentry: Modo desenvolvimento - tracking desabilitado (configure VITE_SENTRY_DSN para habilitar)');
    return;
  }

  try {
    Sentry.init({
      dsn: dsn, // Remove placeholder - exige DSN real
      environment: isDev ? 'development' : 'production',
      tracesSampleRate: isDev ? 0.1 : 0.05, // Reduz sampling para produção
      autoSessionTracking: true,
      release: import.meta.env.VITE_APP_VERSION || undefined, // Remove fallback
      
      beforeSend(event) {
        // Filtrar erros comuns e inúteis
        if (event.exception) {
          const error = event.exception.values?.[0];
          const errorValue = error?.value || '';
          
          // Filtrar erros de extensões e ruído comum
          if (
            errorValue.includes('chrome-extension://') ||
            errorValue.includes('moz-extension://') ||
            errorValue.includes('safari-extension://') ||
            errorValue.includes('ResizeObserver loop limit exceeded') ||
            errorValue.includes('ChunkLoadError') ||
            errorValue.includes('NetworkError') ||
            errorValue.includes('Non-Error promise rejection')
          ) {
            return null;
          }
        }
        
        // Filtrar URLs sensíveis
        if (event.request?.url) {
          event.request.url = event.request.url.replace(/([?&])(token|key|password|secret)=[^&]*/gi, '$1$2=***');
        }
        
        return event;
      },
      
      // Ignorar URLs problemáticas  
      denyUrls: [
        /extensions\//i,
        /^chrome:\/\//i,
        /^moz-extension:\/\//i,
      ],
    });

    console.log('✅ Sentry inicializado');
  } catch (error) {
    console.warn('⚠️ Erro ao inicializar Sentry:', error);
  }
}

// Hook para usuário - sem PII sensível
export function useSentryUser(user: any) {
  React.useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        role: user.role,
        site_slug: user.siteSlug,
        // Email removido por privacidade - não é necessário para debugging
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);
}

// Error Boundary simplificado
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Funções de tracking
export const trackError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, { extra: context });
};

export const trackEvent = (event: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message: event,
    data,
    level: 'info',
  });
};

export const trackUserAction = (action: string, details?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message: `User: ${action}`,
    category: 'user',
    data: details,
    level: 'info',
  });
};

// Import React
import React from 'react';

export default Sentry;