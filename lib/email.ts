// src/lib/email.ts
async function sendEmail(payload: { to: string | string[]; subject: string; html: string }) {
  const r = await fetch("/.netlify/functions/mailer-dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template: "raw", ...payload }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) {
    console.error("Erro ao enviar email:", data?.error || r.status);
    throw new Error(data?.error || "Falha no envio de email");
  }
  return data;
}

export async function sendWelcomeEmail(email: string) {
  // Se quiser usar o template pronto "welcome", troque para template: "welcome"
  return fetch("/.netlify/functions/mailer-dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template: "welcome",
      to: email,
      name: "",
      dashboardUrl: "https://eleveaagencia.netlify.app/dashboard",
    }),
  }).then((r) => r.json());
}

export async function sendCustomEmail(to: string, subject: string, html: string) {
  return sendEmail({ to, subject, html });
}
