// src/routes/index.tsx
import React, { lazy } from "react";
import { useRoutes, Navigate } from "react-router-dom";

// públicas
const HomePage        = lazy(() => import("@/pages/Index"));
const LoginPage       = lazy(() => import("@/pages/auth/Login"));
const ObrigadoPage    = lazy(() => import("@/pages/obrigado/index"));
const ResetPage       = lazy(() => import("@/pages/reset/index"));
const NotFoundPage    = lazy(() => import("@/pages/NotFound"));

// logadas
const ClientDashboard = lazy(() => import("@/pages/client/Dashboard"));
const AdminDashboard  = lazy(() => import("@/pages/admin/Dashboard"));

export default function Routes() {
  return useRoutes([
    // públicas
    { path: "/", element: <HomePage /> },
    { path: "/login", element: <LoginPage /> },
    { path: "/obrigado", element: <ObrigadoPage /> },
    { path: "/reset/*", element: <ResetPage /> },

    // logadas
    { path: "/client/*", element: <ClientDashboard /> },
    { path: "/admin/*", element: <AdminDashboard /> },

    // 404
    { path: "/404", element: <NotFoundPage /> },
    { path: "*", element: <Navigate to="/404" replace /> },
  ]);
}
