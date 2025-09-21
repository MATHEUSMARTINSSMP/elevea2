import React from 'react';
import { SentryErrorBoundary, useSentryUser, trackUserAction } from '@/lib/sentry';
import { useSession } from '@/hooks/useSession';

interface SentryProviderProps {
  children: React.ReactNode;
}

export function SentryProvider({ children }: SentryProviderProps) {
  const { session } = useSession();

  // Configurar usuário no Sentry quando logado
  useSentryUser(session?.user || null);

  // Rastrear login/logout
  React.useEffect(() => {
    if (session?.user) {
      trackUserAction('user_logged_in', {
        userId: session.user.id,
        role: session.user.role,
      });
    } else {
      trackUserAction('user_logged_out');
    }
  }, [session]);

  return (
    <SentryErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Ops! Algo deu errado
                </h3>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              Encontramos um problema inesperado. Nossa equipe foi notificada e está trabalhando na correção.
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={resetError}
                className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Ir para início
              </button>
            </div>
            
            {import.meta.env.DEV && (
              <details className="mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  Detalhes do erro (desenvolvimento)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {error?.stack || error?.message || 'Erro desconhecido'}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    >
      {children}
    </SentryErrorBoundary>
  );
}

// Hook para rastrear ações críticas
export function useSentryTracking() {
  const trackCriticalAction = (action: string, data?: Record<string, any>) => {
    trackUserAction(action, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  };

  const trackError = (error: Error, context?: Record<string, any>) => {
    console.error('Erro capturado:', error);
    
    // Enviar para Sentry
    import('@/lib/sentry').then(({ trackError }) => {
      trackError(error, {
        timestamp: new Date().toISOString(),
        ...context,
      });
    });
  };

  return {
    trackCriticalAction,
    trackError,
  };
}

export default SentryProvider;