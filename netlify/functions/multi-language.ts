import type { Handler } from '@netlify/functions'
import { rateLimitMiddleware, verifyVipAccess } from './shared/security'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

interface Translation {
  id: string;
  key: string;
  language: string;
  text: string;
  originalText: string;
  context?: string;
  lastUpdated: string;
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  enabled: boolean;
  isDefault: boolean;
}

// Idiomas suportados
const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', enabled: true, isDefault: true },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', enabled: true, isDefault: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', enabled: true, isDefault: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', enabled: false, isDefault: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', enabled: false, isDefault: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', enabled: false, isDefault: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', enabled: false, isDefault: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', enabled: false, isDefault: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', enabled: false, isDefault: false }
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
    await rateLimitMiddleware('multi-language', event)
    
    const body = JSON.parse(event.body || '{}')
    const { action, siteSlug, vipPin, language, text, key, translations, targetLanguages } = body

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
      case 'get_languages':
        return await getSupportedLanguages(siteSlug)
      
      case 'get_translations':
        return await getTranslations(siteSlug, language)
      
      case 'auto_translate':
        return await autoTranslateContent(text, targetLanguages, siteSlug)
      
      case 'save_translation':
        return await saveTranslation(siteSlug, key, language, text)
      
      case 'enable_language':
        return await enableLanguage(siteSlug, language)
      
      case 'disable_language':
        return await disableLanguage(siteSlug, language)
      
      case 'set_default_language':
        return await setDefaultLanguage(siteSlug, language)
      
      case 'bulk_translate':
        return await bulkTranslateContent(translations, targetLanguages, siteSlug)
      
      case 'get_translation_stats':
        return await getTranslationStats(siteSlug)
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Ação inválida' })
        }
    }

  } catch (error) {
    console.error('Erro no sistema multi-idioma:', error)
    
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

async function getSupportedLanguages(siteSlug: string) {
  try {
    // TODO: Buscar configurações específicas do site do Google Sheets
    // Por enquanto, retornar lista padrão
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        languages: SUPPORTED_LANGUAGES,
        defaultLanguage: SUPPORTED_LANGUAGES.find(l => l.isDefault)?.code || 'pt'
      })
    }

  } catch (error) {
    console.error('Erro ao obter idiomas:', error)
    throw error
  }
}

async function getTranslations(siteSlug: string, language: string) {
  try {
    // TODO: Buscar traduções do Google Sheets
    // Estrutura: site_slug | key | language | text | original_text | context | last_updated
    
    // Mock data para desenvolvimento
    const mockTranslations: Translation[] = [
      {
        id: '1',
        key: 'nav.home',
        language,
        text: language === 'en' ? 'Home' : language === 'es' ? 'Inicio' : 'Início',
        originalText: 'Início',
        lastUpdated: new Date().toISOString()
      },
      {
        id: '2',
        key: 'nav.about',
        language,
        text: language === 'en' ? 'About' : language === 'es' ? 'Acerca' : 'Sobre',
        originalText: 'Sobre',
        lastUpdated: new Date().toISOString()
      },
      {
        id: '3',
        key: 'nav.services',
        language,
        text: language === 'en' ? 'Services' : language === 'es' ? 'Servicios' : 'Serviços',
        originalText: 'Serviços',
        lastUpdated: new Date().toISOString()
      },
      {
        id: '4',
        key: 'nav.contact',
        language,
        text: language === 'en' ? 'Contact' : language === 'es' ? 'Contacto' : 'Contato',
        originalText: 'Contato',
        lastUpdated: new Date().toISOString()
      }
    ]

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        translations: mockTranslations,
        language,
        total: mockTranslations.length
      })
    }

  } catch (error) {
    console.error('Erro ao obter traduções:', error)
    throw error
  }
}

async function autoTranslateContent(text: string, targetLanguages: string[], siteSlug: string) {
  try {
    // Traduzir usando múltiplos métodos (Google Translate API, LibreTranslate, etc.)
    const translations: Record<string, string> = {}
    
    for (const lang of targetLanguages) {
      const translatedText = await translateText(text, 'pt', lang)
      translations[lang] = translatedText
    }

    // Salvar traduções no storage
    for (const [lang, translatedText] of Object.entries(translations)) {
      await saveTranslationToStorage(siteSlug, text, lang, translatedText)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        originalText: text,
        translations,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Erro na tradução automática:', error)
    throw error
  }
}

async function translateText(text: string, fromLang: string, toLang: string): Promise<string> {
  try {
    // Método 1: Google Translate API (se disponível)
    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      return await translateWithGoogle(text, fromLang, toLang)
    }
    
    // Método 2: LibreTranslate (gratuito)
    try {
      return await translateWithLibre(text, fromLang, toLang)
    } catch (error) {
      console.warn('LibreTranslate falhou, usando tradução de fallback')
    }
    
    // Método 3: Traduções básicas hardcoded para idiomas principais
    return translateWithFallback(text, fromLang, toLang)

  } catch (error) {
    console.error('Erro na tradução:', error)
    return text // Retornar texto original em caso de erro
  }
}

