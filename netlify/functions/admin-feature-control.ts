import { Handler } from '@netlify/functions';
import { callGAS } from './shared/gas-client';

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.URL || 'http://localhost:3000';

const headers = {
  'Access-Control-Allow-Origin': FRONTEND_URL,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-elevea-internal',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  category: 'ai' | 'automation' | 'ecommerce' | 'marketing' | 'analytics';
  plan: 'essential' | 'vip';
  enabled: boolean;
  isCore: boolean;
  icon: string;
  benefits: string[];
  setupRequired: boolean;
  setupInstructions?: string;
}

interface ClientFeatureSettings {
  siteSlug: string;
  plan: 'essential' | 'vip';
  enabledFeatures: string[];
  onboardingCompleted: boolean;
  lastUpdated: string;
}

// Definição das funcionalidades disponíveis (sincronizada com feature-management.ts)
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
    setupInstructions: 'Conecte sua conta Google Calendar'
  },
  {
    id: 'multi-language',
    name: 'Sistema Multi-idioma',
    description: 'Tradução automática e localização',
    category: 'automation',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '🌍',
    benefits: ['Tradução automática', 'Múltiplos idiomas', 'SEO internacional'],
    setupRequired: false
  },

  // FUNCIONALIDADES VIP - E-COMMERCE
  {
    id: 'ecommerce',
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
    description: 'Sistema de revenda para agências',
    category: 'marketing',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '🏷️',
    benefits: ['Marca própria', 'Gestão de subclientes', 'Comissões automáticas'],
    setupRequired: true,
    setupInstructions: 'Configure sua marca e comissões'
  },
  {
    id: 'audit-logs',
    name: 'Logs de Auditoria',
    description: 'Rastreamento completo de ações',
    category: 'analytics',
    plan: 'vip',
    enabled: false,
    isCore: false,
    icon: '🔍',
    benefits: ['Histórico completo', 'Alertas de segurança', 'Relatórios de compliance'],
    setupRequired: false
  }
];

// Removida - usando callGAS do shared/gas-client

/**
 * Buscar configurações de funcionalidades de um cliente
 */
async function getClientFeatures(siteSlug: string) {
  try {
    const gasResponse = await callGAS('admin_get_client_features', {
      siteSlug: siteSlug
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        settings: gasResponse.settings || {
          siteSlug: siteSlug,
          plan: 'essential',
          enabledFeatures: ['basic-website', 'google-my-business'],
          onboardingCompleted: false,
          lastUpdated: new Date().toISOString()
        },
        availableFeatures: AVAILABLE_FEATURES
      })
    };

  } catch (error) {
    console.error('Erro ao buscar features do cliente:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

/**
 * Atualizar funcionalidades de um cliente (admin apenas)
 */
async function updateClientFeatures(siteSlug: string, updates: Partial<ClientFeatureSettings>) {
  try {
    const gasResponse = await callGAS('admin_update_client_features', {
      siteSlug: siteSlug,
      updates: {
        ...updates,
        lastUpdated: new Date().toISOString()
      }
    });

    if (gasResponse.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          message: 'Configurações atualizadas com sucesso',
          settings: gasResponse.settings
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        ok: false,
        error: gasResponse.error || 'Erro ao atualizar configurações'
      })
    };

  } catch (error) {
    console.error('Erro ao atualizar features do cliente:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

/**
 * Ativar/desativar funcionalidade específica
 */
async function toggleFeature(siteSlug: string, featureId: string, enabled: boolean) {
  try {
    // Verificar se a funcionalidade existe
    const feature = AVAILABLE_FEATURES.find(f => f.id === featureId);
    if (!feature) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Funcionalidade não encontrada'
        })
      };
    }

    // Não permitir desativar funcionalidades core
    if (!enabled && feature.isCore) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Funcionalidades core não podem ser desativadas'
        })
      };
    }

    const gasResponse = await callGAS('admin_toggle_client_feature', {
      siteSlug: siteSlug,
      featureId: featureId,
      enabled: enabled,
      timestamp: new Date().toISOString()
    });

    if (gasResponse.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          message: `Funcionalidade ${enabled ? 'ativada' : 'desativada'} com sucesso`,
          featureId: featureId,
          enabled: enabled
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        ok: false,
        error: gasResponse.error || 'Erro ao alterar funcionalidade'
      })
    };

  } catch (error) {
    console.error('Erro ao alternar funcionalidade:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

/**
 * Alterar plano do cliente
 */
async function updateClientPlan(siteSlug: string, plan: 'essential' | 'vip') {
  try {
    const gasResponse = await callGAS('admin_update_client_plan', {
      siteSlug: siteSlug,
      plan: plan,
      timestamp: new Date().toISOString()
    });

    if (gasResponse.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          message: `Plano alterado para ${plan} com sucesso`,
          plan: plan
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        ok: false,
        error: gasResponse.error || 'Erro ao alterar plano'
      })
    };

  } catch (error) {
    console.error('Erro ao alterar plano:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

export const handler: Handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Verificar token de admin
    const adminToken = process.env.ADMIN_DASH_TOKEN || process.env.ADMIN_TOKEN || '';
    const providedToken = event.headers['x-elevea-internal'] || event.headers['authorization']?.replace('Bearer ', '');
    
    if (!adminToken || providedToken !== adminToken) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Acesso negado - token de admin requerido'
        })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { action, siteSlug } = body;

    if (!siteSlug || typeof siteSlug !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'siteSlug é obrigatório'
        })
      };
    }

    switch (action) {
      case 'get_client_features':
        return await getClientFeatures(siteSlug);

      case 'update_client_features':
        return await updateClientFeatures(siteSlug, body.updates);

      case 'toggle_feature':
        if (!body.featureId || typeof body.enabled !== 'boolean') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              ok: false,
              error: 'featureId e enabled são obrigatórios'
            })
          };
        }
        return await toggleFeature(siteSlug, body.featureId, body.enabled);

      case 'update_plan':
        if (!body.plan || !['essential', 'vip'].includes(body.plan)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              ok: false,
              error: 'Plano deve ser essential ou vip'
            })
          };
        }
        return await updateClientPlan(siteSlug, body.plan);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'Ação não reconhecida'
          })
        };
    }

  } catch (error) {
    console.error('Erro no admin feature control:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor'
      })
    };
  }
};