import type { Handler } from '@netlify/functions'
import { generateSiteContent } from '../../src/lib/openai'

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
    const { businessType, businessName, businessDescription, sections } = body

    if (!businessType?.trim() || !businessName?.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Tipo de negócio e nome são obrigatórios' 
        })
      }
    }

    // Gerar conteúdo para seções específicas se fornecidas, ou para todas as seções padrão
    const content = await generateSiteContent(
      businessType.trim(),
      businessName.trim(),
      businessDescription?.trim()
    )

    // Processar seções específicas se solicitado
    let processedContent = content
    if (sections && Array.isArray(sections) && sections.length > 0) {
      processedContent = content.filter(item => 
        sections.some(section => 
          item.title.toLowerCase().includes(section.toLowerCase()) ||
          section.toLowerCase().includes(item.title.toLowerCase())
        )
      ).slice(0, sections.length)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        content: processedContent,
        generated: processedContent.length,
        timestamp: new Date().toISOString(),
        metadata: {
          businessType,
          businessName,
          businessDescription: businessDescription || null
        }
      })
    }

  } catch (error) {
    console.error('Erro na geração de conteúdo:', error)
    
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