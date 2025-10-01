// netlify/functions/sheets-proxy.js
// Proxy para o GAS com endpoints administrativos
import { withCors } from './_cors.ts';

const ALLOWED_METHODS = new Set(["GET", "POST"]);

const sheetsProxyHandler = async function (event) {
  if (!ALLOWED_METHODS.has(event.httpMethod)) {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "method_not_allowed" }) };
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
    } else {
      init.body = event.body || "{}";
    }

    const r = await fetch(url, init);
    const text = await r.text();
    const contentType = r.headers.get("content-type") || (text.startsWith("{") ? "application/json" : "text/plain");

    return {
      statusCode: r.status,
      headers: { 
        "content-type": contentType, 
        "Cache-Control": "no-store"
      },
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 502,
      body: JSON.stringify({ ok: false, error: `sheets-proxy error: ${e && e.message ? e.message : String(e)}` }),
    };
  }
};

export const handler = withCors(sheetsProxyHandler);