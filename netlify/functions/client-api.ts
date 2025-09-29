// netlify/functions/client-api.js

/* ========= ENV ========= */
const GAS_BASE_URL =
  process.env.GAS_BASE_URL ||
  process.env.ELEVEA_GAS_URL ||
  "";

const ADMIN_DASH_TOKEN =
  process.env.ADMIN_DASH_TOKEN ||
  process.env.ADMIN_TOKEN ||
  "";

/* ========= HELPERS ========= */
function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      ...extraHeaders,
    },
  });
}

// Normaliza feedbacks (formato único no front)
function normalizeFeedbackItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((it, i) => {
    const id = String(it.id ?? it.ID ?? it.rowId ?? it.row ?? i + 1);
    const timestamp = String(it.timestamp ?? it.ts ?? it.created_at ?? it.date ?? "");
    const name = String(it.name ?? it.author ?? it.user ?? "");
    const message = String(it.message ?? it.comment ?? it.text ?? "");
    const email = String(it.email ?? it.mail ?? "");
    const phone = String(it.phone ?? it.tel ?? it.whatsapp ?? "");
    const ratingNum = Number(it.rating ?? it.score ?? it.stars ?? 0) || 0;
    const approvedBool = String(it.approved ?? it.isApproved ?? it.visible ?? "")
      .toLowerCase() === "true";
    return {
      id, timestamp, name, message, email, phone,
      rating: ratingNum, approved: approvedBool,
      sentiment: it.sentiment || undefined,
    };
  });
}

// Chamada ao GAS (GET/POST)
async function callGAS(action, payload = {}, method = "POST") {
  if (!GAS_BASE_URL) return { ok: false, error: "missing_GAS_BASE_URL_env" };

  const url =
    method === "GET"
      ? `${GAS_BASE_URL}?action=${encodeURIComponent(action)}&${new URLSearchParams(payload).toString()}`
      : `${GAS_BASE_URL}?action=${encodeURIComponent(action)}`;

  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify(payload) : undefined,
  });

  if (!res.ok) return { ok: false, error: `gas_http_${res.status}` };
  const data = await res.json().catch(() => ({}));
  return data;
}

