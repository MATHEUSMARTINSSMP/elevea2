import type { Handler } from '@netlify/functions'
import { rateLimitMiddleware, verifyVipAccess } from './shared/security'
import crypto from 'crypto'

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

  try {
    if (event.httpMethod === 'GET') {
      // Verificação do webhook do WhatsApp Business
      const { queryStringParameters } = event
      const mode = queryStringParameters?.['hub.mode']
      const token = queryStringParameters?.['hub.verify_token']
      const challenge = queryStringParameters?.['hub.challenge']

      if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log('WhatsApp webhook verificado com sucesso')
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: challenge || ''
        }
      } else {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Token de verificação inválido' })
        }
      }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      
      // Processar mensagens recebidas do WhatsApp Business API
      if (body.object === 'whatsapp_business_account') {
        // Verificar assinatura do webhook para segurança (só em produção)
        if (process.env.WHATSAPP_APP_SECRET) {
          const signature = event.headers['x-hub-signature-256']
          if (!verifyWebhookSignature(event.body || '', signature)) {
            console.warn('Webhook signature inválida ou ausente')
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({ error: 'Signature inválida ou ausente' })
            }
          }
        }
        
        // Processar mensagens recebidas
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              const messages = change.value?.messages || []
              for (const message of messages) {
                // Processar cada mensagem automaticamente
                await processIncomingMessage(message, 'default_site') // TODO: determinar siteSlug real
              }
            }
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true })
        }
      }

      // API para envio de mensagens (uso interno)
      // Verificar rate limiting para APIs internas
      await rateLimitMiddleware('whatsapp-webhook', event)
      
      const { action, siteSlug, vipPin, phoneNumber, message, templateName } = body

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

      // Verificar acesso VIP
      const isVipValid = await verifyVipAccess(siteSlug, vipPin)
      if (!isVipValid) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ ok: false, error: 'Acesso VIP inválido' })
        }
      }

      switch (action) {
        case 'send_message':
          return await sendWhatsAppMessage(phoneNumber, message, siteSlug)
        
        case 'send_template':
          return await sendWhatsAppTemplate(phoneNumber, templateName, siteSlug)
        
        case 'get_conversations':
          return await getConversations(siteSlug)
        
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ ok: false, error: 'Ação inválida' })
          }
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Erro no WhatsApp webhook:', error)
    
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


function generateAutoResponse(messageText: string): { text: string; type: string } | null {
  const text = messageText.toLowerCase()

  // Respostas automáticas baseadas em keywords
  const responses = [
    {
      keywords: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite'],
      response: '👋 Olá! Obrigado por entrar em contato. Como posso ajudá-lo hoje?\n\nDigite:\n• *1* - Informações sobre serviços\n• *2* - Solicitar orçamento\n• *3* - Falar com atendente',
      type: 'greeting'
    },
    {
      keywords: ['1', 'serviços', 'serviço', 'informações'],
      response: '📋 *Nossos Serviços:*\n\n✅ Desenvolvimento de Sites\n✅ Marketing Digital\n✅ SEO e Google Ads\n✅ Redes Sociais\n✅ E-commerce\n\nGostaria de saber mais sobre algum serviço específico?',
      type: 'services'
    },
    {
      keywords: ['2', 'orçamento', 'preço', 'valor', 'quanto custa'],
      response: '💰 *Solicitar Orçamento*\n\nPara enviar um orçamento personalizado, preciso de algumas informações:\n\n• Qual serviço te interessa?\n• Qual seu nome?\n• Nome da empresa/negócio?\n\nUm atendente entrará em contato em breve!',
      type: 'budget'
    },
    {
      keywords: ['3', 'atendente', 'humano', 'pessoa'],
      response: '👨‍💼 Em breve um atendente entrará em contato com você!\n\nHorário de atendimento:\n🕐 Segunda a Sexta: 9h às 18h\n🕐 Sábado: 9h às 12h\n\nObrigado pela preferência!',
      type: 'human'
    },
    {
      keywords: ['obrigado', 'obrigada', 'valeu', 'tchau', 'até logo'],
      response: '😊 Foi um prazer ajudar! Estamos sempre à disposição.\n\nSiga-nos nas redes sociais para dicas e novidades:\n• Instagram: @agenciaelevea\n• Site: elevea.agencia',
      type: 'goodbye'
    }
  ]

  for (const resp of responses) {
    if (resp.keywords.some(keyword => text.includes(keyword))) {
      return { text: resp.response, type: resp.type }
    }
  }

  // Resposta padrão para mensagens não reconhecidas
  return {
    text: '🤔 Não entendi sua mensagem. Posso ajudá-lo com:\n\n• *1* - Informações sobre serviços\n• *2* - Solicitar orçamento\n• *3* - Falar com atendente\n\nOu digite sua dúvida diretamente.',
    type: 'default'
  }
}

