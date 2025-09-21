import type { Handler } from '@netlify/functions'
import { generateMarketingEmail } from '../../src/lib/openai'

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
    const { emailType, businessData } = body

    if (!emailType || !businessData?.name?.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Tipo de email e nome do negócio são obrigatórios' 
        })
      }
    }

    const emailContent = await generateMarketingEmail(emailType, businessData)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        email: emailContent,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Erro na geração de email:', error)
    
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