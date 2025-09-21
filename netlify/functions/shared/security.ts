// Módulo compartilhado para funções de segurança
import { Handler, HandlerEvent } from '@netlify/functions'

// Interface para dados de rate limiting
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (event: any) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// Storage em memória para rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configurações por endpoint
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'auto-seo': {
    windowMs: 60 * 1000,      // 1 minuto
    maxRequests: 10,          // 10 análises por minuto
    keyGenerator: (event) => `seo:${getClientIdentifier(event)}`
  },
  'lead-scoring': {
    windowMs: 60 * 1000,      // 1 minuto  
    maxRequests: 20,          // 20 scoring por minuto
    keyGenerator: (event) => `leads:${getClientIdentifier(event)}`
  },
  'whatsapp-webhook': {
    windowMs: 10 * 1000,      // 10 segundos
    maxRequests: 50,          // 50 webhooks por 10s
    keyGenerator: (event) => `whatsapp:${getClientIdentifier(event)}`
  },
  'ai-copywriter': {
    windowMs: 60 * 1000,      // 1 minuto
    maxRequests: 15,          // 15 gerações por minuto
    keyGenerator: (event) => `copy:${getClientIdentifier(event)}`
  },
  'white-label': {
    windowMs: 60 * 1000,      // 1 minuto
    maxRequests: 30,          // 30 operações por minuto
    keyGenerator: (event) => `white-label:${getClientIdentifier(event)}`
  },
  'ecommerce': {
    windowMs: 60 * 1000,      // 1 minuto
    maxRequests: 50,          // 50 operações por minuto
    keyGenerator: (event) => `ecommerce:${getClientIdentifier(event)}`
  },
  'template-marketplace': {
    windowMs: 60 * 1000,      // 1 minuto
    maxRequests: 20,          // 20 operações por minuto
    keyGenerator: (event) => `marketplace:${getClientIdentifier(event)}`
  }
}

/**
 * Verificar acesso VIP através do client-api
 */
