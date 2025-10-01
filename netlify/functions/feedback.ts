import type { Handler } from '@netlify/functions'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    }
  }

  try {
    const body = event.httpMethod === 'POST' ? JSON.parse(event.body || '{}') : {}
    const { action, siteSlug, vipPin, ...data } = body

    // Para GET requests (feedbacks públicos), extrair da query string
    const queryParams = event.queryStringParameters || {}
    const getAction = queryParams.action || 'get_public'
    const getSiteSlug = queryParams.site || siteSlug

    // Validação básica
    if (!getSiteSlug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Site é obrigatório' 
        })
      }
    }

    // Para ações que requerem autenticação VIP
    if (['list', 'approve', 'reject'].includes(action)) {
      if (!vipPin) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: 'PIN VIP é obrigatório para esta ação' 
          })
        }
      }

      // Verificar se o PIN VIP está correto
      try {
        const gasUrl = process.env.GAS_BASE_URL || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
        const validateResponse = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: 'client_api', 
            action: 'validate_vip_pin', 
            site: getSiteSlug, 
            pin: vipPin 
          })
        })
        
        if (!validateResponse.ok) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ ok: false, error: 'Erro interno: falha na validação' })
          }
        }
        
        const validateData = await validateResponse.json()
        if (!validateData.ok) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ ok: false, error: 'PIN VIP inválido' })
          }
        }
      } catch (error) {
        console.error('Erro ao verificar PIN VIP:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ ok: false, error: 'Erro interno do servidor' })
        }
      }
    }

    // Chamar GAS
    const gasUrl = process.env.GAS_BASE_URL || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
    
    let gasPayload: any = {
      type: 'feedback',
      site: getSiteSlug,
      ...data
    }

    // Para GET requests, usar query params
    if (event.httpMethod === 'GET') {
      gasPayload.action = getAction
    } else {
      gasPayload.action = action
      gasPayload.pin = vipPin
    }

    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gasPayload)
    })
    
    if (!response.ok) {
      throw new Error(`GAS request failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.ok) {
      throw new Error(result.error || 'Erro ao processar feedback')
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        data: result.data
      })
    }

  } catch (error) {
    console.error('Erro na API de feedback:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}
