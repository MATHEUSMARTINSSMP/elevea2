// src/lib/sentry.ts
import * as Sentry from "@sentry/react";

/**
 * Inicializa o Sentry de forma segura (não quebra o boot se faltar ENV).
 * - Somente chama Sentry.init se houver DSN válido.
 * - Pode ser importado dinamicamente pelo SentryProvider.
 */
export function setupSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

  if (!dsn) {
    if (import.meta.env.DEV) {
      console.info("[Sentry] desativado: VITE_SENTRY_DSN ausente");
    }
    return; // não inicializa; segue a vida sem Sentry
  }

  try {
    Sentry.init({
      dsn,
      // Ajuste as rates conforme sua necessidade:
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.browserTracingIntegration(),
        // Comente se não usar replay:
        Sentry.replayIntegration(),
      ],
    });
    if (import.meta.env.DEV) console.info("[Sentry] inicializado");
  } catch (err) {
    // Nunca deixe o Sentry derrubar a aplicação
    console.error("[Sentry] falha ao inicializar:", err);
  }
}

export { Sentry };
