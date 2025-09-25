// netlify/functions/client-plan.ts
import type { Handler } from "@netlify/functions";

/** === CORS padrão === */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization",
  "content-type": "application/json",
} as const;

const norm = (s?: string | null) => String(s ?? "").trim().toLowerCase();
const looksVip = (p?: string | null) => !!p && (norm(p) === "vip" || norm(p).includes("vip"));
const isActiveStatus = (s?: string | null) =>
  ["approved", "authorized", "active", "processing", "in_process", "charged", "authorized_pending_capture"]
    .includes(norm(s));

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS, body: "" };
    }
    if (event.httpMethod !== "GET") {
      return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "method_not_allowed" }) };
    }

    const qs = event.queryStringParameters || {};
    const site = String(qs.site || "").trim();
    // email AGORA É OPCIONAL — não usaremos para falhar

    if (!site) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "missing_site" }) };
    }

    // Chamamos o próprio auth-status para unificar a fonte da verdade.
    const host = event.headers["x-forwarded-host"] || event.headers.host;
    const proto = (event.headers["x-forwarded-proto"] || "https");
    const base = `${proto}://${host}`;
    const url = `${base}/.netlify/functions/auth-status?site=${encodeURIComponent(site)}`;

    const resp = await fetch(url, {
      headers: {
        // repassa cookies da sessão (importantíssimo)
        cookie: event.headers.cookie || ""
      },
    });

    const txt = await resp.text();
    let data: any = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch { data = { ok: false, raw: txt }; }

    if (!resp.ok || data?.ok === false) {
      // devolve algo compatível, sem 400 (para não quebrar o dashboard)
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: data?.error || "upstream_error" })
      };
    }

    // Normalização de campos esperados pelo dashboard
    const plan: string | null = data.plan ?? null;
    const status: string | null = data.status ?? null;
    const lastPayment: { date: string; amount?: number } | null = data.lastPayment ?? null;
    
    // 🎯 CORREÇÃO: Prioriza nextCharge, fallback para nextPayment, senão calcula
    let nextCharge: string | null = data.nextCharge ?? data.nextPayment ?? null;
    
    // Se não tem próxima cobrança, calcula baseado no último pagamento
    if (!nextCharge && lastPayment?.date) {
      try {
        const lastDate = new Date(lastPayment.date);
        if (!isNaN(lastDate.getTime())) {
          const nextDate = new Date(lastDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextCharge = nextDate.toISOString();
        }
      } catch (e) {
        console.error('Erro ao calcular próxima cobrança:', e);
      }
    }
    
    // Manter compatibilidade com nextPayment também
    const nextPayment: string | null = nextCharge;

    // 🔧 CORREÇÃO VIP: Também verifica se tem vipPin configurado
    let vip = looksVip(plan) || isActiveStatus(status);
    
    // Se não é VIP pelas regras tradicionais, verifica se tem PIN VIP configurado
    if (!vip) {
      try {
        // Chama client-api para verificar se há vipPin configurado
        const settingsResp = await fetch(`${base}/.netlify/functions/client-api?action=get_settings&site=${encodeURIComponent(site)}`, {
          headers: { cookie: event.headers.cookie || "" }
        });
        
        if (settingsResp.ok) {
          const settingsData = await settingsResp.json();
          // Se tem vipPin configurado, considera VIP
          if (settingsData.settings?.vipPin) {
            vip = true;
            console.log(`🎯 VIP detectado via PIN para site: ${site}`);
          }
        }
      } catch (e) {
        console.warn('Erro ao verificar vipPin:', e);
        // Não falha - apenas não considera VIP por PIN
      }
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        plan: vip && !looksVip(plan) ? "vip" : plan, // ← Força plan=vip se detectado por PIN
        status,
        nextPayment,      // ← Compatibilidade com código antigo
        nextCharge,       // ← Campo que Dashboard espera
        lastPayment,
        vip,
      }),
    };
  } catch (e: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: String(e?.message || e) }) };
  }
};

export default handler;
