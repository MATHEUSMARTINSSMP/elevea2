import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  SearchIcon, 
  TrendingUpIcon, 
  RefreshCwIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon,
  ExternalLinkIcon,
  RocketIcon,
  TargetIcon
} from 'lucide-react';
import { DashboardCardSkeleton } from '@/components/ui/loading-skeletons';

interface SEOData {
  meta: {
    title: string;
    description: string;
    keywords: string[];
    robots: string;
  };
  seoScore: {
    score: number;
    details: {
      title?: { score: number; status: string };
      description?: { score: number; status: string };
      keywords?: { score: number; status: string };
      structured?: { score: number; status: string };
      content?: { score: number; status: string };
    };
  };
  recommendations: string[];
  sitemap?: {
    pages: Array<{
      url: string;
      priority: string;
      lastmod: string;
    }>;
  };
}

interface SEOOptimizerProps {
  siteSlug: string;
  vipPin: string;
  businessData?: any;
}

export default function SEOOptimizer({ siteSlug, vipPin, businessData }: SEOOptimizerProps) {
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seoData, setSeoData] = useState<SEOData | null>(null);
  const [lastOptimization, setLastOptimization] = useState<string | null>(null);

  // Guarda de segurança VIP
  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <SearchIcon className="w-5 h-5" />
            SEO Automático
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

  const analyzeSEO = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/.netlify/functions/auto-seo-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          vipPin,
          action: 'analyze',
          businessData: businessData || { 
            name: siteSlug, 
            type: 'Negócio Local',
            location: 'Brasil'
          },
          siteContent: {}
        })
      });

      if (!response.ok) throw new Error('Falha na análise SEO');

      const result = await response.json();
      if (result.ok) {
        setSeoData(result.seo);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro na análise SEO:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const optimizeSEO = async () => {
    setOptimizing(true);
    
    try {
      // Executar otimização automática
      await analyzeSEO();
      
      // Atualizar sitemap
      await fetch(`/.netlify/functions/sitemap-generator?site=${siteSlug}&format=json`);
      
      setLastOptimization(new Date().toISOString());
    } catch (err: any) {
      console.error('Erro na otimização:', err);
      setError(err.message);
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
    analyzeSEO();
  }, [siteSlug, vipPin]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (score >= 60) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
      case 'good': return <TargetIcon className="w-4 h-4 text-yellow-400" />;
      default: return <AlertTriangleIcon className="w-4 h-4 text-red-400" />;
    }
  };

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <SearchIcon className="w-5 h-5" />
              SEO Automático
            </CardTitle>
            <CardDescription className="text-slate-400">
              Otimização automática para melhor posicionamento
            </CardDescription>
          </div>
          {seoData?.seoScore && (
            <Badge className={`px-3 py-1 rounded-full border ${getScoreColor(seoData.seoScore.score)}`}>
              Score: {seoData.seoScore.score}/100
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {seoData && (
          <>
            {/* Score Geral */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase tracking-wide">Score SEO</div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">{seoData.seoScore.score}/100</div>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        seoData.seoScore.score >= 80 ? 'bg-green-400' :
                        seoData.seoScore.score >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${seoData.seoScore.score}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase tracking-wide">Status</div>
                <div className="flex items-center gap-2">
                  {seoData.seoScore.score >= 80 ? (
                    <>
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                      <span className="text-green-400">Excelente</span>
                    </>
                  ) : seoData.seoScore.score >= 60 ? (
                    <>
                      <TargetIcon className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400">Bom</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangleIcon className="w-5 h-5 text-red-400" />
                      <span className="text-red-400">Precisa Melhorar</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Detalhes do Score */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-300">Análise Detalhada</div>
              
              {Object.entries(seoData.seoScore.details).map(([key, detail]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(detail.status)}
                    <span className="text-sm capitalize">
                      {key === 'title' && 'Título'}
                      {key === 'description' && 'Descrição'}
                      {key === 'keywords' && 'Palavras-chave'}
                      {key === 'structured' && 'Dados Estruturados'}
                      {key === 'content' && 'Conteúdo'}
                    </span>
                  </div>
                  <Badge className={`px-2 py-1 text-xs ${getScoreColor(detail.score)}`}>
                    {detail.score}pts
                  </Badge>
                </div>
              ))}
            </div>

            {/* Recomendações */}
            {seoData.recommendations && seoData.recommendations.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-300">Recomendações</div>
                <div className="space-y-2">
                  {seoData.recommendations.slice(0, 5).map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-blue-400/10 border border-blue-400/20">
                      <TrendingUpIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-300">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta Tags Preview */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-300">Preview nas Buscas</div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="space-y-2">
                  <div className="text-blue-400 text-sm hover:underline cursor-pointer">
                    {seoData.meta.title}
                  </div>
                  <div className="text-green-400 text-xs">
                    https://{siteSlug}.netlify.app
                  </div>
                  <div className="text-slate-300 text-sm leading-relaxed">
                    {seoData.meta.description}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Ações */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button 
            onClick={optimizeSEO} 
            disabled={optimizing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {optimizing ? (
              <>
                <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                Otimizando...
              </>
            ) : (
              <>
                <RocketIcon className="w-4 h-4 mr-2" />
                Otimizar SEO
              </>
            )}
          </Button>

          <Button 
            variant="outline" 
            onClick={() => window.open(`/.netlify/functions/sitemap-generator?site=${siteSlug}&format=xml`, '_blank')}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <ExternalLinkIcon className="w-4 h-4 mr-2" />
            Ver Sitemap
          </Button>
        </div>

        {lastOptimization && (
          <div className="text-xs text-slate-400 text-center pt-2">
            Última otimização: {new Date(lastOptimization).toLocaleString('pt-BR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}