async function translateWithGoogle(text: string, fromLang: string, toLang: string): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: fromLang,
      target: toLang,
      format: 'text'
    })
  })

  if (!response.ok) {
    throw new Error(`Google Translate API error: ${response.status}`)
  }

  const result = await response.json()
  return result.data.translations[0].translatedText
}

async function translateWithLibre(text: string, fromLang: string, toLang: string): Promise<string> {
  // LibreTranslate público (pode ter rate limits)
  const url = 'https://libretranslate.de/translate'
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: fromLang,
      target: toLang,
      format: 'text'
    })
  })

  if (!response.ok) {
    throw new Error(`LibreTranslate error: ${response.status}`)
  }

  const result = await response.json()
  return result.translatedText
}

function translateWithFallback(text: string, fromLang: string, toLang: string): string {
  // Traduções básicas hardcoded para termos comuns
  const translations: Record<string, Record<string, string>> = {
    'en': {
      'Início': 'Home',
      'Sobre': 'About',
      'Serviços': 'Services', 
      'Contato': 'Contact',
      'Produtos': 'Products',
      'Empresa': 'Company',
      'Equipe': 'Team',
      'Portefólio': 'Portfolio',
      'Blog': 'Blog',
      'Notícias': 'News',
      'Carreiras': 'Careers',
      'Ajuda': 'Help',
      'Suporte': 'Support',
      'Privacidade': 'Privacy',
      'Termos': 'Terms'
    },
    'es': {
      'Início': 'Inicio',
      'Sobre': 'Acerca',
      'Serviços': 'Servicios',
      'Contato': 'Contacto',
      'Produtos': 'Productos',
      'Empresa': 'Empresa',
      'Equipe': 'Equipo',
      'Portefólio': 'Portafolio',
      'Blog': 'Blog',
      'Notícias': 'Noticias',
      'Carreiras': 'Carreras',
      'Ajuda': 'Ayuda',
      'Suporte': 'Soporte',
      'Privacidade': 'Privacidad',
      'Termos': 'Términos'
    }
  }

  const langTranslations = translations[toLang]
  if (langTranslations && langTranslations[text]) {
    return langTranslations[text]
  }

  // Se não houver tradução específica, retornar o texto original
  return text
}

async function saveTranslation(siteSlug: string, key: string, language: string, text: string) {
  try {
    await saveTranslationToStorage(siteSlug, key, language, text)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Tradução salva com sucesso',
        key,
        language,
        text
      })
    }

  } catch (error) {
    console.error('Erro ao salvar tradução:', error)
    throw error
  }
}

async function saveTranslationToStorage(siteSlug: string, key: string, language: string, text: string) {
  // TODO: Salvar no Google Sheets
  console.log('Salvando tradução:', { siteSlug, key, language, text })
  
  // Em produção, implementar salvamento real no Google Sheets
  // Estrutura sugerida da planilha "translations":
  // site_slug | key | language | text | original_text | context | last_updated
}

async function enableLanguage(siteSlug: string, language: string) {
  try {
    // TODO: Atualizar configuração no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: `Idioma ${language} habilitado`,
        language
      })
    }

  } catch (error) {
    console.error('Erro ao habilitar idioma:', error)
    throw error
  }
}

async function disableLanguage(siteSlug: string, language: string) {
  try {
    // TODO: Atualizar configuração no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: `Idioma ${language} desabilitado`,
        language
      })
    }

  } catch (error) {
    console.error('Erro ao desabilitar idioma:', error)
    throw error
  }
}

async function setDefaultLanguage(siteSlug: string, language: string) {
  try {
    // TODO: Atualizar configuração no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: `Idioma padrão alterado para ${language}`,
        defaultLanguage: language
      })
    }

  } catch (error) {
    console.error('Erro ao definir idioma padrão:', error)
    throw error
  }
}

async function bulkTranslateContent(translations: Record<string, string>, targetLanguages: string[], siteSlug: string) {
  try {
    const results: Record<string, Record<string, string>> = {}
    
    for (const [key, text] of Object.entries(translations)) {
      results[key] = {}
      
      for (const lang of targetLanguages) {
        const translatedText = await translateText(text, 'pt', lang)
        results[key][lang] = translatedText
        
        // Salvar tradução
        await saveTranslationToStorage(siteSlug, key, lang, translatedText)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        results,
        translated: Object.keys(translations).length,
        languages: targetLanguages.length,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Erro na tradução em lote:', error)
    throw error
  }
}

async function getTranslationStats(siteSlug: string) {
  try {
    // TODO: Calcular estatísticas do Google Sheets
    
    // Mock data para desenvolvimento
    const stats = {
      totalKeys: 24,
      completedLanguages: 3,
      partialLanguages: 2,
      completionRates: {
        'en': 100,
        'es': 100, 
        'fr': 67,
        'de': 33
      },
      lastUpdate: new Date().toISOString(),
      autoTranslationUsage: 85,
      manualReviews: 12
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        stats
      })
    }

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    throw error
  }
}