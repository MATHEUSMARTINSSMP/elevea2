// netlify/functions/auth-reset.ts
import type { Handler } from "@netlify/functions";

const GAS_URL =
  process.env.ELEVEA_GAS_URL ||
  process.env.APPS_ENDPOINT ||
  // fallback: seu webapp GAS direto
  "https://script.google.com/macros/s/AKfycbxct7yb5ba8lb_LJVj98vn9m7oFLbTeRRoBxUMtW8sMZxnf00tuIuPsjCvoO-tcNe4/exec";

const allowOrigin = (origin?: string) => {
  // permite seu site em prod + localhost
  if (!origin) return "*";
  try {
    const u = new URL(origin);
    if (
      u.hostname.endsWith("netlify.app") ||
      u.hostname.endsWith("eleveaagencia.netlify.app") ||
      u.hostname === "localhost"
    ) return origin;
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

    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "password_reset_request", email }),
    });

    const out = await r.json().catch(() => ({}));
    return {
      statusCode: 200,
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
