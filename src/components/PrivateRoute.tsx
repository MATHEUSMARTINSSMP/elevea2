// src/components/PrivateRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/useSession";

type Props = {
  roles?: Array<"admin" | "client">;
  children: React.ReactNode;
};

export default function PrivateRoute({ roles, children }: Props) {
  const { user, ready } = useSession();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-3">
          <div className="flex space-x-2 justify-center">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <div className="text-gray-500 text-sm text-center">Verificando permissões...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    // logado porém papel errado → volta para raiz
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
