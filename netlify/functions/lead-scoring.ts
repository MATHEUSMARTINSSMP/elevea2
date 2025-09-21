import type { Handler } from '@netlify/functions'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

interface LeadData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  source?: string;
  timestamp?: string;
  interactions?: LeadInteraction[];
  demographics?: LeadDemographics;
  score?: number;
  priority?: 'hot' | 'warm' | 'cold';
}

interface LeadInteraction {
  type: 'page_view' | 'form_submit' | 'email_open' | 'email_click' | 'whatsapp_message' | 'call' | 'quote_request';
  timestamp: string;
  value?: string;
  points?: number;
}

interface LeadDemographics {
  location?: string;
  businessSize?: 'individual' | 'small' | 'medium' | 'large';
  industry?: string;
  budget?: 'low' | 'medium' | 'high';
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
    const { action, siteSlug, vipPin, leadData, leadId } = body

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
      case 'score_lead':
        return await scoreLead(leadData, siteSlug)
      
      case 'get_scored_leads':
        return await getScoredLeads(siteSlug)
      
      case 'update_lead_interaction':
        return await updateLeadInteraction(leadId, leadData, siteSlug)
      
      case 'get_lead_insights':
        return await getLeadInsights(siteSlug)
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Ação inválida' })
        }
    }

  } catch (error) {
    console.error('Erro no lead scoring:', error)
    
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

async function scoreLead(leadData: LeadData, siteSlug: string) {
  try {
    const score = calculateLeadScore(leadData)
    const priority = getLeadPriority(score)
    
    const scoredLead = {
      ...leadData,
      id: leadData.id || generateLeadId(),
      score,
      priority,
      lastScored: new Date().toISOString(),
      siteSlug
    }

    // Salvar lead pontuado (implementar storage real)
    await saveLeadScore(scoredLead)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        lead: scoredLead,
        insights: getScoreInsights(score, leadData)
      })
    }

  } catch (error) {
    console.error('Erro ao pontuar lead:', error)
    throw error
  }
}

function calculateLeadScore(leadData: LeadData): number {
  let score = 0

  // Pontuação base por dados fornecidos (0-25 pontos)
  if (leadData.name) score += 5
  if (leadData.email) score += 8
  if (leadData.phone) score += 10
  if (leadData.company) score += 7
  if (leadData.message && leadData.message.length > 20) score += 5

  // Pontuação por fonte do lead (0-15 pontos)
  const sourceScores = {
    'organic': 15,     // Busca orgânica - alta intenção
    'google_ads': 12,  // Google Ads - pago mas direcionado
    'facebook': 8,     // Redes sociais - média intenção
    'whatsapp': 10,    // WhatsApp - contato direto
    'referral': 13,    // Indicação - alta qualidade
    'direct': 11,      // Acesso direto - conhece a marca
    'email': 6         // E-mail marketing - baixa intenção
  }
  score += sourceScores[leadData.source as keyof typeof sourceScores] || 5

  // Pontuação por interações (0-30 pontos)
  if (leadData.interactions) {
    const interactionScores = {
      'page_view': 1,
      'form_submit': 8,
      'email_open': 2,
      'email_click': 4,
      'whatsapp_message': 6,
      'call': 10,
      'quote_request': 15
    }

    for (const interaction of leadData.interactions) {
      score += interactionScores[interaction.type] || 1
    }

    // Bônus por múltiplas interações
    if (leadData.interactions.length > 3) score += 5
    if (leadData.interactions.length > 6) score += 10
  }

  // Pontuação por dados demográficos (0-20 pontos)
  if (leadData.demographics) {
    const { businessSize, budget, location } = leadData.demographics

    // Tamanho do negócio
    const businessScores = {
      'individual': 5,
      'small': 8,
      'medium': 15,
      'large': 20
    }
    score += businessScores[businessSize as keyof typeof businessScores] || 0

    // Orçamento estimado
    const budgetScores = {
      'low': 3,
      'medium': 8,
      'high': 15
    }
    score += budgetScores[budget as keyof typeof budgetScores] || 0

    // Localização (proximidade)
    if (location && (location.includes('Macapá') || location.includes('AP'))) {
      score += 10 // Bônus para região local
    }
  }

  // Pontuação por urgência temporal (0-10 pontos)
  if (leadData.timestamp) {
    const now = new Date()
    const leadTime = new Date(leadData.timestamp)
    const hoursDiff = (now.getTime() - leadTime.getTime()) / (1000 * 60 * 60)

    if (hoursDiff < 1) score += 10      // Última hora - muito quente
    else if (hoursDiff < 24) score += 6 // Último dia - quente
    else if (hoursDiff < 72) score += 3 // Últimos 3 dias - morno
  }

  // Máximo de 100 pontos
  return Math.min(score, 100)
}

function getLeadPriority(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 70) return 'hot'
  if (score >= 40) return 'warm'
  return 'cold'
}

