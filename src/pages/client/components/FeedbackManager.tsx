import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  RefreshCw, 
  Check, 
  X, 
  MessageSquare,
  TrendingUp,
  User,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import { DashboardCardSkeleton } from '@/components/ui/loading-skeletons';

interface Feedback {
  id: string;
  name: string;
  email: string;
  phone: string;
  rating: number;
  message: string;
  source: string;
  status: 'pending' | 'approved' | 'rejected';
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  averageRating: number;
}

interface FeedbackManagerProps {
  siteSlug: string;
  vipPin: string;
}

export default function FeedbackManager({ siteSlug, vipPin }: FeedbackManagerProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Guarda de segurança - verificar se props VIP estão presentes
  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedback dos Clientes
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

  const fetchFeedbacks = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch('/.netlify/functions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          siteSlug,
          vipPin,
          status: statusFilter,
          limit: 50
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar feedbacks');

      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Erro ao carregar feedbacks');

      setFeedbacks(data.data?.feedbacks || []);
      setStats(data.data?.stats || null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar feedbacks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject', feedbackId: string) => {
    setActionLoading(feedbackId);
    try {
      const response = await fetch('/.netlify/functions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          siteSlug,
          vipPin,
          feedbackId
        })
      });

      if (!response.ok) throw new Error('Falha ao processar ação');

      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Erro ao processar ação');

      // Atualizar feedback localmente
      setFeedbacks(prev => prev.map(f => 
        f.id === feedbackId 
          ? { ...f, status: action === 'approve' ? 'approved' : 'rejected' }
          : f
      ));

      // Recarregar estatísticas
      await fetchFeedbacks(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar ação');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [siteSlug, vipPin, statusFilter]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 sm:h-4 sm:w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} 
      />
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString || dateString === 'Data inválida' || dateString === 'Invalid Date') {
        return 'Data não disponível';
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data não disponível';
      }
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data não disponível';
    }
  };

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-red-600 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback dos Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchFeedbacks()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <MessageSquare className="w-4 w-4 sm:h-5 sm:w-5" />
              Feedback dos Clientes
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              Gerencie os feedbacks recebidos
            </CardDescription>
          </div>
          <Button 
            onClick={() => fetchFeedbacks(true)} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
            className="text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="text-center p-3 sm:p-4 bg-white/10 rounded-lg">
              <div className="text-lg sm:text-xl font-bold text-blue-400 mb-1">
                {stats.total || 0}
              </div>
              <p className="text-xs sm:text-sm text-slate-400">Total</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-white/10 rounded-lg">
              <div className="text-lg sm:text-xl font-bold text-yellow-400 mb-1">
                {stats.pending || 0}
              </div>
              <p className="text-xs sm:text-sm text-slate-400">Pendentes</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-white/10 rounded-lg">
              <div className="text-lg sm:text-xl font-bold text-green-400 mb-1">
                {stats.approved || 0}
              </div>
              <p className="text-xs sm:text-sm text-slate-400">Aprovados</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-white/10 rounded-lg">
              <div className="text-lg sm:text-xl font-bold text-purple-400 mb-1">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
              </div>
              <p className="text-xs sm:text-sm text-slate-400">Avaliação Média</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status as any)}
              className={`text-xs font-medium ${
                statusFilter === status 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' 
                  : 'border-white/30 text-white hover:bg-white/10 bg-transparent'
              }`}
            >
              {status === 'all' ? 'Todos' : getStatusLabel(status)}
            </Button>
          ))}
        </div>

        {/* Lista de Feedbacks */}
        <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
          {feedbacks.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
              <h4 className="text-sm sm:text-base mb-2">Nenhum feedback encontrado</h4>
              <p className="text-xs sm:text-sm text-slate-400">
                {statusFilter === 'all' ? 'Ainda não há feedbacks' : `Nenhum feedback ${getStatusLabel(statusFilter).toLowerCase()}`}
              </p>
            </div>
          ) : (
            feedbacks.map((feedback) => (
              <div key={feedback.id} className="border border-white/10 rounded-lg p-3 sm:p-4 bg-white/5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm sm:text-base text-white">
                        {feedback.name}
                      </h4>
                      <Badge className={`text-xs ${getStatusColor(feedback.status)}`}>
                        {getStatusLabel(feedback.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">{renderStars(feedback.rating)}</div>
                      <span className="text-xs text-slate-400">
                        {formatDate(feedback.createdAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-300 mb-3">
                      {feedback.message}
                    </p>
                    
                    {(feedback.email || feedback.phone) && (
                      <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-2">
                        {feedback.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {feedback.email}
                          </div>
                        )}
                        {feedback.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {feedback.phone}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {feedback.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction('approve', feedback.id)}
                        disabled={actionLoading === feedback.id}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction('reject', feedback.id)}
                        disabled={actionLoading === feedback.id}
                        className="text-xs border-red-500 text-red-400 hover:bg-red-500/10 bg-transparent"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Ações do Feedback */}
                <div className="mt-3 space-y-3">
                  {/* Enviar para WhatsApp */}
                  {feedback.phone && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-green-300">Contatar Cliente</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/55${feedback.phone.replace(/\D/g, '')}?text=Olá, aqui é da ${siteSlug}, recebemos seu feedback e gostaríamos de saber mais sobre sua experiência.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded text-center transition-colors"
                        >
                          Abrir WhatsApp
                        </a>
                        <span className="text-xs text-green-200/70">
                          {feedback.phone}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Enviar para o Site */}
                  {feedback.status === 'approved' && (
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-300">Publicar no Site</span>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-blue-200/70">
                          Este feedback foi aprovado e pode ser publicado no site do cliente.
                        </div>
                        <Button 
                          size="sm" 
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={async () => {
                            try {
                              const confirmed = confirm(
                                `📝 Publicar Feedback no Site\n\n` +
                                `Cliente: ${feedback.name}\n` +
                                `Avaliação: ${feedback.rating}/5 estrelas\n\n` +
                                `Este feedback será publicado no site do cliente. Deseja continuar?`
                              );
                              
                              if (!confirmed) return;
                              
                              const response = await fetch('/.netlify/functions/client-api', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'publish_feedback_to_site',
                                  site: siteSlug,
                                  feedbackId: feedback.id,
                                  pin: vipPin
                                })
                              });
                              
                              const result = await response.json();
                              
                              if (result.ok) {
                                alert(`✅ ${result.message}`);
                                // Recarregar feedbacks para atualizar status
                                fetchFeedbacks();
                              } else {
                                alert(`❌ Erro ao publicar: ${result.error}`);
                              }
                            } catch (error) {
                              console.error('Erro ao publicar feedback:', error);
                              alert(`❌ Erro na requisição: ${error.message}`);
                            }
                          }}
                        >
                          Publicar no Site
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}