import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  GlobeIcon, 
  LanguagesIcon,
  ArrowRightLeftIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  PlusIcon,
  SettingsIcon,
  BarChart3Icon,
  ZapIcon
} from 'lucide-react';
import { DashboardCardSkeleton } from '@/components/ui/loading-skeletons';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  enabled: boolean;
  isDefault: boolean;
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

interface TranslationStats {
  totalKeys: number;
  completedLanguages: number;
  partialLanguages: number;
  completionRates: Record<string, number>;
  lastUpdate: string;
  autoTranslationUsage: number;
  manualReviews: number;
}

interface MultiLanguageManagerProps {
  siteSlug: string;
  vipPin: string;
}

export default function MultiLanguageManager({ siteSlug, vipPin }: MultiLanguageManagerProps) {
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [stats, setStats] = useState<TranslationStats | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [newTranslationKey, setNewTranslationKey] = useState('');
  const [newTranslationText, setNewTranslationText] = useState('');
  const [activeTab, setActiveTab] = useState<'languages' | 'translations' | 'stats'>('languages');

  // Guarda de segurança VIP
  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <GlobeIcon className="w-5 h-5" />
            Multi-Idioma
          </CardTitle>
          <CardDescription className="text-slate-400">
            Acesso restrito: Recurso VIP não disponível
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">Este recurso requer acesso VIP.</p>
            <Button variant="outline" disabled>
              Acesso Bloqueado
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const loadLanguages = async () => {
    try {
      const response = await fetch('/.netlify/functions/multi-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_languages',
          siteSlug,
          vipPin
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar idiomas');

      const result = await response.json();
      if (result.ok) {
        setLanguages(result.languages);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar idiomas:', err);
      setError(err.message);
    }
  };

  const loadTranslations = async (language: string) => {
    try {
      const response = await fetch('/.netlify/functions/multi-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_translations',
          siteSlug,
          vipPin,
          language
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar traduções');

      const result = await response.json();
      if (result.ok) {
        setTranslations(result.translations);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar traduções:', err);
      setError(err.message);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/.netlify/functions/multi-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_translation_stats',
          siteSlug,
          vipPin
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar estatísticas');

      const result = await response.json();
      if (result.ok) {
        setStats(result.stats);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas:', err);
      setError(err.message);
    }
  };

  const autoTranslate = async (text: string, targetLanguages: string[]) => {
    setTranslating(true);
    
    try {
      const response = await fetch('/.netlify/functions/multi-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_translate',
          siteSlug,
          vipPin,
          text,
          targetLanguages
        })
      });

      if (!response.ok) throw new Error('Falha na tradução automática');

      const result = await response.json();
      if (result.ok) {
        // Recarregar traduções
        await loadTranslations(selectedLanguage);
        setError(null);
        return result.translations;
      } else {
        throw new Error(result.error || 'Erro na tradução');
      }
    } catch (err: any) {
      console.error('Erro na tradução automática:', err);
      setError(err.message);
    } finally {
      setTranslating(false);
    }
  };

  const toggleLanguage = async (languageCode: string, enable: boolean) => {
    try {
      const response = await fetch('/.netlify/functions/multi-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: enable ? 'enable_language' : 'disable_language',
          siteSlug,
          vipPin,
          language: languageCode
        })
      });

      if (!response.ok) throw new Error('Falha ao alterar idioma');

      const result = await response.json();
      if (result.ok) {
        await loadLanguages();
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao alterar idioma:', err);
      setError(err.message);
    }
  };

  const saveTranslation = async () => {
    if (!newTranslationKey || !newTranslationText) {
      setError('Chave e texto são obrigatórios');
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/multi-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_translation',
          siteSlug,
          vipPin,
          key: newTranslationKey,
          language: selectedLanguage,
          text: newTranslationText
        })
      });

      if (!response.ok) throw new Error('Falha ao salvar tradução');

      const result = await response.json();
      if (result.ok) {
        setNewTranslationKey('');
        setNewTranslationText('');
        await loadTranslations(selectedLanguage);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro ao salvar');
      }
    } catch (err: any) {
      console.error('Erro ao salvar tradução:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadLanguages(),
        loadTranslations(selectedLanguage),
        loadStats()
      ]);
      setLoading(false);
    };

    loadData();
  }, [siteSlug, vipPin]);

  useEffect(() => {
    if (activeTab === 'translations') {
      loadTranslations(selectedLanguage);
    }
  }, [selectedLanguage, activeTab]);

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <GlobeIcon className="w-5 h-5" />
              Sistema Multi-Idioma
            </CardTitle>
            <CardDescription className="text-slate-400">
              Traduza seu site para múltiplos idiomas automaticamente
            </CardDescription>
          </div>
          <Badge className="px-3 py-1 bg-blue-600/20 text-blue-300 border-blue-500/30">
            {languages.filter(l => l.enabled).length} idiomas ativos
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Abas */}
        <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('languages')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'languages' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <LanguagesIcon className="w-4 h-4 inline mr-2" />
            Idiomas
          </button>
          <button
            onClick={() => setActiveTab('translations')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'translations' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <ArrowRightLeftIcon className="w-4 h-4 inline mr-2" />
            Traduções
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'stats' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3Icon className="w-4 h-4 inline mr-2" />
            Estatísticas
          </button>
        </div>

        {/* Conteúdo das Abas */}
        {activeTab === 'languages' && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-slate-300">Idiomas Disponíveis</div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {languages.map((language) => (
                <div 
                  key={language.code} 
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{language.flag}</span>
                    <div>
                      <div className="font-medium">{language.nativeName}</div>
                      <div className="text-xs text-slate-400">{language.name}</div>
                    </div>
                    {language.isDefault && (
                      <Badge className="px-2 py-1 text-xs bg-green-600/20 text-green-300 border-green-500/30">
                        Padrão
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {language.enabled ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangleIcon className="w-5 h-5 text-slate-500" />
                    )}
                    
                    <Button
                      size="sm"
                      variant={language.enabled ? "outline" : "default"}
                      onClick={() => toggleLanguage(language.code, !language.enabled)}
                      disabled={language.isDefault}
                      className={language.enabled 
                        ? "border-red-500/50 text-red-400 hover:bg-red-500/10" 
                        : "bg-green-600 hover:bg-green-700 text-white"
                      }
                    >
                      {language.enabled ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'translations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-300">Traduções</div>
              
              <div className="flex items-center gap-3">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm"
                >
                  {languages.filter(l => l.enabled && !l.isDefault).map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.nativeName}
                    </option>
                  ))}
                </select>
                
                <Button
                  size="sm"
                  onClick={() => autoTranslate('Teste de tradução', [selectedLanguage])}
                  disabled={translating}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {translating ? (
                    <RefreshCwIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <ZapIcon className="w-4 h-4" />
                  )}
                  Traduzir Tudo
                </Button>
              </div>
            </div>

            {/* Adicionar Nova Tradução */}
            <div className="p-4 rounded-lg bg-blue-400/10 border border-blue-400/20">
              <div className="text-sm font-medium text-blue-300 mb-3">Adicionar Tradução</div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Input
                  placeholder="Chave (ex: nav.home)"
                  value={newTranslationKey}
                  onChange={(e) => setNewTranslationKey(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-slate-400"
                />
                <Input
                  placeholder="Texto traduzido"
                  value={newTranslationText}
                  onChange={(e) => setNewTranslationText(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-slate-400"
                />
                <Button onClick={saveTranslation} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Lista de Traduções */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {translations.map((translation) => (
                <div 
                  key={translation.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-blue-300">{translation.key}</div>
                    <div className="text-sm text-white truncate">{translation.text}</div>
                    <div className="text-xs text-slate-400">Original: {translation.originalText}</div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <SettingsIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-slate-300">Estatísticas de Tradução</div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-white">{stats.totalKeys}</div>
                <div className="text-xs text-slate-400">Chaves Totais</div>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-green-400">{stats.completedLanguages}</div>
                <div className="text-xs text-slate-400">Idiomas Completos</div>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.partialLanguages}</div>
                <div className="text-xs text-slate-400">Idiomas Parciais</div>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-purple-400">{stats.autoTranslationUsage}%</div>
                <div className="text-xs text-slate-400">Tradução Automática</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-300">Progresso por Idioma</div>
              
              {Object.entries(stats.completionRates).map(([lang, rate]) => (
                <div key={lang} className="flex items-center gap-3">
                  <div className="w-8 font-mono text-sm text-slate-300">{lang}</div>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        rate === 100 ? 'bg-green-400' :
                        rate >= 80 ? 'bg-blue-400' :
                        rate >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-slate-300">{rate}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button 
            onClick={() => window.location.reload()} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          
          <Button 
            variant="outline" 
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              // TODO: Exportar traduções
              console.log('Exportar traduções')
            }}
          >
            Exportar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}