// netlify/functions/admin-toggle.js
// Toggle manual de bloqueio de sites (admin)

const GAS_BASE_URL = process.env.GAS_BASE_URL || process.env.ELEVEA_GAS_EXEC_URL || process.env.SHEETS_WEBAPP_URL || "";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-elevea-internal",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  };
}

function json(body, status = 200, extra = {}) {
  return {
    statusCode: status,
    headers: { ...cors(), ...extra },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (!GAS_BASE_URL) {
    return json({ ok: false, error: "missing_GAS_BASE_URL" }, 500);
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { action, siteSlug, block } = body;

    if (action !== "manual-block") {
      return json({ ok: false, error: "invalid_action" }, 400);
    }

    if (!siteSlug) {
      return json({ ok: false, error: "missing_siteSlug" }, 400);
    }

    const adminDashToken = process.env.ADMIN_DASH_TOKEN || process.env.ADMIN_TOKEN || "";
    if (!adminDashToken) {
      return json({ ok: false, error: "missing_admin_token" }, 500);
    }

    // Chamar GAS com GET e parâmetros na URL
    const params = new URLSearchParams({
      type: "admin_set",
      token: adminDashToken,
      site: siteSlug,
      manualBlock: block ? "1" : "0"
    });
    
    const resG = await fetch(`${GAS_BASE_URL}?${params}`, {
      method: "GET",
      headers: { "content-type": "application/json" },
    });

    const textG = await resG.text();
    let gasRespPayload = null;
    try { 
      gasRespPayload = JSON.parse(textG); 
    } catch { 
      gasRespPayload = { raw: textG }; 
    }

    if (!resG.ok) {
      return json({
        ok: false,
        error: "gas_upstream_error",
        gas_status: resG.status,
        gas_response: gasRespPayload
      }, 502);
    }

    return json({
      ok: true,
      siteSlug: siteSlug,
      manualBlock: !!block,
      gas_response: gasRespPayload
    });

  } catch (e) {
    return json({
      ok: false,
      error: "internal_error",
      details: String(e)
    }, 500);
  }
};
