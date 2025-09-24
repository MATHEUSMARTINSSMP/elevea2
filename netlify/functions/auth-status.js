// netlify/functions/auth-status.ts
import type { Handler } from "@netlify/functions";

// ====== CONFIG ======
const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL ||
  ""; // <- precisa apontar para o /exec do seu GAS

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
} as const;

const SIGN_SECRET = process.env.ADMIN_DASH_TOKEN || process.env.ADMIN_TOKEN || "";

// ====== UTILS ======
function ensureExecUrl(u: string) {
  return u && u.includes("/exec") ? u : (u ? u.replace(/\/+$/, "") + "/exec" : "");
}
const b64url = (buf: ArrayBuffer) =>
  Buffer.from(new Uint8Array(buf)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const b64urlToJson = (s: string) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json);
};
async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SIGN_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(mac);
}
function timingSafeEqual(a: string, b: string) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  let r = 0;
  for (let i = 0; i < A.length; i++) r |= A[i] ^ B[i];
  return r === 0;
}
function readCookie(header: string | null) {
  const out: Record<string, string> = {};
  (header || "").split(/;\s*/).filter(Boolean).forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i)] = p.slice(i + 1);
  });
  return out;
}
async function postToGas(body: any) {
  const url = ensureExecUrl(GAS_BASE);
  if (!url) return { ok: false, status: 500, data: { error: "missing_gas_url" } };

  try {
    const resp = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const text = await resp.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { ok: resp.ok && data?.ok !== false, status: resp.status, data };
  } catch (e: any) {
    return { ok: false, status: 500, data: { error: String(e?.message || e) } };
  }
}

// ====== HANDLER ======
export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

    // 1) Autenticação por cookie
    const cookie = readCookie(event.headers.cookie || "");
    const token = cookie["elevea_sess"] || "";
    if (!token) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ ok: false, error: "no_session" }) };
    }
    if (!SIGN_SECRET) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_sign_secret" }) };
    }

    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ ok: false, error: "bad_token" }) };
    }
    const expected = await hmac(payloadB64);
    if (!timingSafeEqual(expected, sig)) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ ok: false, error: "invalid_signature" }) };
    }
    let claims: any = {};
    try { claims = b64urlToJson(payloadB64); } catch { /* ignore */ }
    if (!claims?.email) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ ok: false, error: "invalid_claims" }) };
    }
    if (claims?.exp && Date.now() > Number(claims.exp)) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ ok: false, error: "session_expired" }) };
    }

    // 2) Descobre o siteSlug
    const qs = event.queryStringParameters || {};
    const siteSlug = String(qs.site || qs.siteSlug || claims.siteSlug || "").trim();
    if (!siteSlug) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_site_slug" }) };
    }

    // 3) Chama o GAS
    const r = await postToGas({ type: "client_billing", email: String(claims.email).toLowerCase(), siteSlug });
    // Nunca 502: sempre JSON
    return {
      statusCode: r.ok ? 200 : 502,
      headers: CORS,
      body: JSON.stringify({ ok: r.ok, status: r.status, siteSlug, result: r.data }),
    };
  } catch (e: any) {
    // Também nunca 502 por exceção sem tratamento
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};
