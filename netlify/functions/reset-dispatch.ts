// netlify/functions/reset-dispatch.ts
import type { Handler } from "@netlify/functions";

const GAS_BASE =
  (process.env.ELEVEA_GAS_URL || process.env.ELEVEA_STATUS_URL || "").replace(
    /\/+$/,
    ""
  );

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
} as const;

export const handler: Handler = async (event) => {
  try {
    // CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS, body: "" };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
      };
    }

    if (!GAS_BASE) {
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: "missing_gas_url" }),
      };
    }

    // body esperado: { email }
    let email = "";
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      email = String(body.email || "").trim().toLowerCase();
    } catch {
      /* ignore */
    }
    if (!email) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: "missing_email" }),
      };
    }

    const gasUrl = GAS_BASE.endsWith("/exec") ? GAS_BASE : `${GAS_BASE}/exec`;

    const upstream = await fetch(gasUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "password_reset_request",
        email,
      }),
    });

    const text = await upstream.text();
    let data: any;
    try {
      data = JSON.parse(text || "{}");
    } catch {
      data = { raw: text };
    }

    // Propaga status do GAS e normaliza ok
    if (!upstream.ok) {
      return {
        statusCode: upstream.status,
        headers: { ...CORS, "x-upstream-status": String(upstream.status) },
        body: JSON.stringify({
          ok: false,
          error: data?.error || "upstream_error",
          data,
          status: upstream.status,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS, "x-upstream-status": String(upstream.status) },
      body: JSON.stringify(
        data?.ok ? data : { ok: true, message: "reset_email_sent" }
      ),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({
        ok: false,
        error: "exception",
        message: String(err?.message || err),
      }),
    };
  }
};
