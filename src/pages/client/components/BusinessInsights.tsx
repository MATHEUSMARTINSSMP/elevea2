import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Users, Zap, Lightbulb } from 'lucide-react';

interface Insight {
  category: 'performance' | 'content' | 'ux' | 'marketing' | 'technical';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
  actionItems: string[];
}

interface InsightsData {
  summary: string;
  recommendations: Insight[];
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
}

interface BusinessInsightsProps {
  siteSlug: string;
  businessType: string;
  businessName: string;
  vipPin: string;
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
}

const categoryIcons = {
  performance: Zap,
  content: Target,
  ux: Users,
  marketing: TrendingUp,
  technical: AlertTriangle
};

const categoryColors = {
  performance: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  content: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  ux: 'text-green-400 bg-green-400/10 border-green-400/20',
  marketing: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  technical: 'text-red-400 bg-red-400/10 border-red-400/20'
};

const priorityColors = {
  high: 'text-red-400 bg-red-400/10 border-red-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  low: 'text-green-400 bg-green-400/10 border-green-400/20'
};

const ScoreCard = ({ title, score, color = 'blue' }: { title: string; score: number; color?: string }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">{title}</div>
    <div className="flex items-center justify-between">
      <span className="text-2xl font-bold text-white">{score}/100</span>
      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${
            score >= 80 ? 'from-green-500 to-green-400' :
            score >= 60 ? 'from-yellow-500 to-yellow-400' :
            'from-red-500 to-red-400'
          } transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  </div>
);

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <div className="w-4 h-4 bg-slate-400 rounded-full" />;
};

export default function BusinessInsights({ 
  siteSlug, 
  businessType, 
  businessName, 
  vipPin, 
  analytics, 
  feedback 
}: BusinessInsightsProps) {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          businessType,
          analytics,
          feedback,
          vipPin
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Falha ao gerar insights');
      }

      setInsights(data.insights);
    } catch (err) {
      console.error('Erro ao buscar insights:', err);
      setError(err.message || 'Erro ao carregar insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vipPin && siteSlug) {
      fetchInsights();
    }
  }, [siteSlug, vipPin]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-700 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-center">
        <div className="py-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-lg text-white mb-2">Erro nos Insights</p>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button 
            onClick={fetchInsights}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-center">
        <div className="py-8">
          <Lightbulb className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-lg text-white mb-2">Insights IA</p>
          <p className="text-sm text-slate-400 mb-4">Gere insights inteligentes baseados nos dados do seu negócio</p>
          <button 
            onClick={fetchInsights}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Gerar Insights
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Insights de Negócio IA</h2>
          <p className="text-sm text-slate-400">{businessName}</p>
        </div>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 text-sm rounded-lg transition-colors"
        >
          Atualizar
        </button>
      </div>

      {/* Resumo Executivo */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Resumo Executivo</h3>
        </div>
        <p className="text-slate-300 leading-relaxed">{insights.summary}</p>
      </div>

      {/* Scores de Performance */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ScoreCard title="Geral" score={insights.score.overall} />
        <ScoreCard title="Performance" score={insights.score.performance} />
        <ScoreCard title="UX" score={insights.score.userExperience} />
        <ScoreCard title="Conteúdo" score={insights.score.contentQuality} />
        <ScoreCard title="Marketing" score={insights.score.marketingEffectiveness} />
      </div>

      {/* Tendências */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Tráfego</span>
            <TrendIcon trend={insights.trends.traffic} />
          </div>
          <div className="text-lg font-semibold text-white mt-1">
            {insights.trends.traffic === 'up' ? 'Crescendo' : 
             insights.trends.traffic === 'down' ? 'Decaindo' : 'Estável'}
          </div>
        </div>
        
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Conversões</span>
            <TrendIcon trend={insights.trends.conversions} />
          </div>
          <div className="text-lg font-semibold text-white mt-1">
            {insights.trends.conversions === 'up' ? 'Melhorando' : 
             insights.trends.conversions === 'down' ? 'Piorando' : 'Estável'}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Engajamento</span>
            <TrendIcon trend={insights.trends.engagement} />
          </div>
          <div className="text-lg font-semibold text-white mt-1">
            {insights.trends.engagement === 'up' ? 'Alto' : 
             insights.trends.engagement === 'down' ? 'Baixo' : 'Moderado'}
          </div>
        </div>
      </div>

      {/* Recomendações */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Recomendações</h3>
        {insights.recommendations.map((rec, index) => {
          const Icon = categoryIcons[rec.category];
          return (
            <div key={index} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${categoryColors[rec.category]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{rec.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded border ${priorityColors[rec.priority]}`}>
                        {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'} Prioridade
                      </span>
                      <span className="text-xs text-slate-400">{rec.category}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-slate-300 mb-4">{rec.description}</p>
              
              {rec.impact && (
                <div className="mb-4">
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Impacto Esperado:</span>
                  <p className="text-sm text-green-400 mt-1">{rec.impact}</p>
                </div>
              )}

              {rec.actionItems.length > 0 && (
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Ações Sugeridas:</span>
                  <ul className="mt-2 space-y-1">
                    {rec.actionItems.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Próximos Passos */}
      {insights.nextSteps.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Próximos Passos Recomendados</h3>
          <ol className="space-y-3">
            {insights.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white text-sm rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <span className="text-slate-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}