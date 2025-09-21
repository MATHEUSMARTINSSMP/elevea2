import type { Handler } from '@netlify/functions'
import { generateSupportResponse } from '../../src/lib/openai'

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
    const { message, businessType, businessName, context, history } = body

    if (!message?.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Mensagem é obrigatória' })
      }
    }

    // Construir contexto mais rico com histórico
    const contextWithHistory = [
      context || `Suporte para ${businessName || 'negócio'} (${businessType || 'geral'})`,
      history && history.length > 0 
        ? `\nHistórico da conversa:\n${history.slice(-3).map((h: any) => `${h.type === 'user' ? 'Cliente' : 'Assistente'}: ${h.content}`).join('\n')}`
        : ''
    ].filter(Boolean).join('\n')

    // Gerar resposta usando OpenAI
    const response = await generateSupportResponse(
      message,
      contextWithHistory,
      businessType || 'geral'
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        response,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Erro no AI Chat:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor',
        response: 'Desculpe, houve um erro temporário. Nossa equipe já foi notificada. Tente novamente em alguns minutos.'
      })
    }
  }
}