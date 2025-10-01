// src/main.tsx
// Debug (se quiser manter)…

// 👇 IMPORTANTE: CSS global uma única vez
import "./index.css";

import React, { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import SentryProvider from "./components/SentryProvider";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root não encontrado");

createRoot(rootEl).render(
  <StrictMode>
    <SentryProvider>
      <Suspense fallback={<div style={{position:"fixed",inset:0,display:"grid",placeItems:"center"}}>Carregando…</div>}>
        <App />
      </Suspense>
    </SentryProvider>
  </StrictMode>
);
