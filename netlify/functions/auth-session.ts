import type { Handler } from "@netlify/functions";

/** URL do seu WebApp do GAS (final /exec). Pode vir do ENV. */
const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL ||
  "";

/** Headers CORS (use as keys com caixa certa) */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
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

const handler: Handler = async (event) => {
  try {
    // Preflight
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS, body: "" };
    }

    // Lê action do query, ou do body (fallback)
    let bodyJson: any = {};
    try { bodyJson = event.body ? JSON.parse(event.body) : {}; } catch { bodyJson = {}; }

    const actionRaw =
      (event.queryStringParameters?.action ?? bodyJson?.action ?? "").toString();

    const action = actionRaw.toLowerCase().trim();

    if (!["login", "me", "logout"].includes(action)) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: "missing_or_invalid_action" }),
      };
    }

    // ===== LOGIN =====
    if (action === "login") {
      if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "method_not_allowed" }) };
      }

      const email = String(bodyJson.email || "").trim().toLowerCase();
      const password = String(bodyJson.password || "").trim();

      if (!email || !password) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_fields" }) };
      }

      const r = await postToGas({ type: "user_login", email, password });
      if (!r.ok) {
        return {
          statusCode: 401,
          headers: CORS,
          body: JSON.stringify({ ok: false, error: r.data?.error || "invalid_credentials" }),
        };
      }

      // opcional: consulta perfil
      const me = await postToGas({ type: "user_me", email });
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ ok: true, user: me.data?.user || { email } }),
      };
    }

    // ===== ME (aceita GET ?email=... ou POST {email}) =====
    if (action === "me") {
      let email = "";
      if (event.httpMethod === "GET") {
        email = String(event.queryStringParameters?.email || "").trim().toLowerCase();
      } else if (event.httpMethod === "POST") {
        email = String(bodyJson.email || "").trim().toLowerCase();
      }
      if (!email) {
        // “sem sessão”
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false }) };
      }
      const r = await postToGas({ type: "user_me", email });
      if (!r.ok) {
        return { statusCode: 404, headers: CORS, body: JSON.stringify({ ok: false, error: r.data?.error || "user_not_found" }) };
      }
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user: r.data.user }) };
    }

    // ===== LOGOUT (stateless) =====
    if (action === "logout") {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    // fallback impossível chegar aqui
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "invalid_action" }) };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: String(e?.message || e) }),
    };
  }
};

export default handler;
