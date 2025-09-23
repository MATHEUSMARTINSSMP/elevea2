// netlify/functions/reset-dispatch.ts
import type { Handler } from "@netlify/functions";

const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL || // fallback
  ""; // <- NÃO deixe vazio em produção. Configure no Netlify.

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

    // Espera { email: string }
    let email = "";
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      email = String(body.email || "").trim();
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

    // Monta chamada ao GAS /exec (rota password_reset_request)
    const url = GAS_BASE.includes("/exec")
      ? GAS_BASE
      : GAS_BASE.replace(/\/+$/, "") + "/exec";

    const payload = {
      type: "password_reset_request",
      email,
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Pode retornar 200 com {ok:true} ou 4xx/5xx com json de erro
    const text = await resp.text();
    let data: any = {};
    try {
      data = JSON.parse(text || "{}");
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers: CORS,
        body: JSON.stringify({
          ok: false,
          error: data?.error || "gas_error",
          status: resp.status,
          data,
        }),
      };
    }

    // Normaliza um “ok:true”
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(
        data?.ok ? data : { ok: true, message: "reset_email_sent" }
      ),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: String(err?.message || err) }),
    };
  }
};
