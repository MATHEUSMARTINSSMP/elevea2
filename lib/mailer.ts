// netlify/lib/mailer.ts
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM =
  process.env.RESEND_FROM || process.env.TEAM_EMAIL || "no-reply@eleveaagencia.com.br";

export type SendMailInput = {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
};

export async function sendMail(input: SendMailInput) {
  if (!RESEND_API_KEY || !RESEND_FROM) {
    throw new Error("missing_resend_config");
  }
  const body = {
    from: RESEND_FROM,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    cc: input.cc ? (Array.isArray(input.cc) ? input.cc : [input.cc]) : undefined,
    bcc: input.bcc ? (Array.isArray(input.bcc) ? input.bcc : [input.bcc]) : undefined,
    reply_to: input.replyTo,
  };

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(`resend_error_${r.status}: ${JSON.stringify(j)}`);
  }
  return j;
}
