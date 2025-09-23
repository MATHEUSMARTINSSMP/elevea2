// src/routes/index.tsx
import React, { lazy } from "react";
import { useRoutes, Navigate } from "react-router-dom";

// Ajuste os caminhos dos pages conforme existem no seu repo
const IndexPage       = lazy(() => import("@/pages/Index"));
const LoginPage       = lazy(() => import("@/pages/Login"));
const ClientDashboard = lazy(() => import("@/pages/client/Dashboard"));
const AdminDashboard  = lazy(() => import("@/pages/admin/Dashboard"));

// Componente simples de fallback (pode trocar por uma página 404)
function NotFound() {
  return <Navigate to="/" replace />;
}

export default function Routes() {
  const element = useRoutes([
    { path: "/",       element: <IndexPage /> },
    { path: "/login",  element: <LoginPage /> },
    { path: "/client", element: <ClientDashboard /> },
    { path: "/admin",  element: <AdminDashboard /> },
    { path: "*",       element: <NotFound /> },
  ]);
  return element;
}