/* ========= HANDLER ========= */
export default async (req) => {
  try {
    // CORS
    if (req.method === "OPTIONS") {
      return new Response("", {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "content-type,authorization",
          "access-control-allow-methods": "GET,POST,OPTIONS",
        },
      });
    }

    const isGET = req.method === "GET";
    const isPOST = req.method === "POST";
    if (!isGET && !isPOST) return json(405, { ok: false, error: "method_not_allowed" });

    const url = new URL(req.url);
    const q = url.searchParams;
    const body = isPOST ? (await req.json().catch(() => ({}))) : {};
    const action = String((isGET ? q.get("action") : body.action) || "");

    // Segurança extra para rotas secure
    if (action === "feedback_set_approval" || action === "list_feedbacks_secure") {
      body.adminToken = body.adminToken || ADMIN_DASH_TOKEN || "";
    }

    /* ======== ROTAS DASHBOARD (GET) ======== */
    if (action === "get_status") {
      const site = String((isGET ? q.get("site") : body.site) || "");
      return json(200, await callGAS("get_status", { site }, "GET"));
    }

    if (action === "get_settings") {
      const site = String((isGET ? q.get("site") : body.site) || "");
      return json(200, await callGAS("get_settings", { site }, "GET"));
    }

    // aceita client_plan e client-plan (GET)
    if (action === "client_plan" || action === "client-plan") {
      const site = String((isGET ? q.get("site") : body.site) || "");
      const email = String((isGET ? q.get("email") : body.email) || "");
      return json(200, await callGAS("client_plan", { site, email }, "GET"));
    }

    /* ======== FEEDBACKS (POST) ======== */
    if (action === "list_feedbacks") {
      const site = String(body.site || body.siteSlug || "");
      const page = Number(body.page || 1);
      const pageSize = Number(body.pageSize || 20);
      const gas = await callGAS("list_feedbacks_public", { site, page, pageSize }, "GET");
      return json(200, gas?.ok === false ? { ok: true, items: [] } : {
        ok: true,
        items: normalizeFeedbackItems(gas.items || []),
        total: gas.total || 0, page: gas.page || page, pageSize: gas.pageSize || pageSize,
      });
    }

    if (action === "list_feedbacks_secure") {
      const site = String(body.site || body.siteSlug || "");
      const pin = String(body.pin || body.vipPin || "");
      const page = Number(body.page || 1);
      const pageSize = Number(body.pageSize || 50);
      const gas = await callGAS("list_feedbacks_secure",
        { site, pin, page, pageSize, adminToken: body.adminToken }, "POST");
      return json(200, gas?.ok === false ? { ok: true, items: [] } : {
        ok: true,
        items: normalizeFeedbackItems(gas.items || []),
        total: gas.total || 0, page: gas.page || page, pageSize: gas.pageSize || pageSize,
      });
    }

    if (action === "feedback_set_approval") {
      const site = String(body.site || body.siteSlug || "");
      const id = String(body.id || "");
      const approved = !!body.approved;
      const pin = String(body.pin || body.vipPin || "");
      const gas = await callGAS("feedback_set_approval",
        { site, id, approved, pin, adminToken: body.adminToken }, "POST");
      return json(200, gas?.ok === false ? { ok: false, error: gas?.error || "gas_failed" } : { ok: true });
    }

    if (action === "submit_feedback") {
      const siteSlug = String(body.site || body.siteSlug || "");
      const payload = {
        type: "submit_feedback",
        siteSlug,
        id: body.id, name: body.name, rating: body.rating, comment: body.comment,
        email: body.email, phone: body.phone,
      };
      const gas = await callGAS("submit_feedback", payload, "POST");
      return json(200, gas?.ok === false ? { ok: false, error: gas?.error || "gas_failed" } : { ok: true });
    }

    /* ======== WHATSAPP (POST) ======== */
    if (action === "wa_list_messages") {
      const site = String(body.site || body.siteSlug || "");
      const page = Number(body.page || 1);
      const pageSize = Number(body.pageSize || 20);
      const gas = await callGAS("wa_list_messages", { site, page, pageSize }, "POST");
      return json(200, gas?.ok ? gas : { ok: true, items: [], total: 0, page, pageSize });
    }

    // >>> Faltava esta rota, usada pelo WhatsAppManager
    if (action === "wa_list_contacts") {
      const site = String(body.site || body.siteSlug || "");
      const page = Number(body.page || 1);
      const pageSize = Number(body.pageSize || 100);
      const pin = String(body.pin || body.vipPin || "");
      const gas = await callGAS("wa_list_contacts", { site, page, pageSize, pin }, "POST");
      return json(200, gas?.ok ? gas : { ok: true, items: [], total: 0, page, pageSize });
    }

    if (action === "wa_send" || action === "wa_send_text") {
      const site = String(body.site || body.siteSlug || "");
      const to = String(body.to || "");
      const text = String(body.text || "");
      const gas = await callGAS("wa_send_text", { site, to, text }, "POST");
      return json(200, gas || { ok: false, error: "gas_failed" });
    }

    if (action === "wa_send_template") {
      const site = String(body.site || body.siteSlug || "");
      const to = String(body.to || "");
      const template = String(body.template || "hello_world");
      const lang = String(body.lang || "en_US");
      const components = Array.isArray(body.components) ? body.components : undefined;
      const gas = await callGAS("wa_send_template", { site, to, template, lang, components }, "POST");
      return json(200, gas || { ok: false, error: "gas_failed" });
    }

    /* -------------------------------------------------- */
    return json(400, { ok: false, error: "unknown_action" });

  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
};
