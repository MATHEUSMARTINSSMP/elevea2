// src/lib/api.ts

/**
 * Configuração de endpoints da API
 * - Preferência: usar variável de ambiente injetada pelo Vite (prefixo VITE_)
 * - Fallback: URL pública do GAS (Google Apps Script)
 */

export const APPS_ENDPOINT =
  import.meta.env.VITE_APPS_WEBAPP_URL ||
  import.meta.env.VITE_ELEVEA_GAS_URL ||
  "https://script.google.com/macros/s/AKfycbxPbvLefGLGZJXLBXeXYtSOWVl7gQwl3G0v1NTVDovBiPW5J_yTm_a-3v6nOXh5D6NNBQ/exec";

// Base padrão para todas as Netlify Functions
const FUNCTIONS_BASE = "/.netlify/functions";

/**
 * Função auxiliar para chamadas GET/POST em JSON
 */
export async function getJson<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${FUNCTIONS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} - ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json")
    ? res.json()
    : (res.text() as unknown as T);
}

/**
 * Exemplo de chamada de Function (login)
 * - Usa getJson para padronizar headers e parse
 */
export async function login(email: string, password: string) {
  return getJson("/auth-session", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
