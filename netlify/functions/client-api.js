// netlify/functions/client-api.js
// Node 18+ (default Netlify). Sem libs externas.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
};

const GAS_BASE_URL = process.env.GAS_BASE_URL; 
// Ex.: https://script.google.com/macros/s/AKfycbx.../exec

function j(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...CORS },
    body: JSON.stringify(body),
  };
}

async function callGAS(params, method = "GET") {
  // Monta URL: GAS_BASE_URL?{params}
  const url = new URL(GAS_BASE_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  const resp = await fetch(url.toString(), { method });
  if (!resp.ok) throw new Error(`GAS HTTP ${resp.status}`);
  return await resp.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return j(200, { ok: true });

  try {
    if (!GAS_BASE_URL) return j(500, { ok: false, error: "GAS_BASE_URL não configurado" });

    const isPost = event.httpMethod === "POST";
    const qs = event.queryStringParameters || {};
    const body = isPost && event.body ? JSON.parse(event.body) : {};

    const action = (qs.action || body.action || "").trim();
    const site   = (qs.site   || body.site   || body.siteSlug || "").trim();
    const pin    = (qs.pin    || body.pin    || body.vipPin   || "").trim();

    if (!site && action !== "ping") return j(400, { ok: false, error: "missing_site" });

    // ---------- FEEDBACKS: PÚBLICO ----------
    // Chama seu listFeedbacksPublic_(site, page, pageSize)
    if (action === "list_feedbacks") {
      const page = Number(qs.page || body.page || 1) || 1;
      const pageSize = Number(qs.pageSize || body.pageSize || 50) || 50;

      // Seu doGet/doPost no GAS deve rotear por "action"
      const data = await callGAS({
        action: "list_feedbacks_public",
        site,
        page,
        pageSize,
      }).catch(() => ({ ok: true, items: [] }));

      // Normaliza saída para o Dashboard.tsx
      const items = Array.isArray(data.items)
        ? data.items.map((f) => ({
            id: String(f.id ?? ""),
            name: f.name ?? "",
            message: f.message ?? f.comment ?? "",
            timestamp: f.timestamp ?? f.ts ?? "",
            approved: Boolean(f.approved ?? true),
            // sem email/phone no público
            rating: Number(f.rating ?? 0) || 0,
          }))
        : [];

      return j(200, { ok: true, items });
    }

    // ---------- FEEDBACKS: SEGURO (VIP + PIN) ----------
    // Chama seu listFeedbacksSecure_(ss, data)
    if (action === "list_feedbacks_secure") {
      if (!pin) return j(403, { ok: false, error: "missing_pin" });

      const page = Number(qs.page || body.page || 1) || 1;
      const pageSize = Number(qs.pageSize || body.pageSize || 50) || 50;

      const data = await callGAS({
        action: "list_feedbacks_secure",
        site,
        page,
        pageSize,
        pin,
      }).catch(() => null);

      if (!data?.ok) return j(403, { ok: false, error: data?.error || "unauthorized" });

      const items = Array.isArray(data.items)
        ? data.items.map((f) => ({
            id: String(f.id ?? ""),
            name: f.name ?? "",
            message: f.message ?? f.comment ?? "",
            timestamp: f.timestamp ?? f.ts ?? "",
            approved: Boolean(f.approved ?? false),
            email: f.email ?? "",
            phone: f.phone ?? "",
            rating: Number(f.rating ?? 0) || 0,
          }))
        : [];

      return j(200, { ok: true, items });
    }

    // ---------- FEEDBACK: APROVAÇÃO ----------
    // Chama seu feedbackSetApproval_(ss, data)
    if (action === "feedback_set_approval") {
      const id = (qs.id || body.id || "").trim();
      const approved = String(qs.approved ?? body.approved ?? "").toLowerCase() === "true";

      if (!id) return j(400, { ok: false, error: "missing_id" });

      const data = await callGAS({
        action: "feedback_set_approval",
        site,
        id,
        approved: approved ? "true" : "false",
        pin,
      });

      return j(200, { ok: !!data.ok });
    }

    return j(400, { ok: false, error: "invalid_action" });
  } catch (e) {
    return j(500, { ok: false, error: e?.message || "unexpected_error" });
  }
};
