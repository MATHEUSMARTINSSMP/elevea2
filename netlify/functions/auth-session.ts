// netlify/functions/auth-session.ts
import type { Handler } from "@netlify/functions";

/** === Config / GAS base === */
const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL ||
  // Fallback para desenvolvimento local se não houver env vars
  (process.env.NODE_ENV === "development" ? "https://script.google.com/macros/s/PLACEHOLDER/exec" : "");

/** === CORS comum === */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
  "cache-control": "no-store",
} as const;

/** Normaliza URL do GAS (garante /exec) */
function ensureExecUrl(u: string) {
  return u && u.includes("/exec") ? u : (u ? u.replace(/\/+$/, "") + "/exec" : "");
}

/** Chama o GAS */
async function postToGas(body: any) {
  const url = ensureExecUrl(GAS_BASE);
  if (!url || url.includes("PLACEHOLDER")) {
    throw new Error("ELEVEA_GAS_URL environment variable not configured. Please set it in your Netlify dashboard.");
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let data: any = {};
  try { data = JSON.parse(text || "{}"); } catch { data = { ok: false, raw: text }; }

  return { ok: resp.ok && data?.ok !== false, status: resp.status, data };
}

/** === Assinatura/validação do cookie elevea_sess === */
const SIGN_SECRET = process.env.ADMIN_DASH_TOKEN || process.env.ADMIN_TOKEN || "";

// Log para debug em desenvolvimento (sem expor a secret)
if (!SIGN_SECRET && process.env.NODE_ENV === "development") {
  console.warn("⚠️  ADMIN_DASH_TOKEN not set - cookies will not be signed");
}

// base64-url encode
const b64url = (buf: ArrayBuffer) =>
  Buffer.from(new Uint8Array(buf)).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SIGN_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(mac);
}

function makeCookie(value: string, maxAgeSec = 60 * 60 * 24 * 7) {
  return [
    `elevea_sess=${value}`,
    `Path=/`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Strict`,
    `Max-Age=${maxAgeSec}`,
  ].join("; ");
}

/** Lê cookie bruto -> objeto */
function parseCookie(raw: string | undefined) {
  const out: Record<string,string> = {};
  (raw || "").split(/;\s*/).filter(Boolean).forEach(p => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i)] = p.slice(i + 1);
  });
  return out;
}

/** Verifica o token e retorna claims (ou null) */
async function readClaimsFromCookie(cookieHeader: string | undefined) {
  if (!SIGN_SECRET) return null;
  const cookies = parseCookie(cookieHeader);
  const token = cookies["elevea_sess"];
  if (!token || !token.includes(".")) return null;

  const [payload, sig] = token.split(".");
  const expected = await hmac(payload);
  if (expected !== sig) return null;

  try {
    const jsonStr = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const claims = JSON.parse(jsonStr);
    if (!claims?.exp || Date.now() > Number(claims.exp)) return null;
    return claims as { email:string; role:"admin"|"client"; siteSlug?:string; plan?:string; exp:number };
  } catch {
    return null;
  }
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS, body: "" };
    }

    const action = (event.queryStringParameters?.action || "").toLowerCase();
    if (!["login", "me", "logout"].includes(action)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_or_invalid_action" }) };
    }

    /** === LOGIN === */
    if (action === "login") {
      if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "method_not_allowed" }) };
      }
      const body = event.body ? JSON.parse(event.body) : {};
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "").trim();
      if (!email || !password) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_fields" }) };
      }

      // Usuário de desenvolvimento - bypass GAS
      if (email === "dev" && password === "dev1") {
        const user = { 
          email: "dev", 
          role: "client" as const, 
          siteSlug: "LOUNGERIEAMAPAGARDEN",
          plan: "dev"
        };

        if (!SIGN_SECRET) {
          return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user }) };
        }

        const payloadObj = {
          email: user.email,
          role: user.role,
          siteSlug: user.siteSlug,
          plan: user.plan,
          exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
        };
        const payload = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64")
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
        const sig = await hmac(payload);
        const token = `${payload}.${sig}`;

        const headers = { ...CORS, "set-cookie": makeCookie(token) };
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, user }) };
      }

      const r = await postToGas({ type: "user_login", email, password });
      if (!r.ok) {
        return { statusCode: 401, headers: CORS, body: JSON.stringify({ ok: false, error: r.data?.error || "invalid_credentials" }) };
      }

      // perfil
      const me = await postToGas({ type: "user_me", email });
      const user = me.data?.user || { email, role: "client" };

      if (!SIGN_SECRET) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user }) };
      }

      const payloadObj = {
        email: user.email,
        role: user.role,
        siteSlug: user.siteSlug || "",
        exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
      };
      const payload = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64")
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
      const sig = await hmac(payload);
      const token = `${payload}.${sig}`;

      const headers = { ...CORS, "set-cookie": makeCookie(token) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, user }) };
    }

    /** === ME (exige cookie válido; SEM fallback por email) === */
    if (action === "me") {
      const claims = await readClaimsFromCookie(event.headers?.cookie);
      if (!claims?.email) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false }) };
      }

      // Usuário dev - retorna dados localmente
      if (claims.email === "dev") {
        const user = {
          email: "dev",
          role: "client" as const,
          siteSlug: "LOUNGERIEAMAPAGARDEN", 
          plan: "dev"
        };
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user }) };
      }

      const r = await postToGas({ type: "user_me", email: claims.email });
      if (!r.ok) {
        return { statusCode: 404, headers: CORS, body: JSON.stringify({ ok: false, error: r.data?.error || "user_not_found" }) };
      }
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user: r.data.user }) };
    }

    /** === LOGOUT === */
    if (action === "logout") {
      const headers = {
        ...CORS,
        "set-cookie": "elevea_sess=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict",
      };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "invalid_action" }) };
  } catch (e: any) {
    const errorMsg = String(e?.message || e);
    console.error("Auth session error:", errorMsg);
    
    // Mensagem mais específica para problemas de configuração
    if (errorMsg.includes("ELEVEA_GAS_URL")) {
      return { 
        statusCode: 503, 
        headers: CORS, 
        body: JSON.stringify({ 
          ok: false, 
          error: "configuration_missing",
          message: "Environment variables not configured. Please set ELEVEA_GAS_URL in your Netlify dashboard.",
          details: "Go to Site Settings → Environment Variables and add your Google Apps Script URL"
        }) 
      };
    }
    
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: errorMsg }) };
  }
};

export default handler;
