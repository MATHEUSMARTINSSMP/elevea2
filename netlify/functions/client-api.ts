// netlify/functions/client-api.js

/* ========= ENV ========= */
const GAS_BASE_URL =
  process.env.GAS_BASE_URL ||
  process.env.ELEVEA_GAS_BASE_URL ||
  process.env.GAS_URL ||
  process.env.ELEVEA_GAS_URL ||
  "";

const ADMIN_DASH_TOKEN =
  process.env.ADMIN_DASH_TOKEN ||
  process.env.ADMIN_TOKEN ||
  "";

/* ========= HELPERS ========= */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type,authorization",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS,
      ...extraHeaders,
    },
  });
}

function qs(obj = {}) {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    )
  ).toString();
}

async function timedFetch(url, init, ms = 15000) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(to);
  }
}

// Chamada ao GAS (GET/POST) com proteção de JSON e timeout
async function callGAS(action, payload = {}, method = "POST") {
  if (!GAS_BASE_URL) return { ok: false, error: "missing_GAS_BASE_URL_env" };

  const url =
    method === "GET"
      ? `${GAS_BASE_URL}?action=${encodeURIComponent(action)}&${qs(payload)}`
      : `${GAS_BASE_URL}?action=${encodeURIComponent(action)}`;

  const res = await timedFetch(
    url,
    {
      method,
      headers: { "content-type": "application/json" },
      body: method === "POST" ? JSON.stringify(payload) : undefined,
    },
    15000
  ).catch((e) => ({ __err: e }));

  // Type guard para verificar se é erro
  if (res && typeof res === 'object' && '__err' in res) {
    return { ok: false, error: String((res as any).__err?.name || (res as any).__err) };
  }
  
  // Se chegou aqui, é Response
  const response = res as Response;
  if (!response.ok) return { ok: false, error: `gas_http_${response.status}` };

  const txt = await response.text();
  try {
    return JSON.parse(txt);
  } catch {
    return { ok: false, error: "invalid_json_from_gas", raw: String(txt).slice(0, 300) };
  }
}

// Normaliza feedbacks para formato único
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
      id,
      timestamp,
      name,
      message,
      email,
      phone,
      rating: ratingNum,
      approved: approvedBool,
      sentiment: it.sentiment || undefined,
    };
  });
}

