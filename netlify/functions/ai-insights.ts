import { generateAIInsights } from '../../src/lib/openai';

interface InsightsRequest {
  siteSlug: string;
  businessType: string;
  analytics: {
    totalVisits: number;
    conversionRate: number;
    bounceRate: number;
    avgSessionDuration: string;
    topPages: Array<{ page: string; visits: number }>;
    deviceTypes: Array<{ name: string; value: number }>;
  };
  feedback?: {
    avgRating: number;
    recentFeedbacks: Array<{ rating: number; comment: string; sentiment: 'positive' | 'negative' | 'neutral' }>;
  };
  vipPin: string;
}

interface InsightsResponse {
  success: boolean;
  insights?: {
    summary: string;
    recommendations: Array<{
      category: 'performance' | 'content' | 'ux' | 'marketing' | 'technical';
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      impact: string;
      actionItems: string[];
    }>;
    score: {
      overall: number;
      performance: number;
      userExperience: number;
      contentQuality: number;
      marketingEffectiveness: number;
    };
    trends: {
      traffic: 'up' | 'down' | 'stable';
      conversions: 'up' | 'down' | 'stable';
      engagement: 'up' | 'down' | 'stable';
    };
    nextSteps: string[];
  };
  error?: string;
}

exports.handler = async (event) => {
  console.log('[AI-INSIGHTS] Starting insights generation');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const data: InsightsRequest = JSON.parse(event.body || '{}');
    
    if (!data.siteSlug || !data.businessType || !data.analytics || !data.vipPin) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'Dados incompletos. Site, tipo de negócio, analytics e PIN são obrigatórios.' 
        })
      };
    }

    console.log(`[AI-INSIGHTS] Generating insights for site: ${data.siteSlug}`);

    // Prompt para análise de insights de negócio
    const prompt = `
Analise os dados de um site de negócios e gere insights inteligentes e recomendações práticas.

DADOS DO SITE:
- Site: ${data.siteSlug}
- Tipo de Negócio: ${data.businessType}

ANALYTICS:
- Visitas Totais: ${data.analytics.totalVisits}
- Taxa de Conversão: ${data.analytics.conversionRate}%
- Taxa de Rejeição: ${data.analytics.bounceRate}%
- Duração Média da Sessão: ${data.analytics.avgSessionDuration}
- Páginas Mais Visitadas: ${data.analytics.topPages.map(p => `${p.page} (${p.visits} visitas)`).join(', ')}
- Tipos de Dispositivos: ${data.analytics.deviceTypes.map(d => `${d.name}: ${d.value}%`).join(', ')}

${data.feedback ? `
FEEDBACK DOS CLIENTES:
- Avaliação Média: ${data.feedback.avgRating}/5
- Feedbacks Recentes: ${data.feedback.recentFeedbacks.map(f => `${f.rating}★ (${f.sentiment}): ${f.comment}`).join(' | ')}
` : ''}

INSTRUÇÕES:
1. Analise os dados e identifique pontos fortes e oportunidades de melhoria
2. Gere recomendações específicas e práticas para este tipo de negócio
3. Priorize as recomendações por impacto e facilidade de implementação
4. Forneça scores objetivos baseados nos dados
5. Sugira próximos passos concretos

RESPONDA EM JSON com exatamente esta estrutura:
{
  "summary": "Resumo executivo da análise em 2-3 frases",
  "recommendations": [
    {
      "category": "performance|content|ux|marketing|technical",
      "title": "Título da recomendação",
      "description": "Descrição detalhada",
      "priority": "high|medium|low",
      "impact": "Impacto esperado",
      "actionItems": ["Item 1", "Item 2", "Item 3"]
    }
  ],
  "score": {
    "overall": 85,
    "performance": 90,
    "userExperience": 80,
    "contentQuality": 85,
    "marketingEffectiveness": 75
  },
  "trends": {
    "traffic": "up|down|stable",
    "conversions": "up|down|stable",
    "engagement": "up|down|stable"
  },
  "nextSteps": ["Próximo passo 1", "Próximo passo 2", "Próximo passo 3"]
}

Seja específico para o tipo de negócio "${data.businessType}" e baseie tudo nos dados reais fornecidos.
`;

    const aiResponse = await generateAIInsights(prompt);
    
    if (!aiResponse.success || !aiResponse.content) {
      throw new Error(aiResponse.error || 'Falha na geração de insights');
    }

    // Parse do JSON da resposta da IA
    let insights;
    try {
      insights = JSON.parse(aiResponse.content);
    } catch (parseError) {
      console.error('[AI-INSIGHTS] Error parsing AI response:', parseError);
      throw new Error('Erro ao processar resposta da IA');
    }

    console.log('[AI-INSIGHTS] Insights generated successfully');

    const response: InsightsResponse = {
      success: true,
      insights
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('[AI-INSIGHTS] Error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      })
    };
  }
};