import type { Handler } from '@netlify/functions'
import { rateLimitMiddleware, verifyVipAccess } from './shared/security'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  category: 'ai' | 'automation' | 'ecommerce' | 'marketing' | 'analytics';
  plan: 'essential' | 'vip';
  enabled: boolean;
  isCore: boolean; // Funcionalidades obrigatórias que não podem ser desativadas
  dependencies?: string[]; // IDs de funcionalidades que são pré-requisitos
  icon: string;
  benefits: string[];
  setupRequired: boolean;
  setupInstructions?: string;
}

interface UserFeatureSettings {
  siteSlug: string;
  plan: 'essential' | 'vip';
  enabledFeatures: string[];
  onboardingCompleted: boolean;
  lastUpdated: string;
}

// Definição das funcionalidades disponíveis
const AVAILABLE_FEATURES: FeatureConfig[] = [
  // FUNCIONALIDADES CORE (sempre ativas)
  {
    id: 'basic-website',
    name: 'Website Básico',
    description: 'Site profissional com páginas essenciais',
    category: 'marketing',
    plan: 'essential',
    enabled: true,
    isCore: true,
    icon: '🌐',
    benefits: ['Site responsivo', 'SEO básico', 'Formulário de contato'],
    setupRequired: false
  },
  {
    id: 'google-my-business',
    name: 'Google Meu Negócio',
    description: 'Otimização do perfil no Google',
    category: 'marketing',
    plan: 'essential',
    enabled: true,
    isCore: true,
    icon: '📍',
    benefits: ['Perfil otimizado', 'Gerenciamento de avaliações', 'Presença local'],
    setupRequired: false
  },

  // FUNCIONALIDADES VIP - IA
  {
    id: 'ai-copywriter',
    name: 'IA Copywriter',
    description: 'Geração automática de textos e conteúdo',
    category: 'ai',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '✍️',
    benefits: ['Textos personalizados', 'Copy persuasiva', 'Múltiplos idiomas'],
    setupRequired: false
  },
  {
    id: 'auto-seo',
    name: 'SEO Automático',
    description: 'Otimização automática para mecanismos de busca',
    category: 'ai',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '🚀',
    benefits: ['Meta tags automáticas', 'Sitemap dinâmico', 'Análise de performance'],
    setupRequired: false
  },
  {
    id: 'lead-scoring',
    name: 'Lead Scoring IA',
    description: 'Classificação inteligente de leads',
    category: 'ai',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '🎯',
    benefits: ['Pontuação automática', 'Priorização de leads', 'Insights comportamentais'],
    setupRequired: false
  },

  // FUNCIONALIDADES VIP - AUTOMAÇÃO
  {
    id: 'whatsapp-chatbot',
    name: 'Chatbot WhatsApp',
    description: 'Atendimento automático via WhatsApp Business',
    category: 'automation',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '🤖',
    benefits: ['Respostas automáticas', 'Qualificação de leads', 'Atendimento 24/7'],
    setupRequired: true,
    setupInstructions: 'Configure sua conta WhatsApp Business API'
  },
  {
    id: 'appointment-scheduling',
    name: 'Sistema de Agendamento',
    description: 'Calendário online para agendamentos',
    category: 'automation',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '📅',
    benefits: ['Calendário online', 'Confirmações automáticas', 'Integração Google Calendar'],
    setupRequired: true,
    setupInstructions: 'Configure seus horários de atendimento'
  },
  {
    id: 'multi-language',
    name: 'Multi-idioma',
    description: 'Site em múltiplos idiomas com tradução automática',
    category: 'automation',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '🌍',
    benefits: ['Tradução automática', 'Múltiplos idiomas', 'Alcance global'],
    setupRequired: false
  },

  // FUNCIONALIDADES VIP - E-COMMERCE
  {
    id: 'ecommerce-store',
    name: 'Loja Online',
    description: 'E-commerce completo com pagamentos',
    category: 'ecommerce',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '🛒',
    benefits: ['Catálogo de produtos', 'Carrinho de compras', 'Pagamentos integrados'],
    setupRequired: true,
    setupInstructions: 'Configure seus produtos e métodos de pagamento'
  },
  {
    id: 'premium-templates',
    name: 'Templates Premium',
    description: 'Marketplace de templates exclusivos',
    category: 'ecommerce',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '🎨',
    benefits: ['Templates exclusivos', 'Designs profissionais', 'Instalação fácil'],
    setupRequired: false
  },

  // FUNCIONALIDADES VIP - AVANÇADAS
  {
    id: 'white-label',
    name: 'White Label',
    description: 'Revenda da plataforma com sua marca',
    category: 'marketing',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '🏷️',
    benefits: ['Sua marca', 'Revenda de serviços', 'Comissões'],
    setupRequired: true,
    setupInstructions: 'Configure sua marca e estrutura de preços'
  },
  {
    id: 'audit-logs',
    name: 'Logs de Auditoria',
    description: 'Rastreamento completo de ações',
    category: 'analytics',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '📊',
    benefits: ['Histórico completo', 'Auditoria de mudanças', 'Compliance'],
    setupRequired: false
  }
]

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
    // Verificar rate limiting
    await rateLimitMiddleware('feature-management', event)
    
    const body = JSON.parse(event.body || '{}')
    const { action, siteSlug, vipPin, featureId, featureIds, onboardingData } = body

    if (!siteSlug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Site é obrigatório' 
        })
      }
    }

    // Para certas ações, não precisa de VIP (como obter funcionalidades disponíveis)
    const requiresVip = ['toggle_feature', 'bulk_toggle_features', 'complete_onboarding'].includes(action)
    
    if (requiresVip) {
      if (!vipPin) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: 'PIN VIP é obrigatório para esta ação' 
          })
        }
      }

      const isVipValid = await verifyVipAccess(siteSlug, vipPin)
      if (!isVipValid) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ ok: false, error: 'Acesso VIP inválido' })
        }
      }
    }

    switch (action) {
      case 'get_available_features':
        return await getAvailableFeatures(siteSlug)
      
      case 'get_user_features':
        return await getUserFeatures(siteSlug)
      
      case 'toggle_feature':
        return await toggleFeature(siteSlug, featureId)
      
      case 'bulk_toggle_features':
        return await bulkToggleFeatures(siteSlug, featureIds)
      
      case 'get_feature_config':
        return await getFeatureConfig(siteSlug, featureId)
      
      case 'complete_onboarding':
        return await completeOnboarding(siteSlug, onboardingData)
      
      case 'get_onboarding_status':
        return await getOnboardingStatus(siteSlug)
      
      case 'reset_features':
        return await resetFeaturesToDefault(siteSlug)
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Ação inválida' })
        }
    }

  } catch (error) {
    console.error('Erro no gerenciamento de funcionalidades:', error)
    
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

async function getAvailableFeatures(siteSlug: string) {
  try {
    // Obter plano do usuário
    const userPlan = await getUserPlan(siteSlug)
    
    // Filtrar funcionalidades por plano
    const availableFeatures = AVAILABLE_FEATURES.filter(feature => {
      if (feature.plan === 'essential') return true
      if (feature.plan === 'vip' && userPlan === 'vip') return true
      return false
    })

    // Agrupar por categoria
    const featuresByCategory = availableFeatures.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = []
      }
      acc[feature.category].push(feature)
      return acc
    }, {} as Record<string, FeatureConfig[]>)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        features: availableFeatures,
        featuresByCategory,
        userPlan
      })
    }

  } catch (error) {
    console.error('Erro ao obter funcionalidades disponíveis:', error)
    throw error
  }
}

