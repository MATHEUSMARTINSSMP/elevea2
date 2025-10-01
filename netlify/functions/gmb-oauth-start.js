// netlify/functions/gmb-oauth-start.js
const CLIENT_ID = process.env.GMB_CLIENT_ID;
const REDIRECT_URI = process.env.GMB_REDIRECT_URI;
const SCOPES = (process.env.GMB_SCOPES || '').split(' ').join(' ');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export default async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Validar variáveis de ambiente
  if (!CLIENT_ID || !REDIRECT_URI || !SCOPES) {
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
    const site = String(url.searchParams.get('site') || '').trim();
    const email = String(url.searchParams.get('email') || '').trim();
    
    // Validação mais robusta
    if (!site || site.length < 2) {
      return new Response(JSON.stringify({ ok: false, error: 'Site inválido' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (!email || !email.includes('@') || email.length < 5) {
      return new Response(JSON.stringify({ ok: false, error: 'Email inválido' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

           const stateData = {
             site, email, ts: Date.now(), n: Math.random().toString(36).slice(2)
           };
           const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Salvar state no sessionStorage (via JavaScript)
    // Retornar 302 Redirect direto para Google (sem HTML/JS)
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl.toString(),
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