async function sendWhatsAppMessage(phoneNumber: string, message: string, siteSlug: string) {
  try {
    const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!whatsappToken || !whatsappPhoneId) {
      console.warn('⚠️ Credenciais WhatsApp não configuradas - usando modo desenvolvimento')
      
      // Salvar mensagem no Google Sheets mesmo em modo desenvolvimento
      await saveConversationToSheets(siteSlug, {
        phoneNumber: normalizePhoneNumber(phoneNumber),
        contactName: 'Contato',
        message,
        messageType: 'sent',
        messageId: `dev_${Date.now()}`,
        status: 'sent',
        isFromBot: false
      })
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          messageId: `dev_msg_${Date.now()}`,
          status: 'sent_dev_mode',
          note: 'Modo desenvolvimento - configure WHATSAPP_ACCESS_TOKEN para produção'
        })
      }
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: message
        }
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${result.error?.message || 'Unknown error'}`)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        messageId: result.messages?.[0]?.id,
        status: 'sent'
      })
    }

  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: error.message
      })
    }
  }
}

async function sendWhatsAppTemplate(phoneNumber: string, templateName: string, siteSlug: string) {
  try {
    const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

    const templates = {
      welcome: {
        name: 'welcome_message',
        language: { code: 'pt_BR' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: siteSlug }
            ]
          }
        ]
      },
      followup: {
        name: 'followup_message',
        language: { code: 'pt_BR' },
        components: []
      }
    }

    const template = templates[templateName as keyof typeof templates]
    if (!template) {
      throw new Error('Template não encontrado')
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${result.error?.message || 'Unknown error'}`)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        messageId: result.messages?.[0]?.id,
        status: 'sent'
      })
    }

  } catch (error) {
    console.error('Erro ao enviar template WhatsApp:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: error.message
      })
    }
  }
}


async function getConversations(siteSlug: string) {
  try {
    // Buscar conversações reais do Google Sheets
    const conversations = await getConversationsFromSheets(siteSlug)
    
    if (conversations && conversations.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          conversations: conversations.slice(0, 50) // Últimas 50 conversas
        })
      }
    }
    
    // Fallback para dados mock se não há dados no sheets
    const mockConversations = [
      {
        id: 'mock_1',
        phoneNumber: '+5596991234567',
        contactName: 'Maria Silva',
        message: 'Olá! Gostaria de saber mais sobre seus serviços.',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'received'
      },
      {
        id: 'mock_2',
        phoneNumber: '+5596991234567', 
        contactName: 'Sistema',
        message: '👋 Olá! Obrigado por entrar em contato. Como posso ajudá-lo hoje?',
        timestamp: new Date(Date.now() - 290000).toISOString(),
        type: 'auto_response',
        status: 'delivered'
      }
    ]

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        conversations: mockConversations,
        note: 'Dados exemplo - configure Google Sheets para dados reais'
      })
    }
  } catch (error) {
    console.error('Erro ao buscar conversações:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro ao buscar conversações'
      })
    }
  }
}

