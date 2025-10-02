import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, User as UserIcon, RefreshCw, ExternalLink, Calendar, MessageSquare } from "lucide-react";

interface GoogleReviewsProps {
  siteSlug: string;
  vipPin: string;
  userEmail?: string;
}

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  response?: string;
}

interface ReviewsData {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  businessName?: string;
  businessAddress?: string;
}

export default function GoogleReviews({ siteSlug, vipPin, userEmail }: GoogleReviewsProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [needsConnection, setNeedsConnection] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Verificar se é VIP
  if (!vipPin || vipPin.length < 4) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Google Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <Star className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Acesso VIP Necessário</h3>
            <p className="text-slate-400 text-sm">
              Esta funcionalidade está disponível apenas para usuários VIP.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fetchReviews = async (isRefresh = false) => {
    const now = Date.now();
    if (!isRefresh && now - lastFetch < 5000) { // 5 seconds debounce
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      console.log('🔍 Buscando reviews para:', { site: siteSlug, email: userEmail });
      
      const response = await fetch('/.netlify/functions/client-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'gmb_get_reviews',
          site: siteSlug,
          email: userEmail
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('📊 Resultado da API:', result);
      
      if (result.ok) {
        setReviewsData(result.data);
        setError(null);
        setIsConnected(true);
        setNeedsConnection(false);
        setLastFetch(now);
        console.log('✅ Reviews carregados com sucesso');
      } else {
        console.log('❌ Erro na API:', result.error);
        if (result.error?.includes('Credenciais não encontradas') || 
            result.error?.includes('Conecte sua conta Google')) {
          setNeedsConnection(true);
          setError(null);
          console.log('🔐 Credenciais não encontradas, pedindo conexão');
        } else {
          const errorMsg = result.error || 'Erro desconhecido';
          console.error('❌ Erro específico da API:', errorMsg);
          throw new Error(errorMsg);
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar reviews:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchReviews();
    }
  }, [siteSlug, userEmail]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-600'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Google Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-2 text-slate-300">Carregando reviews...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Google Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <Star className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Erro ao Carregar</h3>
            <p className="text-slate-400 text-sm mb-4">{error}</p>
            <Button onClick={() => fetchReviews(true)} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (needsConnection) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Google Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Conectar Google My Business</h3>
            <p className="text-slate-400 text-sm mb-4">
              Para visualizar e gerenciar seus reviews do Google, conecte sua conta Google My Business.
            </p>
              {userEmail && (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={async () => {
                    // Confirmar antes de redirecionar
                    const confirmed = confirm(
                      '🔗 Conectar Google My Business\n\n' +
                      'Você será redirecionado para o Google para autorizar o acesso às suas avaliações.\n\n' +
                      'Deseja continuar?'
                    );
                    
                    if (!confirmed) return;
                    
                    try {
                      console.log('🔄 Iniciando OAuth para:', { site: siteSlug, email: userEmail });
                      
                      const response = await fetch('/.netlify/functions/gmb-oauth-start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          siteSlug: siteSlug,
                          email: userEmail
                        })
                      });
                      
                      const result = await response.json();
                      console.log('📊 OAuth start result:', result);
                      
                      if (result.ok && result.authUrl) {
                        // Salvar state para validação no callback
                        const state = JSON.stringify({
                          site: siteSlug,
                          email: userEmail,
                          ts: Date.now(),
                          n: Math.random().toString(36).slice(2)
                        });
                        sessionStorage.setItem('gmb_state', state);
                        
                        // Mostrar mensagem antes do redirect
                        alert('✅ Redirecionando para o Google...\n\nApós autorizar, você será redirecionado de volta para o dashboard.');
                        
                        // Redirecionar para Google OAuth
                        window.location.href = result.authUrl;
                      } else {
                        console.error('❌ Erro no OAuth start:', result.error);
                        alert(`❌ Erro ao iniciar OAuth:\n\n${result.error}`);
                      }
                    } catch (error) {
                      console.error('❌ Erro na requisição OAuth:', error);
                      alert(`❌ Erro na requisição:\n\n${error.message}`);
                    }
                  }}
                >
                  🔗 Conectar Google My Business
                </Button>
              )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Google Reviews
          </CardTitle>
          <div className="flex items-center gap-2">
            {userEmail && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch('/.netlify/functions/client-api', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'gmb_diagnose',
                          site: siteSlug,
                          email: userEmail
                        })
                      });
                      
                      const result = await response.json();
                      console.log('🔍 Diagnóstico GMB:', result);
                      
                      if (result.ok) {
                        const d = result.diagnosis;
                        alert(`📊 DIAGNÓSTICO GMB:
                        
✅ Site encontrado: ${d.site_encontrado ? 'SIM' : 'NÃO'}
✅ Settings JSON válido: ${d.settings_json_valido ? 'SIM' : 'NÃO'}  
✅ Tokens presentes: ${d.gmb_tokens_presente ? 'SIM' : 'NÃO'}
📋 Linhas problemáticas: ${d.linhas_problematicas.length}
🔑 PropertiesService: ${d.properties_service.tem_client_id ? 'OK' : 'FALTANDO'}

Veja o console para detalhes completos.`);
                      }
                    } catch (e) {
                      console.error('Erro no diagnóstico:', e);
                    }
                  }}
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                >
                  🔍 Diagnóstico
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    if (confirm('Tem certeza que deseja desconectar sua conta Google?')) {
                      try {
                        const response = await fetch('/.netlify/functions/client-api', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'gmb_disconnect',
                            site: siteSlug,
                            email: userEmail
                          })
                        });
                        
                        if (response.ok) {
                          setNeedsConnection(true);
                          setIsConnected(false);
                          setReviewsData(null);
                        }
                      } catch (e) {
                        console.error('Erro ao desconectar:', e);
                      }
                    }
                  }}
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  Desconectar Google
                </Button>
              </div>
            )}
            <Button
              onClick={() => fetchReviews(true)}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {reviewsData && (
          <div className="space-y-6">
            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {reviewsData.averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  {renderStars(Math.round(reviewsData.averageRating))}
                </div>
                <div className="text-sm text-slate-400">Avaliação Média</div>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {reviewsData.totalReviews}
                </div>
                <div className="text-sm text-slate-400">Total de Reviews</div>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Conectado
                </Badge>
                <div className="text-sm text-slate-400 mt-2">Status da Conexão</div>
              </div>
            </div>

            {/* Lista de Reviews */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Reviews Recentes
              </h4>
              
              {reviewsData.reviews.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {reviewsData.reviews.map((review) => (
                    <div key={review.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-white">{review.author}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-sm text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(review.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {review.text && (
                        <p className="text-slate-300 text-sm mb-3 leading-relaxed">
                          {review.text}
                        </p>
                      )}
                      
                      {review.response && (
                        <div className="bg-slate-800/50 rounded p-3 border-l-2 border-blue-500">
                          <div className="text-xs text-blue-400 font-medium mb-1">
                            Resposta do Proprietário
                          </div>
                          <p className="text-slate-300 text-sm">{review.response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum review encontrado</p>
                </div>
              )}
            </div>

            {/* Informações do Negócio */}
            {(reviewsData.businessName || reviewsData.businessAddress) && (
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                <h5 className="font-medium text-white mb-2">Informações do Negócio</h5>
                {reviewsData.businessName && (
                  <p className="text-sm text-slate-300 mb-1">
                    <strong>Nome:</strong> {reviewsData.businessName}
                  </p>
                )}
                {reviewsData.businessAddress && (
                  <p className="text-sm text-slate-300">
                    <strong>Endereço:</strong> {reviewsData.businessAddress}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}