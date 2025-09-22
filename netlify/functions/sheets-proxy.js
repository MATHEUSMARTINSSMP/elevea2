// netlify/functions/sheets-proxy.js
// Proxy para o GAS com endpoints administrativos
const ALLOWED_METHODS = new Set(["GET", "POST"]);

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-elevea-internal",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  };
}

export const handler = async function (event) {
  const headers = cors();

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (!ALLOWED_METHODS.has(event.httpMethod)) {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: "method_not_allowed" }) };
  }

  try {
    const gasBase = process.env.GAS_BASE_URL || process.env.ELEVEA_GAS_EXEC_URL || process.env.SHEETS_WEBAPP_URL || "";
    const adminToken = process.env.ADMIN_DASH_TOKEN || process.env.ADMIN_TOKEN || "";
    
    if (!gasBase) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "missing_GAS_BASE_URL" }) };
    }

    // Headers para o GAS
    const gasHeaders = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    };

    // Adicionar token se disponível
    if (adminToken) {
      gasHeaders["X-Admin-Token"] = adminToken;
    }

    let url = gasBase;
    const init = { method: event.httpMethod, headers: gasHeaders };

    if (event.httpMethod === "GET") {
      const qs = event.rawQuery ? `?${event.rawQuery}` : "";
      url = `${gasBase}${qs}`;
    } else if (event.httpMethod === "POST") {
      init.body = event.body;
    }

    const response = await fetch(url, init);
    const data = await response.text();

    return {
      statusCode: response.status,
      headers,
      body: data,
    };

  } catch (error) {
    console.error("Sheets proxy error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: "proxy_error", details: error.message }),
    };
  }
};