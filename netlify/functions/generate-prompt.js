// netlify/functions/generate-prompt.js
// Gera prompt do Lovable para um site

const GAS_BASE_URL = process.env.GAS_BASE_URL || process.env.ELEVEA_GAS_EXEC_URL || process.env.SHEETS_WEBAPP_URL || "";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  };
}

exports.handler = async (event) => {
  const headers = cors();

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: "method_not_allowed" }),
    };
  }

  if (!GAS_BASE_URL) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: "missing_GAS_BASE_URL" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const siteSlug = String(body.siteSlug || "").trim().toUpperCase();

    if (!siteSlug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "missing_siteSlug" }),
      };
    }

    const r = await fetch(GAS_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "generate_prompt",
        siteSlug: siteSlug,
      }),
    });

    const j = await r.json().catch(() => ({}));
    return { statusCode: 200, headers, body: JSON.stringify(j) };
  } catch (e) {
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ ok: false, error: String(e) }) 
    };
  }
};
