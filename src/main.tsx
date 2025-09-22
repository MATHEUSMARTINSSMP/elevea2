// src/main.tsx

// ======================
// DEBUG GLOBAL — REMOVER DEPOIS
// Mostra qualquer erro de boot no console e no <pre id="boot-error"> do index.html
// ======================
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    // erro síncrono não-capturado
    console.error("[window.onerror]", e.error || e.message, e);
    const el = document.getElementById("boot-error");
    if (el) el.textContent = String(e.error?.message || e.message || "Erro ao iniciar");
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    // promise rejeitada sem catch (fetch/init/etc.)
    console.error("[unhandledrejection]", e.reason || e);
    const el = document.getElementById("boot-error");
    if (el) el.textContent = String(
      (e as any)?.reason?.message || (e as any)?.reason || "Promise rejeitada no boot"
    );
  });

  console.log("[BOOT] main.tsx entrou");
}

import React, { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import SentryProvider from "./components/SentryProvider";

// Pequeno “prova de vida” visual: se aparecer, o React montou.
// (Remova após depurar)
function BootProbe() {
  const style: React.CSSProperties = {
    position: "fixed",
    top: 8,
    right: 8,
    zIndex: 99999,
    padding: "6px 8px",
    border: "2px solid #2e7d32",
    background: "#e8f5e9",
    font: "12px monospace",
    borderRadius: 6,
  };
  return <div style={style}>Boot: OK</div>;
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  const el = document.getElementById("boot-error");
  if (el) el.textContent = "Elemento #root não encontrado no index.html";
  throw new Error("Elemento #root não encontrado");
}

createRoot(rootEl).render(
  <StrictMode>
    {/* Remover BootProbe quando terminar de depurar */}
    <BootProbe />
    <SentryProvider>
      {/* Evita “tela branca” se alguma rota/componente lazy falhar em carregar imediatamente */}
      <Suspense
        fallback={
          <div
            style={{
              position: "fixed",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontFamily: "system-ui, sans-serif",
              fontSize: 14,
              opacity: 0.8,
            }}
          >
            Carregando…
          </div>
        }
      >
        <App />
      </Suspense>
    </SentryProvider>
  </StrictMode>
);
