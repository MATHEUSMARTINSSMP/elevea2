// netlify/functions/auth-reset-confirm.ts
import type { Handler } from "@netlify/functions";

const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL ||
  "";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
  "cache-control": "no-store",
} as const;

function ensureExecUrl(u: string) {
  return u && u.includes("/exec") ? u : (u ? u.replace(/\/+$/, "") + "/exec" : "");
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS, body: "" };
    }
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "method_not_allowed" }) };
    }
    if (!GAS_BASE) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_gas_url" }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const token = String(body.token || "").trim();
    const password = String(body.password || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (!token || !password) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_email_or_token_or_password" }) };
    }

    const resp = await fetch(ensureExecUrl(GAS_BASE), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "password_reset_confirm", token, password, email }),
    });

    const txt = await resp.text();
    let data: any = {};
    try { data = JSON.parse(txt || "{}"); } catch { data = { raw: txt }; }

    if (!resp.ok || data?.ok === false) {
      const err = data?.error || "invalid_token";
      return { statusCode: resp.status || 400, headers: CORS, body: JSON.stringify({ ok: false, error: err, data }) };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, message: "password_reset_success" }) };
  } catch (e: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};

export default handler;