export async function verifyVipAccess(siteSlug: string, vipPin: string): Promise<boolean> {
  try {
    if (!siteSlug || !vipPin) return false
    
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8080'
    const response = await fetch(`${baseUrl}/.netlify/functions/client-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_settings', siteSlug })
    })

    if (response.ok) {
      const data = await response.json()
      return data.settings?.vipPin === vipPin
    }
    return false
  } catch (error) {
    console.error('Erro ao verificar VIP:', error)
    return false
  }
}

/**
 * Verificar assinatura de webhook WhatsApp
 */
export function verifyWebhookSignature(body: string, signature?: string): boolean {
  try {
    // Em produção, signature é obrigatória
    if (process.env.NODE_ENV === 'production' && !signature) {
      console.warn('Webhook signature missing in production')
      return false
    }
    
    const appSecret = process.env.WHATSAPP_APP_SECRET
    if (!appSecret) {
      console.warn('WHATSAPP_APP_SECRET não configurado')
      return process.env.NODE_ENV === 'development'
    }
    
    if (!signature) {
      return process.env.NODE_ENV === 'development'
    }

    const crypto = require('crypto')
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(body)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Erro na verificação de assinatura:', error)
    return false
  }
}

/**
 * Gerar identificador único do cliente para rate limiting
 */
export function getClientIdentifier(event: HandlerEvent): string {
  try {
    const body = JSON.parse(event.body || '{}')
    const siteSlug = body.siteSlug || 'unknown'
    
    // Obter IP real considerando proxies
    const forwardedFor = event.headers['x-forwarded-for']
    const realIP = event.headers['x-real-ip']
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 
               realIP || 
               event.headers['client-ip'] || 
               'unknown'
    
    return `${siteSlug}:${ip}`
  } catch (error) {
    console.error('Erro ao gerar client identifier:', error)
    return 'unknown:unknown'
  }
}

/**
 * Middleware de rate limiting
 */
export async function rateLimitMiddleware(endpoint: string, event: HandlerEvent): Promise<void> {
  const config = RATE_LIMITS[endpoint]
  if (!config) {
    // Sem limite configurado, permitir
    return
  }

  const key = config.keyGenerator(event)
  const now = Date.now()
  
  // Limpar entradas expiradas
  cleanupExpiredEntries()
  
  let entry = rateLimitStore.get(key)
  
  if (!entry) {
    // Primeira requisição
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
      firstRequest: now
    }
    rateLimitStore.set(key, entry)
    return
  }

  // Verificar se a janela expirou
  if (now >= entry.resetTime) {
    // Reset da janela
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
      firstRequest: now
    }
    rateLimitStore.set(key, entry)
    return
  }

  // Verificar limite
  if (entry.count >= config.maxRequests) {
    const timeUntilReset = Math.ceil((entry.resetTime - now) / 1000)
    throw new Error(`Rate limit exceeded for ${endpoint}. Try again in ${timeUntilReset} seconds.`)
  }

  // Incrementar contador
  entry.count++
  rateLimitStore.set(key, entry)
}

/**
 * Processar mensagem WhatsApp recebida
 */
export async function processWhatsAppMessage(messageData: any): Promise<void> {
  try {
    const messages = messageData.messages || []
    const contacts = messageData.contacts || []

    for (const message of messages) {
      const phoneNumber = message.from
      const messageText = message.text?.body || ''
      
      // Buscar contato
      const contact = contacts.find((c: any) => c.wa_id === phoneNumber)
      const contactName = contact?.profile?.name || 'Cliente'

      console.log(`Mensagem WhatsApp recebida de ${contactName} (${phoneNumber}): ${messageText}`)

      // Gerar resposta automática
      const autoResponse = generateAutoResponse(messageText)
      
      if (autoResponse) {
        // TODO: Implementar envio de resposta e salvamento
        console.log(`Resposta automática: ${autoResponse.text}`)
        
        // Salvar conversação
        await saveConversation({
          phoneNumber,
          contactName,
          messageIn: messageText,
          messageOut: autoResponse.text,
          timestamp: new Date().toISOString(),
          type: 'auto_response'
        })
      }
    }
  } catch (error) {
    console.error('Erro ao processar mensagem WhatsApp:', error)
  }
}

/**
 * Gerar resposta automática baseada na mensagem
 */
function generateAutoResponse(messageText: string): { text: string; type: string } | null {
  const text = messageText.toLowerCase()

  const responses = [
    {
      keywords: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite'],
      response: '👋 Olá! Obrigado por entrar em contato. Como posso ajudá-lo hoje?',
      type: 'greeting'
    },
    {
      keywords: ['serviços', 'serviço', 'informações'],
      response: '📋 Oferecemos desenvolvimento de sites, marketing digital, SEO e muito mais!',
      type: 'services'
    },
    {
      keywords: ['orçamento', 'preço', 'valor'],
      response: '💰 Vou conectar você com um atendente para elaborar um orçamento personalizado.',
      type: 'budget'
    }
  ]

  for (const resp of responses) {
    if (resp.keywords.some(keyword => text.includes(keyword))) {
      return { text: resp.response, type: resp.type }
    }
  }

  return {
    text: 'Obrigado pela mensagem! Em breve um atendente entrará em contato.',
    type: 'default'
  }
}

/**
 * Salvar conversação (implementação mock)
 */
export async function saveConversation(conversation: any): Promise<boolean> {
  try {
    console.log('Salvando conversação:', conversation)
    // TODO: Implementar persistência real
    return true
  } catch (error) {
    console.error('Erro ao salvar conversação:', error)
    return false
  }
}

/**
 * Limpar entradas de rate limit expiradas
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  const keysToDelete: string[] = []
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      keysToDelete.push(key)
    }
  }
  
  keysToDelete.forEach(key => rateLimitStore.delete(key))
}

/**
 * Normalizar número de telefone para formato internacional
 */
export function normalizePhoneNumber(phone: string): string {
  return phone
    .replace(/\D/g, '') // Remover caracteres não numéricos
    .replace(/^55/, '+55') // Adicionar + se não tiver
    .replace(/^(?!\+)/, '+55') // Adicionar +55 se não começar com +
}

/**
 * Verificar se endpoint requer acesso VIP
 */
export function isVipEndpoint(endpoint: string): boolean {
  const vipEndpoints = ['auto-seo', 'lead-scoring', 'ai-copywriter', 'ai-chat', 'ai-content-generator', 'ai-email-generator', 'ai-insights', 'ai-sentiment', 'ai-seo-generator']
  return vipEndpoints.includes(endpoint)
}