async function notifyVipAdmins(messageData: any) {
  // Notificar administradores VIP sobre nova mensagem
  console.log('Notificando admins VIP:', messageData)
  // TODO: Implementar notificação real
}

// Funções de integração com Google Sheets
async function saveConversationToSheets(siteSlug: string, conversationData: any) {
  try {
    const gasUrl = process.env.GAS_BASE_URL
    if (!gasUrl) {
      console.warn('GAS_BASE_URL não configurada - salvamento de conversa pulado')
      return false
    }

    const response = await fetch(`${gasUrl}?action=save_whatsapp_conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteSlug,
        conversation: {
          ...conversationData,
          id: conversationData.messageId || `msg_${Date.now()}`,
          timestamp: new Date().toISOString()
        }
      })
    })

    if (!response.ok) {
      console.warn('Erro ao salvar conversa no Google Sheets:', response.statusText)
      return false
    }

    console.log('✅ Conversa WhatsApp salva no Google Sheets')
    return true
  } catch (error) {
    console.error('Erro ao salvar conversa WhatsApp:', error)
    return false
  }
}

async function getConversationsFromSheets(siteSlug: string) {
  try {
    const gasUrl = process.env.GAS_BASE_URL
    if (!gasUrl) {
      console.warn('GAS_BASE_URL não configurada - busca de conversas pulada')
      return []
    }

    const response = await fetch(`${gasUrl}?action=get_whatsapp_conversations&siteSlug=${siteSlug}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      console.warn('Erro ao buscar conversas do Google Sheets:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.conversations || []
  } catch (error) {
    console.error('Erro ao buscar conversas WhatsApp:', error)
    return []
  }
}

function normalizePhoneNumber(phone: string): string {
  // Remove todos os caracteres não numéricos
  let normalized = phone.replace(/\D/g, '')
  
  // Se não tem código do país, assume Brasil (+55)
  if (normalized.length === 11 && normalized.startsWith('9')) {
    normalized = '55' + normalized
  } else if (normalized.length === 10) {
    normalized = '559' + normalized
  }
  
  // Adiciona o + se não tem
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }
  
  return normalized
}

// Verificação de assinatura do webhook WhatsApp
function verifyWebhookSignature(payload: string, signature?: string): boolean {
  if (!signature || !process.env.WHATSAPP_APP_SECRET) {
    return false
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
      .update(payload)
      .digest('hex')

    const receivedSignature = signature.replace('sha256=', '')
    
    // Usar timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    )
  } catch (error) {
    console.error('Erro na verificação de assinatura:', error)
    return false
  }
}

// Processamento inteligente de mensagens WhatsApp
async function processIncomingMessage(messageData: any, siteSlug: string) {
  try {
    const { from, text, timestamp, id } = messageData
    
    // Normalizar número de telefone
    const phoneNumber = normalizePhoneNumber(from)
    
    // Salvar mensagem recebida no Google Sheets
    await saveConversationToSheets(siteSlug, {
      phoneNumber,
      contactName: `Contato ${phoneNumber.slice(-4)}`,
      message: text.body,
      messageType: 'received',
      messageId: id,
      status: 'received',
      isFromBot: false
    })
    
    // Gerar resposta automática
    const autoResponse = generateAutoResponse(text.body)
    
    if (autoResponse) {
      // Enviar resposta automática
      await sendWhatsAppMessage(phoneNumber, autoResponse.text, siteSlug)
      
      // Salvar resposta automática no Google Sheets
      await saveConversationToSheets(siteSlug, {
        phoneNumber,
        contactName: 'Sistema Automático',
        message: autoResponse.text,
        messageType: 'auto_response',
        messageId: `auto_${Date.now()}`,
        status: 'sent',
        isFromBot: true
      })
    }
    
    // Notificar administradores sobre nova mensagem
    await notifyVipAdmins({
      siteSlug,
      phoneNumber,
      message: text.body,
      timestamp: new Date().toISOString()
    })
    
    return true
  } catch (error) {
    console.error('Erro ao processar mensagem WhatsApp:', error)
    return false
  }
}