async function getUserPlan(siteSlug: string): Promise<'essential' | 'vip'> {
  // TODO: Buscar plano real do Google Sheets
  // Por enquanto, assumir que todos são VIP para desenvolvimento
  return 'vip'
}

async function getUserFeatures(siteSlug: string) {
  try {
    // TODO: Buscar configurações do usuário do Google Sheets
    const userSettings = await getUserFeatureSettings(siteSlug)
    
    // Obter funcionalidades habilitadas com detalhes
    const enabledFeatures = AVAILABLE_FEATURES.filter(feature => 
      feature.isCore || userSettings.enabledFeatures.includes(feature.id)
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        userSettings,
        enabledFeatures,
        totalEnabled: enabledFeatures.length
      })
    }

  } catch (error) {
    console.error('Erro ao obter funcionalidades do usuário:', error)
    throw error
  }
}

async function getUserFeatureSettings(siteSlug: string): Promise<UserFeatureSettings> {
  // TODO: Buscar do Google Sheets
  // Mock data para desenvolvimento
  return {
    siteSlug,
    plan: 'vip',
    enabledFeatures: ['ai-copywriter', 'auto-seo'], // Funcionalidades opcionais habilitadas
    onboardingCompleted: false,
    lastUpdated: new Date().toISOString()
  }
}

