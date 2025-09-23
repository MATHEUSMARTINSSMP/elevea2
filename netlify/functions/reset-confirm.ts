// netlify/functions/reset-confirm.ts
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
} as const;

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS, body: "" };
    }
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok:false, error:"method_not_allowed" }) };
    }
    if (!GAS_BASE) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok:false, error:"missing_gas_url" }) };
    }

    const { token, password } = event.body ? JSON.parse(event.body) : {};
    if (!token || !password) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok:false, error:"missing_token_or_password" }) };
    }

    const url = GAS_BASE.includes("/exec") ? GAS_BASE : GAS_BASE.replace(/\/+$/, "") + "/exec";
    const payload = { type: "password_reset_confirm", token, password };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.ok === false) {
      return { statusCode: resp.status, headers: CORS, body: JSON.stringify({ ok:false, error: data?.error || "gas_error" }) };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok:true, message:"password_reset_success" }) };
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok:false, error:String(err?.message || err) }) };
  }
};
