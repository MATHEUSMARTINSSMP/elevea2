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