function getScoreInsights(score: number, leadData: LeadData): string[] {
  const insights: string[] = []

  if (score >= 80) {
    insights.push('🔥 Lead MUITO QUENTE - Contactar IMEDIATAMENTE!')
  } else if (score >= 60) {
    insights.push('🌡️ Lead quente - Prioridade alta para contato')
  } else if (score >= 40) {
    insights.push('📞 Lead morno - Contato dentro de 24h')
  } else {
    insights.push('❄️ Lead frio - Nurturing por e-mail')
  }

  if (!leadData.phone) {
    insights.push('📱 Sem telefone - Dificulta contato direto')
  }

  if (!leadData.company) {
    insights.push('🏢 Sem empresa - Pode ser pessoa física')
  }

  if (leadData.interactions && leadData.interactions.length > 5) {
    insights.push('⭐ Múltiplas interações - Alto engajamento')
  }

  if (leadData.source === 'organic') {
    insights.push('🔍 Busca orgânica - Alta intenção de compra')
  }

  return insights
}

async function getScoredLeads(siteSlug: string) {
  try {
    // TODO: Buscar leads reais do storage
    // Em produção, implementar busca do banco/storage

    // Dados mock para desenvolvimento
    const mockLeads: LeadData[] = [
      {
        id: '1',
        name: 'Maria Silva',
        email: 'maria@empresa.com',
        phone: '+5596991234567',
        company: 'Empresa ABC Ltda',
        message: 'Preciso de um site profissional para minha empresa. Trabalho com vendas e quero algo moderno.',
        source: 'organic',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        score: 87,
        priority: 'hot',
        interactions: [
          { type: 'page_view', timestamp: new Date().toISOString(), value: '/servicos' },
          { type: 'form_submit', timestamp: new Date().toISOString(), value: 'contact' },
          { type: 'quote_request', timestamp: new Date().toISOString(), value: 'website' }
        ],
        demographics: {
          location: 'Macapá, AP',
          businessSize: 'small',
          budget: 'medium'
        }
      },
      {
        id: '2',
        name: 'João Santos',
        email: 'joao@gmail.com',
        phone: '',
        message: 'Quanto custa?',
        source: 'facebook',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        score: 34,
        priority: 'cold',
        interactions: [
          { type: 'page_view', timestamp: new Date().toISOString(), value: '/' }
        ],
        demographics: {
          location: 'São Paulo, SP',
          businessSize: 'individual',
          budget: 'low'
        }
      },
      {
        id: '3',
        name: 'Ana Costa',
        email: 'ana@startup.com',
        phone: '+5511987654321',
        company: 'Startup XYZ',
        message: 'Somos uma startup em crescimento e precisamos de um site e estratégia digital completa.',
        source: 'referral',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        score: 92,
        priority: 'hot',
        interactions: [
          { type: 'page_view', timestamp: new Date().toISOString(), value: '/servicos' },
          { type: 'page_view', timestamp: new Date().toISOString(), value: '/portfolio' },
          { type: 'form_submit', timestamp: new Date().toISOString(), value: 'contact' },
          { type: 'whatsapp_message', timestamp: new Date().toISOString(), value: 'info' },
          { type: 'quote_request', timestamp: new Date().toISOString(), value: 'full_package' }
        ],
        demographics: {
          location: 'Macapá, AP',
          businessSize: 'medium',
          budget: 'high'
        }
      }
    ]

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        leads: mockLeads.sort((a, b) => (b.score || 0) - (a.score || 0)),
        summary: {
          total: mockLeads.length,
          hot: mockLeads.filter(l => l.priority === 'hot').length,
          warm: mockLeads.filter(l => l.priority === 'warm').length,
          cold: mockLeads.filter(l => l.priority === 'cold').length,
          averageScore: Math.round(mockLeads.reduce((sum, l) => sum + (l.score || 0), 0) / mockLeads.length)
        }
      })
    }

  } catch (error) {
    console.error('Erro ao buscar leads pontuados:', error)
    throw error
  }
}

async function updateLeadInteraction(leadId: string, interactionData: any, siteSlug: string) {
  try {
    // TODO: Atualizar interação real no storage
    console.log('Atualizando interação do lead:', leadId, interactionData)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Interação atualizada com sucesso'
      })
    }

  } catch (error) {
    console.error('Erro ao atualizar interação:', error)
    throw error
  }
}

async function getLeadInsights(siteSlug: string) {
  try {
    // Análise de insights dos leads
    const insights = {
      conversionRate: 23.5,
      averageScore: 58,
      topSources: [
        { source: 'organic', count: 45, avgScore: 72 },
        { source: 'google_ads', count: 32, avgScore: 65 },
        { source: 'referral', count: 18, avgScore: 78 }
      ],
      trends: {
        thisWeek: { leads: 24, score: 61 },
        lastWeek: { leads: 18, score: 55 },
        growth: '+33%'
      },
      recommendations: [
        'Focar em SEO - leads orgânicos têm maior score',
        'Melhorar landing pages para Google Ads',
        'Implementar programa de indicações',
        'Criar conteúdo para nurturing de leads frios'
      ]
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        insights
      })
    }

  } catch (error) {
    console.error('Erro ao obter insights:', error)
    throw error
  }
}

async function saveLeadScore(leadData: LeadData) {
  // TODO: Implementar salvamento real
  console.log('Salvando lead pontuado:', leadData.id, leadData.score)
  return true
}

function generateLeadId(): string {
  return 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

async function verifyVipAccess(siteSlug: string, vipPin: string): Promise<boolean> {
  try {
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