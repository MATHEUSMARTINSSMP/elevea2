const GAS_BASE_URL =
  process.env.GAS_BASE_URL ||
  process.env.ELEVEA_GAS_URL ||
  "";

const ADMIN_DASH_TOKEN =
  process.env.ADMIN_DASH_TOKEN ||
  process.env.ADMIN_TOKEN ||
  "";

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

// Normaliza itens vindos do GAS para formato único no front
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
    const approvedBool = String(it.approved ?? it.isApproved ?? it.visible ?? "").toLowerCase() === "true";
    return {
      id, timestamp, name, message, email, phone,
      rating: ratingNum, approved: approvedBool,
      sentiment: it.sentiment || undefined,
    };
  });
}

// Chamada ao GAS (GET ou POST)
async function callGAS(action, payload = {}, method = "POST") {
  if (!GAS_BASE_URL) return { ok: false, error: "missing_GAS_BASE_URL_env" };

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
  if (!res.ok) return { ok: false, error: `gas_http_${res.status}` };
  const data = await res.json().catch(() => ({}));
  return data;
}

export default async (req) => {
  try {
    // Preflight CORS
    if (req.method === "OPTIONS") {
      return new Response("", { status: 204 });
    }

    if (req.method !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed" });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // Segurança extra para chamadas "secure"
    if (action === "feedback_set_approval" || action === "list_feedbacks_secure") {
      body.adminToken = body.adminToken || ADMIN_DASH_TOKEN || "";
    }

    // ----- ROTAS -----

    // Público (apenas aprovados)
    if (action === "list_feedbacks") {
      const site = String(body.site || body.siteSlug || "");
      const page = Number(body.page || 1);
      const pageSize = Number(body.pageSize || 20);

      const gas = await callGAS("list_feedbacks_public", { site, page, pageSize }, "GET");
      if (!gas || gas.ok === false) return json(200, { ok: true, items: [] });

      return json(200, {
        ok: true,
        items: normalizeFeedbackItems(gas.items || []),
        total: gas.total || 0,
        page: gas.page || page,
        pageSize: gas.pageSize || pageSize,
      });
    }

    // Privado (PIN/ADMIN) — passa como POST para o GAS
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

      if (!gas || gas.ok === false) return json(200, { ok: true, items: [] });

      return json(200, {
        ok: true,
        items: normalizeFeedbackItems(gas.items || []),
        total: gas.total || 0,
        page: gas.page || page,
        pageSize: gas.pageSize || pageSize,
      });
    }

    // Aprovação (PIN/ADMIN)
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

      if (!gas || gas.ok === false) {
        return json(200, { ok: false, error: gas?.error || "gas_failed" });
      }
      return json(200, { ok: true });
    }

    // NOVA ROTA: criar feedback via proxy
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
      if (!gas || gas.ok === false) return json(200, { ok: false, error: gas?.error || "gas_failed" });
      return json(200, { ok: true });
    }

    // …dentro do handler principal, junto das outras rotas:

// Listar mensagens do WhatsApp (dashboard)
if (action === "wa_list_messages") {
  const site = String(body.site || body.siteSlug || "");
  const page = Number(body.page || 1);
  const pageSize = Number(body.pageSize || 20);

  const gas = await callGAS("wa_list_messages", { site, page, pageSize }, "POST");
  return json(200, gas && gas.ok ? gas : { ok:true, items:[], total:0, page, pageSize });
}

// Enviar texto pelo WhatsApp
if (action === "wa_send_text") {
  const site = String(body.site || body.siteSlug || "");
  const to   = String(body.to || "");
  const text = String(body.text || "");
  const gas = await callGAS("wa_send_text", { site, to, text }, "POST");
  return json(200, gas || { ok:false, error:"gas_failed" });
}

    // Outras ações… (deixe as que você já tem aqui abaixo)

    return json(400, { ok: false, error: "unknown_action" });
  } catch (e) {
    return json(500, { ok: false, error: String(e) });
  }
};
