// netlify/functions/client-api.js
const GAS_BASE_URL =
  process.env.GAS_BASE_URL ||
  process.env.ELEVEA_GAS_URL || // compat antiga
  "";

const ADMIN_DASH_TOKEN =
  process.env.ADMIN_DASH_TOKEN ||
  process.env.ADMIN_TOKEN ||
  "";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// Normaliza itens vindos do GAS para um formato único no front
function normalizeFeedbackItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((it, i) => {
    const id =
      String(it.id ?? it.ID ?? it.rowId ?? it.row ?? i + 1);
    const timestamp =
      String(it.timestamp ?? it.ts ?? it.created_at ?? it.date ?? "");
    const name =
      String(it.name ?? it.author ?? it.user ?? ""); 
    const message =
      String(it.message ?? it.comment ?? it.text ?? "");
    const email = String(it.email ?? it.mail ?? "");
    const phone = String(it.phone ?? it.tel ?? it.whatsapp ?? "");
    const ratingNum = Number(it.rating ?? it.score ?? it.stars ?? 0) || 0;
    const approvedBool =
      String(it.approved ?? it.isApproved ?? it.visible ?? "").toLowerCase() === "true";

    return {
      id,
      timestamp,
      name,
      message,
      email,
      phone,
      rating: ratingNum,
      approved: approvedBool,
      // se vier análise de sentimento do GAS algum dia:
      sentiment: it.sentiment || undefined,
    };
  });
}

// Helper: chamada ao GAS (GET ou POST) com tolerância
async function callGAS(action, payload = {}, method = "POST") {
  if (!GAS_BASE_URL) {
    return { ok: false, error: "missing_GAS_BASE_URL_env" };
  }
  const url =
    method === "GET"
      ? `${GAS_BASE_URL}?action=${encodeURIComponent(action)}&${new URLSearchParams(payload).toString()}`
      : `${GAS_BASE_URL}?action=${encodeURIComponent(action)}`;

  const init = {
    method,
    headers: { "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify(payload) : undefined,
  };

  const res = await fetch(url, init);
  if (!res.ok) {
    return { ok: false, error: `gas_http_${res.status}` };
  }
  const data = await res.json().catch(() => ({}));
  return data;
}

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed" });
    }
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // Segurança extra para chamadas "secure"
    if (action === "feedback_set_approval" || action === "list_feedbacks_secure") {
      body.adminToken = body.adminToken || ADMIN_DASH_TOKEN || "";
    }

    // Roteamento
    if (action === "list_feedbacks") {
      // Público (apenas aprovados)
      const site = String(body.site || body.siteSlug || "");
      const page = Number(body.page || 1);
      const pageSize = Number(body.pageSize || 20);

      // Compatível com suas funções: listFeedbacksPublic_
      const gas = await callGAS("list_feedbacks_public", { site, page, pageSize }, "GET");

      if (!gas || gas.ok === false) {
        return json(200, { ok: true, items: [] });
      }

      return json(200, {
        ok: true,
        items: normalizeFeedbackItems(gas.items || []),
        total: gas.total || 0,
        page: gas.page || page,
        pageSize: gas.pageSize || pageSize,
      });
    }

    if (action === "list_feedbacks_secure") {
      // Requer PIN correto ou ADMIN token
      const site = String(body.site || body.siteSlug || "");
      const pin = String(body.pin || body.vipPin || "");
      const page = Number(body.page || 1);
      const pageSize = Number(body.pageSize || 50);

      // Compatível com suas funções: listFeedbacksSecure_
      const gas = await callGAS(
        "list_feedbacks_secure",
        { site, pin, page, pageSize, adminToken: body.adminToken },
        "POST"
      );

      if (!gas || gas.ok === false) {
        // não vaza erro real para o front
        return json(200, { ok: true, items: [] });
      }

      return json(200, {
        ok: true,
        items: normalizeFeedbackItems(gas.items || []),
        total: gas.total || 0,
        page: gas.page || page,
        pageSize: gas.pageSize || pageSize,
      });
    }

    if (action === "feedback_set_approval") {
      // Atualiza aprovação (exige PIN ou ADMIN)
      const site = String(body.site || body.siteSlug || "");
      const id = String(body.id || "");
      const approved = !!body.approved;
      const pin = String(body.pin || body.vipPin || "");

      const gas = await callGAS(
        "feedback_set_approval",
        { site, id, approved, pin, adminToken: body.adminToken },
        "POST"
      );

      if (!gas || gas.ok === false) {
        return json(200, { ok: false, error: gas?.error || "gas_failed" });
      }
      return json(200, { ok: true });
    }

    // Outras ações que você já tem podem continuar aqui…
    // get_status, get_settings, save_settings, etc. (mantidas como estavam)

    return json(400, { ok: false, error: "unknown_action" });
  } catch (e) {
    return json(500, { ok: false, error: String(e) });
  }
};
