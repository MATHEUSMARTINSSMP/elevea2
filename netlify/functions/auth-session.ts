import type { Handler } from "@netlify/functions";

/** URL base do seu WebApp do GAS (sem /exec). */
const GAS_BASE =
  process.env.ELEVEA_GAS_URL ||
  process.env.ELEVEA_STATUS_URL ||
  "";

/** Headers com capitalização que o Netlify espera */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
} as const;

function ensureExecUrl(u: string) {
  return u && u.includes("/exec") ? u : (u ? u.replace(/\/+$/, "") + "/exec" : "");
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

/** Chama o GAS e normaliza a resposta */
async function postToGas(body: any) {
  const url = ensureExecUrl(GAS_BASE);
  if (!url) throw new Error("missing_gas_url");

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let data: any = {};
  try { data = JSON.parse(text || "{}"); } catch { data = { ok: false, raw: text }; }

  return { ok: resp.ok && data?.ok !== false, status: resp.status, data };
}

/** Extrai a ação de forma à prova de ambiente */
function getAction(event: Parameters<Handler>[0]): string {
  // 1) rawUrl → URLSearchParams
  try {
    if ((event as any).rawUrl) {
      const u = new URL((event as any).rawUrl as string);
      const a = (u.searchParams.get("action") || "").toLowerCase();
      if (a) return a;
    }
  } catch { /* ignore */ }

  // 2) rawQuery → URLSearchParams
  try {
    const rawQuery = (event as any).rawQuery as string | undefined;
    if (rawQuery) {
      const p = new URLSearchParams(rawQuery);
      const a = (p.get("action") || "").toLowerCase();
      if (a) return a;
    }
  } catch { /* ignore */ }

  // 3) queryStringParameters
  const q = (event.queryStringParameters?.action || "").toLowerCase();
  if (q) return q;

  // 4) body.action
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const b = (body.action || "").toLowerCase();
    if (b) return b;
  } catch { /* ignore */ }

  // 5) fallback por método — para não travar fluxo
  if (event.httpMethod === "POST") return "login";
  if (event.httpMethod === "GET")  return "me";

  return "";
}

const handler: Handler = async (event) => {
  try {
    // Preflight
    if (event.httpMethod === "OPTIONS") {
      return new Response("", { status: 204, headers: CORS });
    }

    const action = getAction(event);

    if (!["login", "me", "logout"].includes(action)) {
      return json(400, { ok: false, error: "missing_or_invalid_action" });
    }

    // LOGIN (POST)
    if (action === "login") {
      if (event.httpMethod !== "POST") {
        return json(405, { ok: false, error: "method_not_allowed" });
      }
      const body = event.body ? JSON.parse(event.body) : {};
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "").trim();

      if (!email || !password) {
        return json(400, { ok: false, error: "missing_fields" });
      }

      const r = await postToGas({ type: "user_login", email, password });
      if (!r.ok) {
        return json(401, { ok: false, error: r.data?.error || "invalid_credentials" });
      }

      // opcional: buscar ME após login
      const me = await postToGas({ type: "user_me", email });
      return json(200, { ok: true, user: me.data?.user || { email } });
    }

    // ME (GET ?email=... ou POST {email})
    if (action === "me") {
      let email = "";
      if (event.httpMethod === "GET") {
        email = String(event.queryStringParameters?.email || "").trim().toLowerCase();
      } else {
        const body = event.body ? JSON.parse(event.body) : {};
        email = String(body.email || "").trim().toLowerCase();
      }

      if (!email) {
        // sem sessão server-side ainda; devolve ok:false
        return json(200, { ok: false });
      }

      const r = await postToGas({ type: "user_me", email });
      if (!r.ok) return json(404, { ok: false, error: r.data?.error || "user_not_found" });
      return json(200, { ok: true, user: r.data.user });
    }

    // LOGOUT (stateless)
    if (action === "logout") {
      return json(200, { ok: true });
    }

    return json(400, { ok: false, error: "invalid_action" });
  } catch (e: any) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
};

export default handler;
