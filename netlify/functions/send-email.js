// netlify/functions/send-email.js
// Proxy de compatibilidade: encaminha para mailer-dispatch para evitar duplicidade.
export const handler = async (event) => {
  // repassa a mesma requisição para o mailer-dispatch
  return fetch(process.env.URL + "/.netlify/functions/mailer-dispatch", {
    method: event.httpMethod,
    headers: { "Content-Type": "application/json" },
    body: event.body || "{}",
  })
    .then(async (r) => ({
      statusCode: r.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: await r.text(),
    }))
    .catch((err) => ({
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: String(err) }),
    }));
};
