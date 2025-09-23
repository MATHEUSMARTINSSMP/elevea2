// netlify/functions/mailer-dispatch.ts
import type { Handler } from "@netlify/functions";

/** Lê env com fallback seguro */
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM =
  process.env.RESEND_FROM ||
  process.env.TEAM_EMAIL || // fallback opcional
  "";

// CORS básico
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
} as const;

/** Templates utilitários */
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

function tplWelcome(name: string, dashboardUrl: string) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6">
    <h2 style="margin:0 0 8px 0">Bem-vindo(a)${name ? `, ${name}` : ""}!</h2>
    <p>Seu painel está pronto. Acesse quando quiser:</p>
    <p><a href="${dashboardUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">
      Abrir painel
    </a></p>
  </div>`.trim();
}

/** Envia via REST do Resend (sem dependência @resend) */
async function sendWithResend(args: { to: string | string[]; subject: string; html: string }) {
  if (!RESEND_API_KEY || !RESEND_FROM) {
    throw new Error("missing_resend_env (RESEND_API_KEY/RESEND_FROM)");
  }

  const payload = {
    from: RESEND_FROM,
    to: Array.isArray(args.to) ? args.to : [args.to],
    subject: args.subject,
    html: args.html,
  };

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!resp.ok) {
    const err = data?.error?.message || data?.message || "resend_error";
    throw new Error(`${err} (status ${resp.status})`);
  }

  return data;
}

export const handler: Handler = async (event) => {
  try {
    // Preflight
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS, body: "" };
    }
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "method_not_allowed" }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const template = String(body.template || "raw");
    const to = body.to;
    if (!to) return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_to" }) };

    let subject = String(body.subject || "");
    let html = String(body.html || "");

    if (template === "reset") {
      const link = String(body.link || "");
      if (!link) return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_link" }) };
      subject = "Elevea • Redefinição de senha";
      html = tplReset(link);
    } else if (template === "welcome") {
      const name = String(body.name || "");
      const dash = String(body.dashboardUrl || "https://eleveaagencia.netlify.app/dashboard");
      subject = "Bem-vindo(a) à Elevea";
      html = tplWelcome(name, dash);
    }
    // template "raw" mantém subject/html do body

    await sendWithResend({ to, subject, html });
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: String(err?.message || err) }) };
  }
};
