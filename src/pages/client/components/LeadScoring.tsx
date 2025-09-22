import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TargetIcon, 
  TrendingUpIcon,
  FlameIcon,
  ThermometerIcon,
  SnowflakeIcon,
  PhoneIcon,
  MailIcon,
  BuildingIcon,
  MapPinIcon,
  RefreshCwIcon,
  StarIcon
} from 'lucide-react';
import { DashboardCardSkeleton } from '@/components/ui/loading-skeletons';

interface Lead {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  source?: string;
  timestamp?: string;
  score?: number;
  priority?: 'hot' | 'warm' | 'cold';
  demographics?: {
    location?: string;
    businessSize?: string;
    budget?: string;
  };
}

interface LeadSummary {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  averageScore: number;
}

interface LeadScoringProps {
  siteSlug: string;
  vipPin: string;
}

export default function LeadScoring({ siteSlug, vipPin }: LeadScoringProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadSummary | null>(null);

  // Guarda de segurança VIP
  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TargetIcon className="w-5 h-5" />
            Lead Scoring
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

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/.netlify/functions/lead-scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_scored_leads',
          siteSlug,
          vipPin
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar leads');

      const result = await response.json();
      if (result.ok) {
        setLeads(result.leads || []);
        setSummary(result.summary || null);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar leads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [siteSlug, vipPin]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'hot': return <FlameIcon className="w-4 h-4 text-red-400" />;
      case 'warm': return <ThermometerIcon className="w-4 h-4 text-yellow-400" />;
      default: return <SnowflakeIcon className="w-4 h-4 text-blue-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'hot': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'warm': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const formatSource = (source: string) => {
    const sources = {
      'organic': 'Busca Orgânica',
      'google_ads': 'Google Ads',
      'facebook': 'Facebook',
      'whatsapp': 'WhatsApp',
      'referral': 'Indicação',
      'direct': 'Acesso Direto',
      'email': 'E-mail Marketing'
    };
    return sources[source as keyof typeof sources] || source;
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
              <TargetIcon className="w-5 h-5" />
              Lead Scoring
            </CardTitle>
            <CardDescription className="text-slate-400">
              Pontuação automática para priorizar leads quentes
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={loadLeads}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Resumo */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Total Leads</div>
              <div className="text-2xl font-bold text-white">{summary.total}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Quentes</div>
              <div className="text-2xl font-bold text-red-400">{summary.hot}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Mornos</div>
              <div className="text-2xl font-bold text-yellow-400">{summary.warm}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Frios</div>
              <div className="text-2xl font-bold text-blue-400">{summary.cold}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Score Médio</div>
              <div className="text-2xl font-bold text-white">{summary.averageScore}</div>
            </div>
          </div>
        )}

        {/* Lista de Leads */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-slate-300">
            Leads Pontuados ({leads.length})
          </div>

          {leads.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <TargetIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum lead encontrado</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {leads.map((lead) => (
                <div key={lead.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-2">
                        {getPriorityIcon(lead.priority || 'cold')}
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-white truncate">
                            {lead.name || 'Lead sem nome'}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            {lead.company && (
                              <span className="flex items-center gap-1">
                                <BuildingIcon className="w-3 h-3" />
                                {lead.company}
                              </span>
                            )}
                            {lead.demographics?.location && (
                              <span className="flex items-center gap-1">
                                <MapPinIcon className="w-3 h-3" />
                                {lead.demographics.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(lead.priority || 'cold')}`}>
                          {lead.priority?.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Score e Fonte */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <StarIcon className="w-4 h-4 text-yellow-400" />
                          <span className={`text-sm font-bold ${getScoreColor(lead.score || 0)}`}>
                            {lead.score || 0}/100
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Fonte: {formatSource(lead.source || 'unknown')}
                        </div>
                        {lead.timestamp && (
                          <div className="text-xs text-slate-400">
                            {new Date(lead.timestamp).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>

                      {/* Contatos */}
                      <div className="flex items-center gap-4 mb-3">
                        {lead.email && (
                          <div className="flex items-center gap-1 text-xs text-slate-300">
                            <MailIcon className="w-3 h-3" />
                            {lead.email}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-xs text-slate-300">
                            <PhoneIcon className="w-3 h-3" />
                            {lead.phone}
                          </div>
                        )}
                      </div>

                      {/* Mensagem */}
                      {lead.message && (
                        <p className="text-sm text-slate-300 line-clamp-2 mb-3">
                          "{lead.message}"
                        </p>
                      )}

                      {/* Score Visual */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              (lead.score || 0) >= 70 ? 'bg-red-400' :
                              (lead.score || 0) >= 40 ? 'bg-yellow-400' : 'bg-blue-400'
                            }`}
                            style={{ width: `${lead.score || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-12">
                          {lead.score || 0}%
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2">
                      {lead.phone && (
                        <Button 
                          size="sm"
                          className="text-xs bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => window.open(`tel:${lead.phone}`, '_self')}
                        >
                          <PhoneIcon className="w-3 h-3 mr-1" />
                          Ligar
                        </Button>
                      )}
                      {lead.email && (
                        <Button 
                          size="sm"
                          variant="outline"
                          className="text-xs border-white/20 text-white hover:bg-white/10"
                          onClick={() => window.open(`mailto:${lead.email}?subject=Contato - ${lead.name || 'Lead'}`, '_self')}
                        >
                          <MailIcon className="w-3 h-3 mr-1" />
                          E-mail
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legenda */}
        <div className="p-4 rounded-lg bg-blue-400/10 border border-blue-400/20">
          <div className="text-sm font-medium text-blue-300 mb-2">Como funciona o Lead Scoring:</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-xs text-blue-300/80">
            <div>🔥 70-100: Lead QUENTE - Contactar imediatamente</div>
            <div>🌡️ 40-69: Lead MORNO - Contactar em 24h</div>
            <div>❄️ 0-39: Lead FRIO - Nurturing por e-mail</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}