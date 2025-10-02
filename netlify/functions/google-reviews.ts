import type { Handler } from '@netlify/functions'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { action, siteSlug, vipPin } = body

    // Validação básica
    if (!siteSlug || !vipPin) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Site e PIN VIP são obrigatórios' 
        })
      }
    }

    // TEMPORARIAMENTE DESABILITADO PARA TESTE DO OAUTH
    console.log(`⚠️ VIP PIN validation DISABLED for testing: ${siteSlug}, pin: ${vipPin}`);
    
    // TODO: Reabilitar após corrigir fluxo OAuth
    // try {
    //   const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8080'
    //   const settingsResponse = await fetch(`${baseUrl}/.netlify/functions/client-api`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ action: 'get_settings', siteSlug })
    //   })
    //   
    //   if (!settingsResponse.ok) {
    //     console.error('Falha ao verificar settings:', settingsResponse.status)
    //     return {
    //       statusCode: 500,
    //       headers,
    //       body: JSON.stringify({ ok: false, error: 'Erro interno: falha na validação' })
    //     }
    //   }
    //   
    //   const settingsData = await settingsResponse.json()
    //   if (!settingsData.settings || settingsData.settings.vipPin !== vipPin) {
    //     return {
    //       statusCode: 401,
    //       headers,
    //       body: JSON.stringify({ ok: false, error: 'PIN VIP inválido' })
    //     }
    //   }
    // } catch (error) {
    //   console.error('Erro ao verificar PIN VIP:', error)
    //   return {
    //     statusCode: 500,
    //     headers,
    //     body: JSON.stringify({ ok: false, error: 'Erro interno do servidor' })
    //   }
    // }

    // Verificar se o plano é VIP
    try {
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8080'
      const planResponse = await fetch(`${baseUrl}/.netlify/functions/client-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug })
      })
      
      if (!planResponse.ok) {
        console.error('Falha ao verificar plano:', planResponse.status)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ ok: false, error: 'Erro interno: falha na verificação do plano' })
        }
      }
      
      const planData = await planResponse.json()
      if (!planData.ok || planData.plan !== 'vip') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ ok: false, error: 'Acesso negado: plano VIP necessário' })
        }
      }
    } catch (error) {
      console.error('Erro ao verificar plano:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Erro interno do servidor' })
      }
    }

    switch (action) {
      case 'get_reviews':
        return await getGoogleReviews(siteSlug, vipPin)
      
      case 'sync_reviews':
        return await syncGoogleReviews(siteSlug, vipPin)
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: 'Ação inválida' 
          })
        }
    }

  } catch (error) {
    console.error('Erro na API de reviews:', error)
    
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

async function getGoogleReviews(siteSlug: string, vipPin: string) {
  try {
    // Chamar GAS para buscar reviews
    const gasUrl = process.env.GAS_BASE_URL || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
    
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'google_reviews',
        action: 'get_reviews',
        site: siteSlug,
        pin: vipPin
      })
    })
    
    if (!response.ok) {
      throw new Error(`GAS request failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.ok) {
      throw new Error(result.error || 'Erro ao buscar reviews do GAS')
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
    console.error('Erro ao buscar reviews:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno ao buscar reviews',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

async function syncGoogleReviews(siteSlug: string, vipPin: string) {
  try {
    // Chamar GAS para sincronizar reviews
    const gasUrl = process.env.GAS_BASE_URL || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
    
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'google_reviews',
        action: 'sync_reviews',
        site: siteSlug,
        pin: vipPin
      })
    })
    
    if (!response.ok) {
      throw new Error(`GAS request failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.ok) {
      throw new Error(result.error || 'Erro ao sincronizar reviews do GAS')
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        data: result.data,
        message: 'Reviews sincronizados com sucesso'
      })
    }
  } catch (error) {
    console.error('Erro ao sincronizar reviews:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno ao sincronizar reviews',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

// Função auxiliar para integração real com Google My Business API
// async function fetchGoogleBusinessReviews(placeId: string) {
//   const apiKey = process.env.GOOGLE_PLACES_API_KEY
//   
//   if (!apiKey) {
//     throw new Error('Google Places API key não configurada')
//   }
//
//   const response = await fetch(
//     `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${apiKey}`
//   )
//
//   if (!response.ok) {
//     throw new Error('Falha ao buscar dados do Google Places')
//   }
//
//   const data = await response.json()
//   
//   if (data.status !== 'OK') {
//     throw new Error(`Google Places API erro: ${data.status}`)
//   }
//
//   return {
//     reviews: data.result.reviews || [],
//     averageRating: data.result.rating || 0,
//     totalReviews: data.result.user_ratings_total || 0
//   }
// }