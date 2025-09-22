// src/App.tsx
import React, { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import SentryProvider from "@/components/SentryProvider";
import PWAHandler from "@/components/PWAHandler";              // se existir no seu projeto
import AnalyticsProvider from "@/components/AnalyticsProvider"; // ESTE usa useLocation() internamente
import Routes from "@/routes";                                  // seu componente de rotas
import { WaitSession } from "@/routes/guards";                  // se você usa um guard global

// (Opcional) fallback visual elegante para rotas lazy
function Fallback() {
  return (
    <div style={{
      position: "fixed", inset: 0, display: "grid", placeItems: "center",
      fontFamily: "system-ui, sans-serif", opacity: 0.8
    }}>
      Carregando…
    </div>
  );
}

export default function App() {
  return (
    <SentryProvider>
      {/* PWA não depende do Router */}
      <PWAHandler>
        {/* O Router precisa vir ANTES do AnalyticsProvider,
            pois o Analytics usa useLocation() */}
        <BrowserRouter>
          {/* Agora o Analytics tem contexto de Router */}
          <AnalyticsProvider>
            {/* Se você tem sessão/guards globais, podem ficar aqui dentro */}
            <WaitSession>
              <Suspense fallback={<Fallback />}>
                <Routes />
              </Suspense>
            </WaitSession>
          </AnalyticsProvider>
        </BrowserRouter>
      </PWAHandler>
    </SentryProvider>
  );
}
