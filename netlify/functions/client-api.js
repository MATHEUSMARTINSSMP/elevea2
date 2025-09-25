// netlify/functions/client-api.js
// Node 18+ (Netlify default). Sem dependências externas.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
};

// *** IMPORTANTES ***
// Configure no painel do Netlify:
// GAS_BASE_URL = https://script.google.com/macros/s/SEU_ID/exec   (sem / no final opcional)
// Ex.: https://script.google.com/macros/s/AKfycbx123.../exec
const GAS_BASE_URL = process.env.GAS_BASE_URL;

function json(status, body, extra = {}) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extra },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  try {
    const isPost = event.httpMethod === "POST";
    const params = new URLSearchParams(event.queryStringParameters || {});
    const body = isPost && event.body ? JSON.parse(event.body) : {};
    const action = (params.get("action") || body.action || "").trim();
    const site = (params.get("site") || body.site || "").trim();
    const pin = (params.get("pin") || body.pin || "").trim();

    if (!GAS_BASE_URL) {
      return json(500, { ok: false, error: "GAS_BASE_URL não configurado no Netlify." });
    }
    if (!site) return json(400, { ok: false, error: "Parâmetro 'site' é obrigatório." });

    // util: chamada simples ao GAS
    async function callGAS(path, query) {
      const url = new URL(GAS_BASE_URL.replace(/\/$/, "") + path);
      Object.entries(query || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
      const resp = await fetch(url.toString(), { method: "GET" });
      if (!resp.ok) throw new Error(`GAS HTTP ${resp.status}`);
      return await resp.json();
    }

    if (action === "list_feedbacks") {
      // público — somente aprovados; sem e-mail/telefone
      // No seu GAS, exponha algo como ?endpoint=feedbacks_public
      const data = await callGAS("/feedbacks", { site, scope: "public" }).catch(() => ({ ok: true, items: [] }));
      // Normaliza estrutura esperada
      const items = Array.isArray(data.items) ? data.items.map((f) => ({
        id: String(f.id ?? ""),
        name: f.name ?? "",
        message: f.message ?? "",
        timestamp: f.timestamp ?? new Date().toISOString(),
        approved: Boolean(f.approved ?? true),
        // sem email/phone aqui
      })) : [];
      return json(200, { ok: true, items });
    }

    if (action === "list_feedbacks_secure") {
      // seguro — exige PIN, retorna todos + dados sensíveis
      if (!pin) return json(403, { ok: false, error: "PIN obrigatório." });
      // No GAS, valide PIN e retorne { ok, items, authorized }
      const data = await callGAS("/feedbacks", { site, scope: "secure", pin }).catch(() => null);
      if (!data?.ok || data.authorized === false) {
        return json(403, { ok: false, error: "PIN inválido ou não autorizado." });
      }
      const items = Array.isArray(data.items) ? data.items.map((f) => ({
        id: String(f.id ?? ""),
        name: f.name ?? "",
        message: f.message ?? "",
        timestamp: f.timestamp ?? new Date().toISOString(),
        approved: Boolean(f.approved ?? false),
        email: f.email ?? "",
        phone: f.phone ?? "",
      })) : [];
      return json(200, { ok: true, items });
    }

    // outras ações que você já tenha podem continuar aqui...
    return json(400, { ok: false, error: "Ação inválida." });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || "Erro inesperado" });
  }
};
