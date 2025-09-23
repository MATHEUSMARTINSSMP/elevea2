// netlify/functions/reset-dispatch.ts
import type { Handler } from "@netlify/functions";

/**
 * ENV obrigatórias (Netlify):
 * - ELEVEA_GAS_URL  (ou ELEVEA_STATUS_URL) -> webapp do GAS (terminando com /exec)
 * - RESEND_API_KEY
 * - RESEND_FROM     -> ex: no-reply@eleveaagencia.com.br
 * Opcional:
 * - DASH_URL        -> ex: https://eleveaagencia.netlify.app
 */

const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL ||
  "";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM =
  process.env.RESEND_FROM ||
  process.env.TEAM_EMAIL || ""; // fallback

const DASH_URL =
  process.env.DASH_URL ||
  process.env.VITE_DASH_URL ||
  "https://eleveaagencia.netlify.app";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
} as const;

function ensureExecUrl(u: string) {
  u = String(u || "");
  return u.includes("/exec") ? u : u.replace(/\/+$/, "") + "/exec";
}

function tplReset(link: string) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6">
    <h2 style="margin:0 0 8px 0">Redefinição de senha</h2>
    <p>Recebemos um pedido para redefinir sua senha.</p>
    <p><a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">
      Redefinir senha
    </a></p>
    <p style="font-size:12px;opacity:.7">Se você não solicitou, ignore este e-mail.</p>
  </div>`.trim();
}

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
    if (!RESEND_API_KEY || !RESEND_FROM) {
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: "missing_resend_config" }),
      };
    }

    // === parse body
    const body = event.body ? JSON.parse(event.body) : {};
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: "missing_email" }),
      };
    }

    // === chama GAS para registrar pedido e (opcionalmente) devolver link pronto
    const gasUrl = ensureExecUrl(GAS_BASE);
    const gasResp = await fetch(gasUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "password_reset_request",
        email,
      }),
    });

    const gasText = await gasResp.text();
    let gasJson: any = {};
    try {
      gasJson = JSON.parse(gasText || "{}");
    } catch {
      gasJson = { raw: gasText };
    }

    if (!gasResp.ok || gasJson?.ok === false) {
      // Se o GAS devolver user_not_found, preferimos responder ok (para não vazar se o e-mail existe)
      const err = gasJson?.error || `gas_http_${gasResp.status}`;
      if (err === "user_not_found") {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, message: "reset_email_sent" }) };
      }
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: err, debug: gasJson }),
      };
    }

    // === monta link final
    let resetLink = "";
    if (gasJson?.link) {
      resetLink = String(gasJson.link);
    } else {
      // fallback: /reset?email=...&token=... ou apenas /reset
      const base = DASH_URL.replace(/\/+$/, "");
      const token = gasJson?.token ? String(gasJson.token) : "";
      if (token) {
        resetLink = `${base}/reset?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
      } else {
        resetLink = `${base}/reset?email=${encodeURIComponent(email)}`;
      }
    }

    // === envia email via Resend REST
    const html = tplReset(resetLink);
    const rs = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: "Elevea • Redefinição de senha",
        html,
      }),
    });

    const rsText = await rs.text();
    let rsJson: any = {};
    try {
      rsJson = JSON.parse(rsText || "{}");
    } catch {
      rsJson = { raw: rsText };
    }

    if (!rs.ok) {
      return {
        statusCode: 502,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: "resend_error", status: rs.status, data: rsJson }),
      };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, message: "reset_email_sent" }) };
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: String(err?.message || err) }) };
  }
};
