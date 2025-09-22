// src/components/SentryProvider.tsx
import React, { useEffect } from "react";

/**
 * Provider mínimo que inicializa Sentry uma única vez, via import dinâmico.
 * - Não importamos sentry.ts estaticamente em nenhum outro lugar.
 * - Se der qualquer erro aqui, só loga no console.
 */
export default function SentryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      try {
        const mod = await import("../lib/sentry");
        mod.setupSentry?.();
      } catch (err) {
        console.error("[SentryProvider] falha ao inicializar Sentry:", err);
      }
    })();
  }, []);

  return <>{children}</>;
}
