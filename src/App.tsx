// src/App.tsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WaitSession, RequireAuth, RequireClient, RedirectIfAuthed } from "../routes/guards";
import PWAHandler from "@/components/PWAHandler";
import SentryProvider from "@/components/SentryProvider";
import AnalyticsProvider from "@/components/AnalyticsProvider";

// ✅ Páginas (atenção ao caminho/case do Login!)
const IndexPage       = lazy(() => import("../pages/Index"));              // home pública em "/"
const LoginPage       = lazy(() => import("../pages/auth/Login"));         // <-- caminho novo e correto
const ClientDashboard = lazy(() => import("../pages/client/Dashboard"));
const AdminDashboard  = lazy(() => import("../pages/admin/Dashboard"));

function Loader() {
  return (
    <div className="min-h-screen grid place-items-center bg-[#0B1220]">
      <div className="space-y-4 p-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg animate-pulse shadow-lg"></div>
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 w-24 bg-gray-800 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex space-x-1 justify-center">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SentryProvider>
      <AnalyticsProvider>
        <PWAHandler>
          <BrowserRouter>
            <WaitSession>
              <Suspense fallback={<Loader />}>
                <Routes>
                  {/* HOME PÚBLICA EM "/" */}
                  <Route path="/" element={<IndexPage />} />

                  {/* Login (se já estiver logado, manda para a área correta) */}
                  <Route
                    path="/login"
                    element={
                      <RedirectIfAuthed>
                        <LoginPage />
                      </RedirectIfAuthed>
                    }
                  />

                  {/* Área do cliente (protegida) */}
                  <Route
                    path="/client/dashboard"
                    element={
                      <RequireAuth>
                        <RequireClient>
                          <ClientDashboard />
                        </RequireClient>
                      </RequireAuth>
                    }
                  />

                  {/* Área do admin (protegida) */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <RequireAuth>
                        <AdminDashboard />
                      </RequireAuth>
                    }
                  />

                  {/* Qualquer coisa desconhecida → home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </WaitSession>
          </BrowserRouter>
        </PWAHandler>
      </AnalyticsProvider>
    </SentryProvider>
  );
}
