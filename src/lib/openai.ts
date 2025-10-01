import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// SEGURANÇA CRÍTICA: API key apenas server-side
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface SentimentAnalysis {
  rating: number;
  confidence: number;
  emotion: string;
  summary: string;
}

export interface ContentSuggestion {
  title: string;
  subtitle: string;
  description: string;
  callToAction: string;
  keywords: string[];
}

export interface BusinessInsight {
  type: 'improvement' | 'opportunity' | 'warning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

// Análise de sentimento para feedbacks
export async function analyzeFeedbackSentiment(feedback: string, clientName?: string): Promise<SentimentAnalysis> {
  try {
    const prompt = `Analise o sentimento do seguinte feedback de cliente e forneça insights:

Feedback: "${feedback}"
${clientName ? `Cliente: ${clientName}` : ''}

Forneça uma análise em JSON com:
- rating: nota de 1 a 5 (1=muito negativo, 5=muito positivo)
- confidence: confiança da análise (0-1)
- emotion: emoção principal (feliz, frustrado, satisfeito, etc.)
- summary: resumo em uma frase da opinião do cliente

Responda APENAS com o JSON válido.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return {
      rating: Math.max(1, Math.min(5, Math.round(result.rating))),
      confidence: Math.max(0, Math.min(1, result.confidence)),
      emotion: result.emotion || 'neutro',
      summary: result.summary || 'Análise não disponível'
    };
  } catch (error) {
    console.error('Erro na análise de sentimento:', error);
    return {
      rating: 3,
      confidence: 0,
      emotion: 'neutro',
      summary: 'Erro na análise automática'
    };
  }
}

// Geração de conteúdo para sites
export async function generateSiteContent(businessType: string, businessName: string, businessDescription?: string): Promise<ContentSuggestion[]> {
  try {
    const prompt = `Gere conteúdo otimizado para um site de ${businessType} chamado "${businessName}".
${businessDescription ? `Descrição do negócio: ${businessDescription}` : ''}

Crie 5 seções com conteúdo persuasivo e otimizado para SEO:
1. Hero/Banner principal
2. Sobre nós/Serviços
3. Diferenciais/Benefícios
4. Depoimentos/Social Proof
5. Contato/Call to Action

Para cada seção, forneça:
- title: título impactante
- subtitle: subtítulo complementar
- description: descrição detalhada (2-3 parágrafos)
- callToAction: botão/ação clara
- keywords: palavras-chave SEO relevantes

Responda em JSON com array de objetos. Use linguagem brasileira, persuasiva e profissional.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return result.sections || [];
  } catch (error) {
    console.error('Erro na geração de conteúdo:', error);
    return [];
  }
}

// Chat de suporte inteligente
export async function generateSupportResponse(userMessage: string, context: string, businessType: string): Promise<string> {
  try {
    const prompt = `Você é um assistente de suporte especializado para negócios do tipo "${businessType}".

Contexto do negócio: ${context}
Pergunta do cliente: "${userMessage}"

Forneça uma resposta útil, profissional e empática que:
- Responda diretamente à pergunta
- Seja específica para este tipo de negócio
- Ofereça soluções práticas quando possível
- Mantenha tom amigável e profissional
- Use linguagem brasileira natural

Responda apenas com a mensagem de suporte, sem formatação extra.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 500,
    });

    return response.choices[0].message.content?.trim() || "Desculpe, não consegui processar sua pergunta. Entre em contato conosco diretamente.";
  } catch (error) {
    console.error('Erro no chat de suporte:', error);
    return "Desculpe, nosso sistema está temporariamente indisponível. Tente novamente em alguns minutos.";
  }
}

// Insights de negócio baseados em dados
export async function generateBusinessInsights(
  businessData: {
    type: string;
    name: string;
    feedbacks: Array<{ message: string; rating?: number; date?: string }>;
    traffic?: number;
    conversions?: number;
  }
): Promise<BusinessInsight[]> {
  try {
    const feedbackSummary = businessData.feedbacks
      .slice(0, 10)
      .map(f => `"${f.message}" (${f.rating ? `${f.rating}/5` : 'sem nota'})`)
      .join('\n');

    const prompt = `Analise os dados do negócio "${businessData.name}" (${businessData.type}) e gere insights acionáveis:

FEEDBACKS RECENTES:
${feedbackSummary}

MÉTRICAS:
- Tráfego: ${businessData.traffic || 'N/A'} visitas
- Conversões: ${businessData.conversions || 'N/A'}

Gere 3-5 insights em JSON com:
- type: 'improvement', 'opportunity' ou 'warning'
- title: título do insight
- description: explicação detalhada
- priority: 'high', 'medium' ou 'low'
- actionable: true/false

Foque em ações práticas que o negócio pode tomar para melhorar resultados.
Responda APENAS com JSON válido.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return result.insights || [];
  } catch (error) {
    console.error('Erro na geração de insights:', error);
    return [{
      type: 'warning',
      title: 'Análise Indisponível',
      description: 'Não foi possível gerar insights no momento.',
      priority: 'low',
      actionable: false
    }];
  }
}

// SEO automático
export async function generateSEOSuggestions(
  businessType: string,
  businessName: string,
  currentContent: string,
  location?: string
): Promise<{
  title: string;
  description: string;
  keywords: string[];
  suggestions: string[];
}> {
  try {
    const prompt = `Gere otimizações SEO para o site "${businessName}" (${businessType})${location ? ` em ${location}` : ''}.

CONTEÚDO ATUAL:
${currentContent.slice(0, 1000)}

Forneça em JSON:
- title: título SEO otimizado (50-60 caracteres)
- description: meta description (150-160 caracteres)
- keywords: array com 10-15 palavras-chave relevantes
- suggestions: array com 5-7 sugestões específicas de melhoria

Foque em SEO local brasileiro e otimização para pequenos negócios.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return {
      title: result.title || '',
      description: result.description || '',
      keywords: result.keywords || [],
      suggestions: result.suggestions || []
    };
  } catch (error) {
    console.error('Erro na geração de SEO:', error);
    return {
      title: '',
      description: '',
      keywords: [],
      suggestions: ['Erro ao gerar sugestões SEO']
    };
  }
}

// Geração de emails de marketing
export async function generateMarketingEmail(
  type: 'welcome' | 'followup' | 'promotion' | 'newsletter',
  businessData: {
    name: string;
    type: string;
    clientName?: string;
    service?: string;
  }
): Promise<{
  subject: string;
  content: string;
  callToAction: string;
}> {
  try {
    const emailTypes = {
      welcome: 'email de boas-vindas para novo cliente',
      followup: 'email de follow-up pós-serviço',
      promotion: 'email promocional de ofertas especiais',
      newsletter: 'newsletter mensal com novidades'
    };

    const prompt = `Crie um ${emailTypes[type]} para "${businessData.name}" (${businessData.type}).
${businessData.clientName ? `Cliente: ${businessData.clientName}` : ''}
${businessData.service ? `Serviço: ${businessData.service}` : ''}

Gere em JSON:
- subject: assunto do email (até 50 caracteres)
- content: corpo do email em HTML simples (máximo 300 palavras)
- callToAction: texto do botão principal

Use tom profissional mas amigável, linguagem brasileira e foque na conversão.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return {
      subject: result.subject || 'Mensagem importante',
      content: result.content || 'Conteúdo indisponível',
      callToAction: result.callToAction || 'Clique aqui'
    };
  } catch (error) {
    console.error('Erro na geração de email:', error);
    return {
      subject: 'Mensagem importante',
      content: 'Erro ao gerar conteúdo do email.',
      callToAction: 'Clique aqui'
    };
  }
}

// Geração de insights avançados de negócio
export async function generateAIInsights(prompt: string): Promise<{success: boolean; content?: string; error?: string}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 2000,
    });

    return {
      success: true,
      content: response.choices[0].message.content?.trim() || ''
    };
  } catch (error) {
    console.error('Erro na geração de insights:', error);
    return {
      success: false,
      error: error.message || 'Erro ao gerar insights'
    };
  }
}

export default openai;