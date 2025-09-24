// netlify/functions/auth-status.js  (CJS)

const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL ||
  ""; // precisa apontar para a WebApp do GAS (terminando com /exec)

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
};

const SIGN_SECRET =
  process.env.ADMIN_DASH_TOKEN ||
  process.env.ADMIN_TOKEN ||
  "";

// ---------- utils ----------
function ensureExecUrl(u) {
  return u && u.includes("/exec") ? u : (u ? u.replace(/\/+$/, "") + "/exec" : "");
}

function b64url(buf) {
  return Buffer.from(new Uint8Array(buf))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlToJson(s) {
  const b64 = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json);
}

async function hmac(payload) {
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

function timingSafeEqual(a, b) {
  const A = Buffer.from(String(a || ""));
  const B = Buffer.from(String(b || ""));
  if (A.length !== B.length) return false;
  let r = 0;
  for (let i = 0; i < A.length; i++) r |= A[i] ^ B[i];
  return r === 0;
}

function readCookie(header) {
  const out = {};
  (header || "")
    .split(/;\s*/)
    .filter(Boolean)
    .forEach((p) => {
      const i = p.indexOf("=");
      if (i > 0) out[p.slice(0, i)] = p.slice(i + 1);
    });
  return out;
}

async function postToGas(body) {
  const url = ensureExecUrl(GAS_BASE);
  if (!url) return { ok: false, status: 500, data: { error: "missing_gas_url" } };
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text || "{}"); } catch { data = { raw: text }; }
    return { ok: resp.ok && data?.ok !== false, status: resp.status, data };
  } catch (e) {
    return { ok: false, status: 500, data: { error: String(e && e.message || e) } };
  }
}

// ---------- handler ----------
exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS, body: "" };
    }

    // 1) Autenticação por cookie
    const cookie = readCookie(event.headers.cookie || "");
    const token = cookie["elevea_sess"] || "";
    if (!token) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: "no_session" }) };
    }
    if (!SIGN_SECRET) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_sign_secret" }) };
    }

    const parts = token.split(".");
    const payloadB64 = parts[0] || "";
    const sig = parts[1] || "";
    if (!payloadB64 || !sig) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: "bad_token" }) };
    }
    const expected = await hmac(payloadB64);
    if (!timingSafeEqual(expected, sig)) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: "invalid_signature" }) };
    }

    let claims = {};
    try { claims = b64urlToJson(payloadB64); } catch {}
    if (!claims.email) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: "invalid_claims" }) };
    }
    if (claims.exp && Date.now() > Number(claims.exp)) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: "session_expired" }) };
    }

    // 2) siteSlug (query > token)
    const qs = event.queryStringParameters || {};
    const siteSlug = String(qs.site || qs.siteSlug || claims.siteSlug || "").trim();
    if (!siteSlug) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_site_slug" }) };
    }

    // 3) GAS
    const r = await postToGas({
      type: "client_billing",
      email: String(claims.email || "").toLowerCase(),
      siteSlug,
    });

    // 4) Normalização p/ o dashboard
    const d = r.data || {};
    const normalized = {
      ok: !!r.ok,
      siteSlug,
      status: d.status || d.subscriptionStatus || "INACTIVE",
      plan: d.plan || d.tier || null,
      nextPayment: d.nextPayment || d.next_charge || null,
      lastPayment: d.lastPayment || d.last_payment || null,
      error: d.error || null,
    };

    return { statusCode: 200, headers: CORS, body: JSON.stringify(normalized) };
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: String(e && e.message || e) }) };
  }
};
