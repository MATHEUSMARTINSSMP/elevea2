// DEBUG GLOBAL — remover depois
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    console.error("[window.onerror]", e.error || e.message, e);
    const el = document.getElementById("boot-error");
    if (el) el.textContent = String(e.error?.message || e.message || "Erro ao iniciar");
  });
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    console.error("[unhandledrejection]", e.reason || e);
    const el = document.getElementById("boot-error");
    if (el) el.textContent = String(e.reason?.message || e.reason || "Promise rejeitada no boot");
  });
  console.log("[BOOT] main.tsx entrou");
}
// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import SentryProvider from "./components/SentryProvider";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SentryProvider>
      <App />
    </SentryProvider>
  </React.StrictMode>
);
