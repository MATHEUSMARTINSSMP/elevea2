// src/routes/index.tsx
import React, { lazy } from "react";
import { useRoutes, Navigate } from "react-router-dom";

// páginas (atenção às maiúsculas)
const HomePage        = lazy(() => import("@/pages/Index"));             // src/pages/Index.tsx
const LoginPage       = lazy(() => import("@/pages/auth/Login"));        // src/pages/auth/Login.tsx
const ClientDashboard = lazy(() => import("@/pages/client/Dashboard"));  // src/pages/client/Dashboard.tsx
const AdminDashboard  = lazy(() => import("@/pages/admin/Dashboard"));   // src/pages/admin/Dashboard.tsx
const ObrigadoPage    = lazy(() => import("@/pages/obrigado/index"));    // src/pages/obrigado/index.tsx
const ResetPage       = lazy(() => import("@/pages/reset/index"));       // src/pages/reset/index.tsx
const NotFoundPage    = lazy(() => import("@/pages/NotFound"));          // src/pages/NotFound.tsx

export default function Routes() {
  const element = useRoutes([
    { path: "/", element: <HomePage /> },
    { path: "/login", element: <LoginPage /> },

    // dashboards
    { path: "/client/*", element: <ClientDashboard /> },
    { path: "/admin/*",  element: <AdminDashboard /> },

    // utilitários
    { path: "/obrigado", element: <ObrigadoPage /> },
    { path: "/reset/*",  element: <ResetPage /> },

    // 404
    { path: "/404", element: <NotFoundPage /> },
    { path: "*", element: <Navigate to="/404" replace /> },
  ]);

  return element;
}
