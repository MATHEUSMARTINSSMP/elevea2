import type { Handler } from '@netlify/functions'
import { analyzeFeedbackSentiment } from '../../src/lib/openai'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const { feedback, clientName, batch } = body

    // Suporta análise individual ou em lote
    if (batch && Array.isArray(batch)) {
      const results = []
      
      for (const item of batch) {
        if (!item.feedback?.trim()) continue
        
        try {
          const analysis = await analyzeFeedbackSentiment(
            item.feedback,
            item.clientName || item.name
          )
          results.push({
            id: item.id,
            analysis,
            success: true
          })
        } catch (error) {
          results.push({
            id: item.id,
            analysis: null,
            success: false,
            error: error.message
          })
        }
        
        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          results,
          processed: results.length
        })
      }
    }

    // Análise individual
    if (!feedback?.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Feedback é obrigatório' })
      }
    }

    const analysis = await analyzeFeedbackSentiment(feedback, clientName)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        analysis,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Erro na análise de sentimento:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor'
      })
    }
  }
}