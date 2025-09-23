// src/lib/email.ts

type MailerResp = { ok?: boolean; error?: string };

async function callMailer(body: Record<string, any>) {
  const r = await fetch("/.netlify/functions/mailer-dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: MailerResp = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) {
    console.error("Erro ao enviar e-mail:", data?.error || `http_${r.status}`);
    throw new Error(data?.error || "Falha no envio de e-mail");
  }
  return data;
}

/** E-mail genérico */
export async function sendCustomEmail(to: string, subject: string, html: string) {
  return callMailer({ template: "raw", to, subject, html });
}

/** Bem-vindo (usa template do mailer-dispatch) */
export async function sendWelcomeEmail(email: string, opts?: { name?: string; dashboardUrl?: string }) {
  return callMailer({
    template: "welcome",
    to: email,
    name: opts?.name || "",
    dashboardUrl: opts?.dashboardUrl || "",
  });
}

/** Reset – caso você queira disparar manualmente por aqui (não é necessário
 * para o fluxo de esqueci a senha, que já chama a função dedicada de reset). */
export async function sendResetEmail(email: string, link: string) {
  return callMailer({ template: "reset", to: email, link });
}
