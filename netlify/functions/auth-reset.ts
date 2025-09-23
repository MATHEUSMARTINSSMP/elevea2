// netlify/functions/auth-reset.ts
import type { Handler } from "@netlify/functions";

/**
 * Este endpoint apenas repassa o pedido para reset-dispatch,
 * que é quem gera o token (via GAS) e envia o e-mail (via Resend).
 * Assim centralizamos o envio em um único lugar.
 */

const allowOrigin = (origin?: string) => {
  if (!origin) return "*";
  try {
    const u = new URL(origin);
    if (
      u.hostname === "localhost" ||
      u.hostname.endsWith("netlify.app") ||
      u.hostname.endsWith("eleveaagencia.netlify.app")
    ) {
      return origin;
    }
  } catch {}
  return "*";
};

export const handler: Handler = async (event) => {
  const origin = allowOrigin(event.headers?.origin);

  // Preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": origin },
      body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": origin },
        body: JSON.stringify({ ok: false, error: "missing_email" }),
      };
    }

    // monta URL absoluta para chamar o próprio function reset-dispatch
    const host = event.headers["x-forwarded-host"] || event.headers.host;
    const proto = event.headers["x-forwarded-proto"] || "https";
    const base = host ? `${proto}://${host}` : "";
    const dispatchUrl = `${base}/.netlify/functions/reset-dispatch`;

    const r = await fetch(dispatchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const out = await r.json().catch(() => ({}));
    return {
      statusCode: r.status,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(out),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": origin },
      body: JSON.stringify({ ok: false, error: String(err?.message || err) }),
    };
  }
};

export default handler;
