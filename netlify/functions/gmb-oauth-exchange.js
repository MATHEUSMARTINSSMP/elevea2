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
    // Aceitar tanto GET (query params) quanto POST (body)
    let code, stateStr, error, site, email;
    
    if (req.method === 'POST') {
      const body = await req.json();
      code = String(body.code || '').trim();
      stateStr = String(body.state || '').trim();
      error = body.error;
      site = String(body.siteSlug || '').trim();
      email = String(body.userEmail || '').trim();
    } else {
      const url = new URL(req.url);
      code = String(url.searchParams.get('code') || '').trim();
      stateStr = String(url.searchParams.get('state') || '').trim();
      error = url.searchParams.get('error');
    }
    
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
      console.error('❌ Código de autorização inválido:', code);
      return new Response(JSON.stringify({ ok: false, error: 'missing_code_or_state', detail: 'Código de autorização inválido' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (!stateStr || stateStr.length < 10) {
      console.error('❌ State inválido:', stateStr);
      return new Response(JSON.stringify({ ok: false, error: 'missing_code_or_state', detail: 'State inválido' }), { 
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

    // Se não vieram do body, extrair do state
    if (!site || !email) {
      site = stateData.site;
      email = stateData.email;
    }

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
        code, 
        client_id: CLIENT_ID, 
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, // Deve ser idêntico ao cadastrado no GCP
        grant_type: 'authorization_code'
      }).toString(),
    });
    const tokens = await tokenRes.json();

    if (!tokenRes.ok || !tokens.access_token) {
      console.error('❌ Falha na troca de tokens:', tokens);
      return new Response(JSON.stringify({ ok:false, error:'oauth_exchange_failed', detail:tokens }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Salva no GAS (planilha settings_kv), por site/email
    console.log('💾 Salvando credenciais no GAS para:', { site, email });
    const saved = await callGAS('gmb_save_credentials', { site, email, tokens });
    if (saved?.ok !== true) {
      console.error('❌ Falha ao salvar credenciais no GAS:', saved);
      return new Response(JSON.stringify({ ok:false, error:'save_credentials_failed', detail:saved }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Credenciais salvas com sucesso no GAS');

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
