// src/routes/index.tsx
import React, { lazy } from "react";
import { useRoutes, Navigate } from "react-router-dom";
import SiteLayout from "@/layouts/SiteLayout";

const HomePage        = lazy(() => import("@/pages/Index"));
const LoginPage       = lazy(() => import("@/pages/auth/Login"));
const ClientDashboard = lazy(() => import("@/pages/client/Dashboard"));
const AdminDashboard  = lazy(() => import("@/pages/admin/Dashboard"));
const ObrigadoPage    = lazy(() => import("@/pages/obrigado/index"));
const ResetPage       = lazy(() => import("@/pages/reset/index"));
const NotFoundPage    = lazy(() => import("@/pages/NotFound"));

export default function Routes() {
  const element = useRoutes([
    {
      path: "/",
      element: <SiteLayout />, // <- layout raiz
      children: [
        { index: true, element: <HomePage /> },
        { path: "login", element: <LoginPage /> },
        { path: "client/*", element: <ClientDashboard /> },
        { path: "admin/*",  element: <AdminDashboard /> },
        { path: "obrigado", element: <ObrigadoPage /> },
        { path: "reset/*",  element: <ResetPage /> },
        { path: "404", element: <NotFoundPage /> },
        { path: "*", element: <Navigate to="/404" replace /> },
      ],
    },
  ]);
  return element;
}
