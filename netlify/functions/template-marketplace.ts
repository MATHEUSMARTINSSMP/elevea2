import { Handler } from '@netlify/functions';
import { rateLimitMiddleware, verifyVipAccess } from './shared/security';

const GAS_BASE_URL = process.env.GAS_BASE_URL;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  images: string[];
  preview_url: string;
  demo_url: string;
  tags: string[];
  features: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  responsive: boolean;
  includes_dark_mode: boolean;
  file_size: string;
  last_updated: string;
  downloads_count: number;
  rating: number;
  reviews_count: number;
  author: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  template_count: number;
}

interface PurchaseHistory {
  id: string;
  template_id: string;
  template_name: string;
  price_paid: number;
  currency: string;
  purchase_date: string;
  download_url: string;
  license_key: string;
  status: 'completed' | 'pending' | 'refunded';
}

async function callGAS(action: string, params: any = {}) {
  if (!GAS_BASE_URL) {
    throw new Error('GAS_BASE_URL não configurada');
  }

  const response = await fetch(GAS_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params })
  });

  return await response.json();
}

/**
 * Buscar todos os templates disponíveis
 */
async function getTemplates(filters: any = {}) {
  try {
    const gasResponse = await callGAS('marketplace_get_templates', {
      category: filters.category,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      tags: filters.tags,
      difficulty: filters.difficulty,
      searchTerm: filters.searchTerm,
      sortBy: filters.sortBy || 'latest',
      limit: filters.limit || 20,
      offset: filters.offset || 0
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        templates: gasResponse.templates || [],
        total: gasResponse.total || 0,
        categories: gasResponse.categories || []
      })
    };

  } catch (error) {
    console.error('Erro ao buscar templates:', error);
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
 * Buscar detalhes de um template específico
 */
async function getTemplateDetails(templateId: string) {
  try {
    const gasResponse = await callGAS('marketplace_get_template', {
      templateId: templateId
    });

    if (gasResponse.ok && gasResponse.template) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          template: gasResponse.template
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Template não encontrado'
      })
    };

  } catch (error) {
    console.error('Erro ao buscar template:', error);
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
 * Comprar um template premium
 */
async function purchaseTemplate(siteSlug: string, templateId: string, paymentData: any) {
  try {
    const gasResponse = await callGAS('marketplace_purchase_template', {
      siteSlug: siteSlug,
      templateId: templateId,
      paymentMethod: paymentData.method,
      paymentToken: paymentData.token,
      customerEmail: paymentData.email,
      customerName: paymentData.name,
      purchaseDate: new Date().toISOString()
    });

    if (gasResponse.ok && gasResponse.purchase) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          purchase: gasResponse.purchase,
          message: 'Template comprado com sucesso!'
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        ok: false,
        error: gasResponse.error || 'Erro no processamento do pagamento'
      })
    };

  } catch (error) {
    console.error('Erro ao comprar template:', error);
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
 * Buscar histórico de compras do cliente
 */
async function getPurchaseHistory(siteSlug: string) {
  try {
    const gasResponse = await callGAS('marketplace_get_purchases', {
      siteSlug: siteSlug
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        purchases: gasResponse.purchases || []
      })
    };

  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
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
 * Aplicar template comprado ao site
 */
async function applyTemplate(siteSlug: string, templateId: string, customizations: any = {}) {
  try {
    const gasResponse = await callGAS('marketplace_apply_template', {
      siteSlug: siteSlug,
      templateId: templateId,
      customizations: customizations,
      applyDate: new Date().toISOString()
    });

    if (gasResponse.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          message: 'Template aplicado com sucesso!',
          preview_url: gasResponse.preview_url,
          backup_created: gasResponse.backup_created
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        ok: false,
        error: gasResponse.error || 'Erro ao aplicar template'
      })
    };

  } catch (error) {
    console.error('Erro ao aplicar template:', error);
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
 * Avaliar template comprado
 */
async function rateTemplate(siteSlug: string, templateId: string, rating: number, review: string) {
  try {
    // Validação de entrada
    if (!templateId || typeof templateId !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Template ID é obrigatório'
        })
      };
    }

    if (!rating || rating < 1 || rating > 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Avaliação deve ser entre 1 e 5 estrelas'
        })
      };
    }

    if (!review || review.trim().length < 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Comentário deve ter pelo menos 10 caracteres'
        })
      };
    }

    const gasResponse = await callGAS('marketplace_rate_template', {
      siteSlug: siteSlug,
      templateId: templateId,
      rating: Math.round(rating),
      review: review.trim(),
      reviewDate: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Avaliação enviada com sucesso!'
      })
    };

  } catch (error) {
    console.error('Erro ao avaliar template:', error);
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
 * Buscar categorias de templates
 */
async function getTemplateCategories() {
  try {
    const gasResponse = await callGAS('marketplace_get_categories');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        categories: gasResponse.categories || []
      })
    };

  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
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
    // Verificar rate limiting
    await rateLimitMiddleware('template-marketplace', event)
    const body = JSON.parse(event.body || '{}');
    const { action, siteSlug, vipPin } = body;

    // Verificar acesso VIP (exceto para operações públicas)
    const publicActions = ['get_templates', 'get_template_details', 'get_categories'];
    if (!publicActions.includes(action)) {
      if (!siteSlug || !vipPin) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'siteSlug e vipPin são obrigatórios'
          })
        };
      }

      const hasAccess = await verifyVipAccess(siteSlug, vipPin);
      if (!hasAccess) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'Acesso negado'
          })
        };
      }
    }

    switch (action) {
      case 'get_templates':
        return await getTemplates(body.filters);

      case 'get_template_details':
        return await getTemplateDetails(body.templateId);

      case 'get_categories':
        return await getTemplateCategories();

      case 'purchase_template':
        return await purchaseTemplate(siteSlug, body.templateId, body.paymentData);

      case 'get_purchase_history':
        return await getPurchaseHistory(siteSlug);

      case 'apply_template':
        return await applyTemplate(siteSlug, body.templateId, body.customizations);

      case 'rate_template':
        return await rateTemplate(siteSlug, body.templateId, body.rating, body.review);

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
    console.error('Erro no template marketplace:', error);
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