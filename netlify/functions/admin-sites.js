// netlify/functions/admin-sites.js
// Lista sites para o dashboard administrativo

const GAS_BASE_URL = process.env.GAS_BASE_URL || process.env.ELEVEA_GAS_EXEC_URL || process.env.SHEETS_WEBAPP_URL || "";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-elevea-internal",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  };
}

export const handler = async (event) => {
  const headers = cors();

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
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
    // Buscar lista de sites do GAS
    const r = await fetch(`${GAS_BASE_URL}?type=sites&nc=${Date.now()}`, {
      cache: "no-store",
    });
    
    if (!r.ok) {
      throw new Error(`GAS sites endpoint failed: ${r.status}`);
    }
    
    const data = await r.json();
    const sites = data?.siteSlugs || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        siteSlugs: sites,
        total: sites.length
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        ok: false, 
        error: `admin-sites error: ${e && e.message ? e.message : String(e)}` 
      }),
    };
  }
};
