// netlify/functions/auth-session.ts
import type { Handler } from "@netlify/functions";

const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL ||
  ""; // cole o URL do seu WebApp do GAS se quiser deixar fixo

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
} as const;

function ensureExecUrl(u: string) {
  return u && u.includes("/exec") ? u : (u ? u.replace(/\/+$/, "") + "/exec" : "");
}

async function postToGas(pathBody: any) {
  const url = ensureExecUrl(GAS_BASE);
  if (!url) throw new Error("missing_gas_url");

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(pathBody),
  });

  const txt = await r.text();
  let data: any = {};
  try { data = JSON.parse(txt || "{}"); } catch { data = { ok: false, raw: txt }; }

  return { ok: r.ok && data?.ok !== false, status: r.status, data };
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

    if (event.httpMethod !== "POST" && action === "login") {
      return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "method_not_allowed" }) };
    }

    // LOGIN
    if (action === "login") {
      const body = event.body ? JSON.parse(event.body) : {};
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "").trim();
      if (!email || !password) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_fields" }) };
      }
      const r = await postToGas({ type: "user_login", email, password });
      if (!r.ok) {
        return { statusCode: 401, headers: CORS, body: JSON.stringify({ ok: false, error: r.data?.error || "invalid_credentials" }) };
      }
      // opcional: consultar user_me logo após
      const me = await postToGas({ type: "user_me", email });
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user: me.data?.user || { email } }) };
    }

    // ME
    if (action === "me") {
      // aqui, como não temos sessão no server, o front deve mandar o e-mail (ou você adapta para cookie futuramente)
      const body = event.body ? JSON.parse(event.body) : {};
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_email" }) };
      const r = await postToGas({ type: "user_me", email });
      if (!r.ok) return { statusCode: 404, headers: CORS, body: JSON.stringify({ ok: false, error: r.data?.error || "user_not_found" }) };
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user: r.data.user }) };
    }

    // LOGOUT “stateless”
    if (action === "logout") {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "invalid_action" }) };
  } catch (e: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};
