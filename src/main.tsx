// src/main.tsx
// Debug (se quiser manter)…

// 👇 IMPORTANTE: CSS global uma única vez
import "./index.css";

import React, { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import BootProbe from "./BootProbe";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root não encontrado");

// Reporter simples: escreve erros de boot no <pre id="boot-error">
const bootErrorEl = document.getElementById("boot-error") as HTMLPreElement | null;
function reportBootError(message: string) {
  if (bootErrorEl) {
    bootErrorEl.textContent = message;
  }
}

window.addEventListener("error", (e) => {
  const msg = e.error?.stack || e.message || String(e.error ?? "Erro desconhecido");
  reportBootError(`[window.error]\n${msg}`);
});

window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
  const reason = (e.reason && (e.reason.stack || e.reason.message)) || String(e.reason ?? "(sem motivo)");
  reportBootError(`[unhandledrejection]\n${reason}`);
});

createRoot(rootEl).render(
  <StrictMode>
    <BootProbe />
    <Suspense fallback={<div style={{position:"fixed",inset:0,display:"grid",placeItems:"center"}}>Carregando…</div>}>
      <App />
    </Suspense>
  </StrictMode>
);
