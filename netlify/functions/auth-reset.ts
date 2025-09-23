// netlify/functions/auth-reset.ts
import type { Handler } from "@netlify/functions";
import { withCors } from "./_cors.ts";

// Mesma resolução do APPS_ENDPOINT usada no front (api.ts)
const APPS_ENDPOINT =
  process.env.ELEVEA_GAS_URL ||
  process.env.VITE_APPS_WEBAPP_URL ||
  "https://script.google.com/macros/s/AKfycbxPbvLefGLGZJXLBXeXYtSOWVl7gQwl3G0v1NTVDovBiPW5J_yTm_a-3v6nOXh5D6NNBQ/exec";

// Pequeno helper para chamar o GAS
async function callGas(method: string, payload: Record<string, any>) {
  const r = await fetch(APPS_ENDPOINT + "?m=" + encodeURIComponent(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await r.text();
  try {
    return { status: r.status, json: JSON.parse(text) };
  } catch {
    // Caso GAS retorne texto/HTML em erro
    return { status: r.status, json: { ok: false, error: "upstream_not_json", raw: text } };
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  let body: any = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "invalid_json" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const action = String(body.action || body.mode || "").trim().toLowerCase();

  // 1) Iniciar reset: exige e-mail
  if (action === "request") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "missing_email" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const { status, json } = await callGas("password_reset_request", { email });
    return {
      statusCode: status,
      body: JSON.stringify(json),
      headers: { "Content-Type": "application/json" },
    };
  }

  // 2) Confirmar reset: exige token + nova senha
  if (action === "confirm") {
    const token = String(body.token || "").trim();
    const password = String(body.password || "").trim();
    if (!token || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "missing_token_or_password" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const { status, json } = await callGas("password_reset_confirm", {
      token,
      password,
    });
    return {
      statusCode: status,
      body: JSON.stringify(json),
      headers: { "Content-Type": "application/json" },
    };
  }

  // Ação não reconhecida
  return {
    statusCode: 400,
    body: JSON.stringify({ ok: false, error: "invalid_action", expect: ["request", "confirm"] }),
    headers: { "Content-Type": "application/json" },
  };
};

export const handler = withCors(handler);
export default handler;