/* ========= HANDLER ========= */
export default async (req) => {
  try {
    // CORS preflight
    if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });

    const isGET = req.method === "GET";
    const isPOST = req.method === "POST";
    if (!isGET && !isPOST) return json(405, { ok: false, error: "method_not_allowed" });

    // Health GET
    if (isGET) {
      const url = new URL(req.url);
      const action = String(url.searchParams.get("action") || "");
      if (!action) return json(200, { ok: false, error: "ignored_get" });
    }

    const url = new URL(req.url);
    const q = url.searchParams;
    const body = isPOST ? (await req.json().catch(() => ({}))) : {};
    const action = String((isGET ? q.get("action") : body.action) || "").trim();

    // Debug de ambiente
    if (action === "debug_env") {
      return json(200, {
        ok: true,
        env: { GAS_BASE_URL: GAS_BASE_URL || null, NODE_ENV: process.env.NODE_ENV || null },
      });
    }

    // Segurança extra para rotas secure
    if (action === "feedback_set_approval" || action === "list_feedbacks_secure") {
      body.adminToken = body.adminToken || ADMIN_DASH_TOKEN || "";
    }

    /* ======== DASHBOARD (GET → GAS GET) ======== */
    if (action === "get_status") {
      const site = String((isGET ? q.get("site") : body.site) || "");
      return json(200, await callGAS("status", { site }, "GET"));
    }

    if (action === "get_settings") {
      const site = String((isGET ? q.get("site") : body.site) || "");
      return json(200, await callGAS("get_settings", { site }, "GET"));
    }

    // aceita client_plan e client-plan (GET → GAS GET)
    if (action === "client_plan" || action === "client-plan") {
      const site = String((isGET ? q.get("site") : body.site) || "");
      const email = String((isGET ? q.get("email") : body.email) || "");
      return json(200, await callGAS("client_plan", { site, email }, "GET"));
    }

    // auth_status (POST → GAS POST) para aceitar PIN
    if (action === "auth_status") {
      const site = String(body.site || body.siteSlug || (isGET ? q.get("site") : "") || "");
      const email = String(body.email || (isGET ? q.get("email") : "") || "");
      const pin = String(body.pin || body.vipPin || (isGET ? q.get("pin") : "") || "");
      return json(200, await callGAS("auth_status", { site, email, pin }, "POST"));
    }

    /* ======== FEEDBACKS (POST) ======== */
    if (action === "list_feedbacks") {
      const site = String(body.site || body.siteSlug || "");
      const page = Number(body.page || 1);
      const pageSize = Number(body.pageSize || 20);
      const gas = await callGAS("list_feedbacks_public", { site, page, pageSize }, "GET");
      return json(
        200,
        gas?.ok === false
          ? { ok: true, items: [], total: 0, page, pageSize }
          : {
              ok: true,
              items: normalizeFeedbackItems(gas.items || []),
              total: gas.total || 0,
              page: gas.page || page,
              pageSize: gas.pageSize || pageSize,
            }
      );
    }

    if (action === "list_feedbacks_secure") {
      const site = String(body.site || body.siteSlug || "");
      const pin = String(body.pin || body.vipPin || "");
      const page = Number(body.page || 1);
      const pageSize = Number(body.pageSize || 50);
      const gas = await callGAS(
        "list_feedbacks_secure",
        { site, pin, page, pageSize, adminToken: body.adminToken },
        "POST"
      );
      return json(
        200,
        gas?.ok === false
          ? { ok: true, items: [], total: 0, page, pageSize }
          : {
              ok: true,
              items: normalizeFeedbackItems(gas.items || []),
              total: gas.total || 0,
              page: gas.page || page,
              pageSize: gas.pageSize || pageSize,
            }
      );
    }

    if (action === "feedback_set_approval") {
      const site = String(body.site || body.siteSlug || "");
      const id = String(body.id || "");
      const approved = !!body.approved;
      const pin = String(body.pin || body.vipPin || "");
      const gas = await callGAS(
        "feedback_set_approval",
        { site, id, approved, pin, adminToken: body.adminToken },
        "POST"
      );
      return json(200, gas?.ok === false ? { ok: false, error: gas?.error || "gas_failed" } : { ok: true });
    }

    if (action === "submit_feedback") {
      const siteSlug = String(body.site || body.siteSlug || "");
      const payload = {
        type: "submit_feedback",
        siteSlug,
        id: body.id,
        name: body.name,
        rating: body.rating,
        comment: body.comment,
        email: body.email,
        phone: body.phone,
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

    if (action === "wa_list_contacts") {
      const site = String(body.site || body.siteSlug || "");
      const page = Number(body.page || 1);
      const pageSize = Number(body.pageSize || 100);
      const pin = String(body.pin || body.vipPin || "");
      // usa GET para bater no doGet do GAS e evitar timeouts de corpo grande
      const gas = await callGAS("wa_list_contacts", { site, page, pageSize, pin }, "GET");
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

    if (action === "wa_get_templates") {
      const site = String(body.site || body.siteSlug || "");
      const pin = String(body.pin || body.vipPin || "");
      const gas = await callGAS("wa_get_templates", { site, pin }, "GET");
      return json(200, gas?.ok ? gas : { ok: true, templates: [] });
    }

    if (action === "wa_upsert_template") {
      const site = String(body.site || body.siteSlug || "");
      const pin = String(body.pin || body.vipPin || "");
      const template = body.template || {};
      const gas = await callGAS("wa_upsert_template", { site, pin, template: JSON.stringify(template) }, "POST");
      return json(200, gas || { ok: false, error: "gas_failed" });
    }

    if (action === "wa_update_contact") {
      const site = String(body.site || body.siteSlug || "");
      const pin = String(body.pin || body.vipPin || "");
      const contact = body.contact || {};
      const gas = await callGAS("wa_update_contact", { site, pin, contact: JSON.stringify(contact) }, "POST");
      return json(200, gas || { ok: false, error: "gas_failed" });
    }

    if (action === "wa_import_contacts") {
      const site = String(body.site || body.siteSlug || "");
      const pin = String(body.pin || body.vipPin || "");
      const contacts = Array.isArray(body.contacts) ? body.contacts : [];
      const gas = await callGAS("wa_import_contacts", { site, pin, contacts: JSON.stringify(contacts) }, "POST");
      return json(200, gas || { ok: false, error: "gas_failed" });
    }

    /* ========= PROXY GENÉRICO PARA TODAS AS OUTRAS ACTIONS ========= */
    // Se chegou aqui, repassa a action direto pro GAS com todo o body
    // Isso garante que TODAS as actions funcionem sem precisar mapear uma por uma
    if (action) {
      console.log(`[client-api] Proxying generic action: ${action}`);
      const gas = await callGAS(action, body, "POST");
      return json(200, gas || { ok: false, error: "gas_failed" });
    }

    /* -------------------------------------------------- */
    return json(400, { ok: false, error: "no_action_provided" });
  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
};
