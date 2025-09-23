// netlify/functions/mailer-dispatch.ts
import type { Handler } from "@netlify/functions";
import { sendMail } from "../lib/mailer";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
} as const;

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

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "method_not_allowed" }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const template = String(body.template || "raw");
    const to = body.to;
    if (!to) return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_to" }) };

    let subject = String(body.subject || "");
    let html = String(body.html || "");

    // templates prontos:
    if (template === "reset") {
      const link = String(body.link || "");
      if (!link) return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_link" }) };
      subject = "Elevea • Redefinição de senha";
      html = tplReset(link);
    } else if (template === "welcome") {
      const name = String(body.name || "");
      const dash = String(body.dashboardUrl || "");
      subject = "Bem-vindo(a) à Elevea";
      html = tplWelcome(name, dash || "https://eleveaagencia.netlify.app/dashboard");
    } // else: template "raw" usa subject/html enviados

    await sendMail({ to, subject, html });
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: String(err?.message || err) }) };
  }
};
