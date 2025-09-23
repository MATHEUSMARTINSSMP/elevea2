// netlify/functions/reset-dispatch.ts
import type { Handler } from "@netlify/functions";

/**
 * ENV necessários:
 *  - ELEVEA_GAS_URL ou ELEVEA_STATUS_URL  → WebApp do GAS (/exec)
 *  - RESEND_API_KEY
 *  - RESEND_FROM  (ex: "no-reply@eleveaagencia.com.br")
 *  - DASH_URL (opcional; fallback para montar o link do reset)
 */

const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL ||
  "";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM    = process.env.RESEND_FROM    || process.env.TEAM_EMAIL || "";
const DASH_URL       = process.env.DASH_URL       || process.env.VITE_DASH_URL || "https://eleveaagencia.netlify.app";

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

function ensureExecUrl(u: string) {
  return u.includes("/exec") ? u : u.replace(/\/+$/, "") + "/exec";
}

function htmlTemplate(resetLink: string, token?: string) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6">
    <h2 style="margin:0 0 8px 0">Redefinição de senha</h2>
    <p>Recebemos um pedido para redefinir sua senha.</p>
    <p>
      <a href="${resetLink}"
         style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">
        Redefinir senha
      </a>
    </p>
    ${
      token
        ? `<p style="font-size:13px;margin-top:10px">
             <strong>Token:</strong>
             <code style="background:#f5f5f5;padding:2px 6px;border-radius:6px">${token}</code>
           </p>
           <p style="font-size:12px;opacity:.8">
             Se o botão não funcionar, copie o token acima e cole na página de redefinição.
           </p>`
        : `<p style="font-size:12px;opacity:.8">
             Se o botão não funcionar, responda este e-mail.
           </p>`
    }
    <p style="font-size:12px;opacity:.6">Se você não solicitou, ignore este e-mail.</p>
  </div>
  `.trim();
}

export const handler: Handler = async (event) => {
  const origin = allowOrigin(event.headers?.origin);

  try {
    // CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      }, body: "" };
    }
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: { "Access-Control-Allow-Origin": origin }, body: JSON.stringify({ ok: false, error: "method_not_allowed" }) };
    }

    if (!GAS_BASE)        return { statusCode: 500, headers: { "Access-Control-Allow-Origin": origin }, body: JSON.stringify({ ok:false, error:"missing_gas_url" }) };
    if (!RESEND_API_KEY)  return { statusCode: 500, headers: { "Access-Control-Allow-Origin": origin }, body: JSON.stringify({ ok:false, error:"missing_resend_api_key" }) };
    if (!RESEND_FROM)     return { statusCode: 500, headers: { "Access-Control-Allow-Origin": origin }, body: JSON.stringify({ ok:false, error:"missing_resend_from" }) };

    const body = event.body ? JSON.parse(event.body) : {};
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return { statusCode: 400, headers: { "Access-Control-Allow-Origin": origin }, body: JSON.stringify({ ok:false, error:"missing_email" }) };
    }

    // 1) pede ao GAS gerar o token
    const gasUrl  = ensureExecUrl(GAS_BASE);
    const payload = { type: "password_reset_request", email };
    const resp    = await fetch(gasUrl, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });

    const txt  = await resp.text();
    let data: any = {};
    try { data = JSON.parse(txt || "{}"); } catch { data = { raw: txt }; }

    if (!resp.ok || data?.ok === false) {
      return {
        statusCode: resp.status || 502,
        headers: { "Access-Control-Allow-Origin": origin },
        body: JSON.stringify({ ok:false, error: data?.error || "gas_error", data })
      };
    }

    // 2) extrai token/link (se o GAS não enviar link, montamos com DASH_URL)
    const token     = String(data.token || "");
    const baseDash  = (process.env.DASH_URL || DASH_URL).replace(/\/+$/,"");
    const resetLink =
      String(data.link || "") ||
      `${baseDash}/reset?email=${encodeURIComponent(email)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

    // 3) envia o email via Resend
    const r2 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: "Elevea • Redefinição de senha",
        html: htmlTemplate(resetLink, token || undefined),
      }),
    });

    const j2 = await r2.json().catch(() => ({}));
    if (!r2.ok) {
      return { statusCode: 502, headers: { "Access-Control-Allow-Origin": origin }, body: JSON.stringify({ ok:false, error:"resend_error", details:j2 }) };
    }

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": origin, "Content-Type":"application/json" }, body: JSON.stringify({ ok:true, message:"reset_email_sent" }) };
  } catch (err: any) {
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": origin }, body: JSON.stringify({ ok:false, error: String(err?.message || err) }) };
  }
};
