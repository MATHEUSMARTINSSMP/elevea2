import type { Handler } from "@netlify/functions";

const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL ||
  "";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
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

// ==== helpers p/ token assinado igual na Edge ====
const SIGN_SECRET = process.env.ADMIN_DASH_TOKEN || process.env.ADMIN_TOKEN || "";

const b64url = (buf: ArrayBuffer) =>
  Buffer.from(new Uint8Array(buf)).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SIGN_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(mac);
}

function makeCookie(value: string, maxAgeSec = 60 * 60 * 24 * 7) {
  // 7 dias
  const parts = [
    `elevea_sess=${value}`,
    `Path=/`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Lax`,
    `Max-Age=${maxAgeSec}`
  ];
  return parts.join("; ");
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

    // LOGIN
    if (action === "login") {
      if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "method_not_allowed" }) };
      }
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

      // pega perfil
      const me = await postToGas({ type: "user_me", email });
      const user = me.data?.user || { email, role: "client" };

      if (!SIGN_SECRET) {
        // Sem cookie: segue stateless (não recomendado)
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user }) };
      }

      // monta token igual ao da Edge
      const payloadObj = {
        email: user.email,
        role: user.role,
        siteSlug: user.siteSlug || "",
        exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 dias
      };
      const payload = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64")
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
      const sig = await hmac(payload);
      const token = `${payload}.${sig}`;

      const headers = { ...CORS, "set-cookie": makeCookie(token) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, user }) };
    }

    // ME (GET ?email=... ou POST {email})
    if (action === "me") {
      let email = "";
      if (event.httpMethod === "GET") {
        email = String(event.queryStringParameters?.email || "").trim().toLowerCase();
      } else if (event.httpMethod === "POST") {
        const body = event.body ? JSON.parse(event.body) : {};
        email = String(body.email || "").trim().toLowerCase();
      }
      if (!email) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false }) };

      const r = await postToGas({ type: "user_me", email });
      if (!r.ok) return { statusCode: 404, headers: CORS, body: JSON.stringify({ ok: false, error: r.data?.error || "user_not_found" }) };
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user: r.data.user }) };
    }

    // LOGOUT: apaga cookie
    if (action === "logout") {
      const headers = {
        ...CORS,
        "set-cookie": "elevea_sess=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
      };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "invalid_action" }) };
  } catch (e: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};
