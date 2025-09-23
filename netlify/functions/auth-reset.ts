import type { Handler } from '@netlify/functions';

const GAS = process.env.GAS_BASE_URL || process.env.ELEVEA_GAS_EXEC_URL;

function cors(headers: Record<string,string> = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-elevea-internal',
    ...headers
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors() };
  }

  if (!GAS) {
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ ok:false, error:'missing_GAS_BASE_URL' })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const email = String(body.email || '').trim();
    const type  = body.type || 'password_reset_request';

    if (!email) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ ok:false, error:'missing_email' }) };
    }

    const res = await fetch(GAS, {
      method: 'POST',
      headers: { 'content-type':'application/json' },
      body: JSON.stringify({ type, email })
    });

    const out = await res.text();
    return { statusCode: 200, headers: cors(), body: out };
  } catch (e:any) {
    return { statusCode: 502, headers: cors(), body: JSON.stringify({ ok:false, error:String(e?.message||e) }) };
  }
};