async function toggleFeature(siteSlug: string, featureId: string) {
  try {
    const feature = AVAILABLE_FEATURES.find(f => f.id === featureId)
    if (!feature) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: 'Funcionalidade não encontrada' })
      }
    }

    // Verificar se a funcionalidade pode ser desabilitada
    if (feature.isCore) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Funcionalidades essenciais não podem ser desabilitadas' 
        })
      }
    }

    // Verificar plano do usuário
    const userPlan = await getUserPlan(siteSlug)
    if (feature.plan === 'vip' && userPlan !== 'vip') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Esta funcionalidade requer plano VIP' 
        })
      }
    }

    // Obter configurações atuais
    const currentSettings = await getUserFeatureSettings(siteSlug)
    const isCurrentlyEnabled = currentSettings.enabledFeatures.includes(featureId)
    
    // Alternar estado
    let newEnabledFeatures: string[]
    if (isCurrentlyEnabled) {
      // Desabilitar funcionalidade e suas dependentes
      newEnabledFeatures = currentSettings.enabledFeatures.filter(id => {
        const dependentFeature = AVAILABLE_FEATURES.find(f => f.dependencies?.includes(featureId))
        return id !== featureId && !dependentFeature
      })
    } else {
      // Habilitar funcionalidade e suas dependências
      newEnabledFeatures = [...currentSettings.enabledFeatures, featureId]
      
      // Adicionar dependências se necessário
      if (feature.dependencies) {
        for (const depId of feature.dependencies) {
          if (!newEnabledFeatures.includes(depId)) {
            newEnabledFeatures.push(depId)
          }
        }
      }
    }

    // Salvar nova configuração
    const updatedSettings: UserFeatureSettings = {
      ...currentSettings,
      enabledFeatures: newEnabledFeatures,
      lastUpdated: new Date().toISOString()
    }

    await saveUserFeatureSettings(siteSlug, updatedSettings)

    // Regenerar prompts do GAS se necessário
    await updateGasPrompts(siteSlug, updatedSettings)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        feature: {
          ...feature,
          enabled: !isCurrentlyEnabled
        },
        message: `Funcionalidade ${!isCurrentlyEnabled ? 'habilitada' : 'desabilitada'} com sucesso`,
        enabledFeatures: newEnabledFeatures
      })
    }

  } catch (error) {
    console.error('Erro ao alternar funcionalidade:', error)
    throw error
  }
}

async function saveUserFeatureSettings(siteSlug: string, settings: UserFeatureSettings) {
  // TODO: Salvar no Google Sheets
  console.log('Salvando configurações de funcionalidades:', { siteSlug, settings })
  
  // Em produção, implementar salvamento real no Google Sheets
  // Estrutura sugerida da planilha "user_features":
  // site_slug | plan | enabled_features | onboarding_completed | last_updated
}

async function updateGasPrompts(siteSlug: string, settings: UserFeatureSettings) {
  // TODO: Atualizar prompts no Google Apps Script baseado nas funcionalidades habilitadas
  console.log('Atualizando prompts do GAS:', { siteSlug, settings })
  
  // Em produção, fazer chamada para o GAS com:
  // - Funcionalidades habilitadas
  // - Plano do usuário
  // - Configurações específicas
  
  // O GAS deve usar essas informações para:
  // - Gerar apenas as seções relevantes
  // - Incluir/excluir funcionalidades específicas
  // - Adaptar o conteúdo ao plano
}

