// netlify/functions/reset-dispatch.js
// CommonJS, compatível com o bundler do Netlify sem transpilar

const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL || // fallback
  ""; // configure isso no Netlify (Site settings → Environment variables)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json; charset=utf-8",
};

exports.handler = async (event) => {
  try {
    // Preflight
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

    let email = "";
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      email = String(body.email || "").trim().toLowerCase();
    } catch (_) {}

    if (!email) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: "missing_email" }),
      };
    }

    // Monta URL do WebApp do GAS (garante /exec)
    const url = GAS_BASE.includes("/exec")
      ? GAS_BASE
      : GAS_BASE.replace(/\/+$/, "") + "/exec";

    const payload = {
      type: "password_reset_request",
      email,
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data = {};
    try {
      data = JSON.parse(text || "{}");
    } catch {
      data = { raw: text };
    }

    if (!resp.ok || data?.ok === false) {
      return {
        statusCode: resp.status || 502,
        headers: CORS,
        body: JSON.stringify({
          ok: false,
          error: data?.error || "gas_error",
          status: resp.status,
          data,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(
        data?.ok ? data : { ok: true, message: "reset_email_sent" }
      ),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: String(err && err.message || err) }),
    };
  }
};
