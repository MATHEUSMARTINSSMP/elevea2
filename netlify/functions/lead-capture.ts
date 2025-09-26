import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const GAS_BASE_URL = process.env.GAS_BASE_URL || "";

interface LeadSubmission {
  siteSlug: string;
  name: string;
  email: string;
  phone: string;
  source?: string;
  extra?: string;
}

interface GasResponse {
  ok: boolean;
  error?: string;
  id?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: 'method_not_allowed' })
    };
  }

  try {
    if (!GAS_BASE_URL) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: 'gas_url_not_configured' })
      };
    }

    const body = JSON.parse(event.body || '{}') as LeadSubmission;

    // Validação básica
    const errors: string[] = [];
    if (!body.siteSlug?.trim()) errors.push('site_slug_required');
    if (!body.name?.trim()) errors.push('name_required');
    if (!body.email?.trim()) errors.push('email_required');
    if (!body.phone?.trim()) errors.push('phone_required');

    // Validação de email simples
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.push('invalid_email_format');
    }

    if (errors.length > 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, errors })
      };
    }

    // Preparar dados para o GAS
    const gasPayload = {
      type: 'lead_new',
      site: body.siteSlug.trim(),
      siteSlug: body.siteSlug.trim(),
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      source: body.source?.trim() || 'website',
      extra: body.extra?.trim() || ''
    };

    console.log('Sending lead to GAS:', { siteSlug: gasPayload.site, name: gasPayload.name });

    // Chamar o Google Apps Script
    const gasResponse = await fetch(GAS_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gasPayload)
    });

    if (!gasResponse.ok) {
      console.error('GAS HTTP error:', gasResponse.status, gasResponse.statusText);
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ 
          ok: false, 
          error: 'backend_unavailable',
          details: `GAS returned ${gasResponse.status}`
        })
      };
    }

    const gasResult: GasResponse = await gasResponse.json();

    if (gasResult.ok) {
      console.log('Lead created successfully:', { siteSlug: body.siteSlug, id: gasResult.id });
      
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: true,
          message: 'lead_created_successfully',
          id: gasResult.id
        })
      };
    } else {
      console.error('GAS business error:', gasResult.error);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: gasResult.error || 'backend_error'
        })
      };
    }

  } catch (error: any) {
    console.error('Lead capture error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: 'internal_server_error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

export { handler };