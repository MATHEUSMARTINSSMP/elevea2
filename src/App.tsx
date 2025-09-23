// src/App.tsx
import React, { Suspense, StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";

import SentryProvider from "@/components/SentryProvider";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import Routes from "@/routes";
import { WaitSession } from "@/routes/guards";

// Se você não tiver um PWAHandler, pode remover essas duas linhas:
import PWAHandler from "@/components/PWAHandler";

// Fallback simples para rotas/componentes lazy
function Fallback() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, sans-serif",
        opacity: 0.8,
      }}
    >
      Carregando…
    </div>
  );
}

export default function App() {
  return (
    <StrictMode>
      <SentryProvider>
        {/* PWA (se existir) não depende do Router */}
        <PWAHandler>
          {/* O Router precisa vir ANTES do AnalyticsProvider,
              pois o Analytics usa useLocation() */}
          <BrowserRouter>
            {/* Agora o Analytics tem contexto de Router */}
            <AnalyticsProvider>
              {/* Guards/sessão globais podem ficar aqui dentro */}
              <WaitSession>
                <Suspense fallback={<Fallback />}>
                  <Routes />
                </Suspense>
              </WaitSession>
            </AnalyticsProvider>
          </BrowserRouter>
        </PWAHandler>
      </SentryProvider>
    </StrictMode>
  );
}
