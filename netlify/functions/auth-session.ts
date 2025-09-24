// netlify/functions/auth-session.ts
import type { Handler } from "@netlify/functions";
import crypto from "crypto";

const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL ||
  "";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
} as const;

function ensureExecUrl(u: string) {
  return u && u.includes("/exec") ? u : (u ? u.replace(/\/+$/, "") + "/exec" : "");
}

async function postToGas(body: any) {
  const url = ensureExecUrl(GAS_BASE);
  if (!url) throw new Error("missing_gas_url");
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

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function signHmac(secret: string, payload: string) {
  return b64url(crypto.createHmac("sha256", secret).update(payload).digest());
}

function makeCookie(name: string, value: string, maxAgeSec = 60 * 60 * 12) { // 12h
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    `Max-Age=${maxAgeSec}`,
    "SameSite=Lax",
  ];
  return parts.join("; ");
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

    // LOGIN
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

      // autentica no GAS
      const r = await postToGas({ type: "user_login", email, password });
      if (!r.ok) {
        return { statusCode: 401, headers: CORS, body: JSON.stringify({ ok: false, error: r.data?.error || "invalid_credentials" }) };
      }

      // carrega "me"
      const me = await postToGas({ type: "user_me", email });
      const user = me?.data?.user || { email };
      const role: "admin" | "client" = (user?.role === "admin" ? "admin" : "client");
      const siteSlug = String(user?.siteSlug || "");

      // cria token assinado (payload.base64url + "." + assinatura)
      const exp = Date.now() + 1000 * 60 * 60 * 12; // 12h
      const payloadObj = { email, role, siteSlug, exp };
      const payload = b64url(JSON.stringify(payloadObj));
      const secret = process.env.ADMIN_DASH_TOKEN || process.env.ADMIN_TOKEN || "";
      if (!secret) {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_sign_secret" }) };
      }
      const sig = signHmac(secret, payload);
      const token = `${payload}.${sig}`;

      const headers = {
        ...CORS,
        "set-cookie": makeCookie("elevea_sess", token),
      };

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, user }) };
    }

    // ME (GET ?email=... ou POST {email})
    if (action === "me") {
      let email = "";
      if (event.httpMethod === "GET") {
        email = String(event.queryStringParameters?.email || "").trim().toLowerCase();
      } else if (event.httpMethod === "POST") {
        const body = event.body ? JSON.parse(event.body) : {};
        email = String(body.email || "").trim().toLowerCase();
      }
      if (!email) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false }) };

      const r = await postToGas({ type: "user_me", email });
      if (!r.ok) return { statusCode: 404, headers: CORS, body: JSON.stringify({ ok: false, error: r.data?.error || "user_not_found" }) };
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user: r.data.user }) };
    }

    // LOGOUT (stateless)
    if (action === "logout") {
      const headers = { ...CORS, "set-cookie": makeCookie("elevea_sess", "", 0) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "invalid_action" }) };
  } catch (e: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};

export default handler;
