// netlify/functions/gmb-oauth-exchange.js
const CLIENT_ID = process.env.GMB_CLIENT_ID;
const CLIENT_SECRET = process.env.GMB_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMB_REDIRECT_URI;
const GAS_BASE_URL = process.env.GAS_BASE_URL;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function callGAS(action, payload) {
  const res = await fetch(`${GAS_BASE_URL}?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok ? res.json() : { ok:false, error:`gas_http_${res.status}` };
}

export default async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Validar variáveis de ambiente
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !GAS_BASE_URL) {
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Configuração OAuth incompleta. Verifique as variáveis de ambiente.' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const url = new URL(req.url);
    const code = String(url.searchParams.get('code') || '').trim();
    const stateStr = String(url.searchParams.get('state') || '').trim();
    const error = url.searchParams.get('error');
    
    // Verificar se houve erro do Google
    if (error) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: `Erro do Google: ${error}` 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (!code || code.length < 10) {
      return new Response(JSON.stringify({ ok: false, error: 'Código de autorização inválido' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (!stateStr || stateStr.length < 10) {
      return new Response(JSON.stringify({ ok: false, error: 'State inválido' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(stateStr, 'base64url').toString('utf8'));
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'State corrompido' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { site, email } = stateData;

    if (!site || !email || site.length < 2 || !email.includes('@')) {
      return new Response(JSON.stringify({ ok: false, error: 'Dados de state inválidos' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Troca code -> tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, grant_type: 'authorization_code'
      }).toString(),
    });
    const tokens = await tokenRes.json();

    if (!tokenRes.ok || !tokens.access_token) {
      return new Response(JSON.stringify({ ok:false, error:'token_exchange_failed', detail:tokens }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Salva no GAS (planilha settings_kv), por site/email
    const saved = await callGAS('gmb_save_credentials', { site, email, tokens });
    if (saved?.ok !== true) {
      return new Response(JSON.stringify({ ok:false, error:'gas_save_failed', detail:saved }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Redireciona de volta ao dashboard do cliente
    return new Response(null, {
      status: 302,
      headers: { 
        Location: `/client/dashboard?gmb=ok&site=${encodeURIComponent(site)}`,
        ...corsHeaders
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