async function bulkToggleFeatures(siteSlug: string, featureIds: { id: string, enabled: boolean }[]) {
  try {
    const currentSettings = await getUserFeatureSettings(siteSlug)
    let newEnabledFeatures = [...currentSettings.enabledFeatures]

    // Aplicar mudanças em lote
    for (const { id, enabled } of featureIds) {
      const feature = AVAILABLE_FEATURES.find(f => f.id === id)
      if (!feature || feature.isCore) continue

      // Verificar plano
      const userPlan = await getUserPlan(siteSlug)
      if (feature.plan === 'vip' && userPlan !== 'vip') continue

      if (enabled && !newEnabledFeatures.includes(id)) {
        newEnabledFeatures.push(id)
        
        // Adicionar dependências
        if (feature.dependencies) {
          for (const depId of feature.dependencies) {
            if (!newEnabledFeatures.includes(depId)) {
              newEnabledFeatures.push(depId)
            }
          }
        }
      } else if (!enabled) {
        newEnabledFeatures = newEnabledFeatures.filter(fId => fId !== id)
      }
    }

    // Salvar configurações
    const updatedSettings: UserFeatureSettings = {
      ...currentSettings,
      enabledFeatures: newEnabledFeatures,
      lastUpdated: new Date().toISOString()
    }

    await saveUserFeatureSettings(siteSlug, updatedSettings)
    await updateGasPrompts(siteSlug, updatedSettings)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Funcionalidades atualizadas em lote',
        enabledFeatures: newEnabledFeatures,
        totalEnabled: newEnabledFeatures.length
      })
    }

  } catch (error) {
    console.error('Erro na atualização em lote:', error)
    throw error
  }
}

async function getFeatureConfig(siteSlug: string, featureId: string) {
  try {
    const feature = AVAILABLE_FEATURES.find(f => f.id === featureId)
    if (!feature) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: 'Funcionalidade não encontrada' })
      }
    }

    const userSettings = await getUserFeatureSettings(siteSlug)
    const isEnabled = feature.isCore || userSettings.enabledFeatures.includes(featureId)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        feature: {
          ...feature,
          enabled: isEnabled
        }
      })
    }

  } catch (error) {
    console.error('Erro ao obter configuração da funcionalidade:', error)
    throw error
  }
}

async function completeOnboarding(siteSlug: string, onboardingData: any) {
  try {
    const { selectedFeatures, businessType, goals } = onboardingData
    
    // Validar funcionalidades selecionadas
    const validFeatures = selectedFeatures.filter((id: string) => {
      const feature = AVAILABLE_FEATURES.find(f => f.id === id)
      if (!feature) return false
      
      // Verificar se o usuário tem acesso a essa funcionalidade
      const userPlan = 'vip' // TODO: buscar plano real
      return feature.plan === 'essential' || (feature.plan === 'vip' && userPlan === 'vip')
    })

    // Criar configuração inicial
    const settings: UserFeatureSettings = {
      siteSlug,
      plan: 'vip', // TODO: usar plano real
      enabledFeatures: validFeatures,
      onboardingCompleted: true,
      lastUpdated: new Date().toISOString()
    }

    await saveUserFeatureSettings(siteSlug, settings)
    await updateGasPrompts(siteSlug, settings)

    // Salvar dados adicionais do onboarding
    await saveOnboardingData(siteSlug, { businessType, goals, selectedFeatures: validFeatures })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Onboarding concluído com sucesso',
        settings,
        enabledFeatures: validFeatures
      })
    }

  } catch (error) {
    console.error('Erro ao completar onboarding:', error)
    throw error
  }
}

async function saveOnboardingData(siteSlug: string, data: any) {
  // TODO: Salvar dados do onboarding no Google Sheets
  console.log('Salvando dados do onboarding:', { siteSlug, data })
}

async function getOnboardingStatus(siteSlug: string) {
  try {
    const userSettings = await getUserFeatureSettings(siteSlug)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        onboardingCompleted: userSettings.onboardingCompleted,
        hasEnabledFeatures: userSettings.enabledFeatures.length > 0
      })
    }

  } catch (error) {
    console.error('Erro ao obter status do onboarding:', error)
    throw error
  }
}

async function resetFeaturesToDefault(siteSlug: string) {
  try {
    // Definir funcionalidades padrão baseadas no plano
    const userPlan = await getUserPlan(siteSlug)
    const defaultFeatures = userPlan === 'vip' 
      ? ['ai-copywriter', 'auto-seo'] // Funcionalidades padrão VIP
      : [] // Essential não tem funcionalidades opcionais por padrão

    const settings: UserFeatureSettings = {
      siteSlug,
      plan: userPlan,
      enabledFeatures: defaultFeatures,
      onboardingCompleted: false,
      lastUpdated: new Date().toISOString()
    }

    await saveUserFeatureSettings(siteSlug, settings)
    await updateGasPrompts(siteSlug, settings)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Funcionalidades resetadas para o padrão',
        settings
      })
    }

  } catch (error) {
    console.error('Erro ao resetar funcionalidades:', error)
    throw error
  }
}