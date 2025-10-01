import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarIcon, ExternalLinkIcon, RefreshCwIcon, TrendingUpIcon, UserIcon } from 'lucide-react';
import { DashboardCardSkeleton } from '@/components/ui/loading-skeletons';
import GoogleMyBusinessSetup from './GoogleMyBusinessSetup';

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  time: string;
  profilePhotoUrl?: string;
  relativeTimeDescription: string;
}

interface GoogleReviewsProps {
  siteSlug: string;
  vipPin: string;
  userEmail?: string;
}

interface ReviewsData {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  businessInfo: {
    name: string;
    address: string;
    placeId?: string;
  };
  trends: {
    weeklyIncrease: number;
    monthlyIncrease: number;
  };
}

export default function GoogleReviews({ siteSlug, vipPin, userEmail }: GoogleReviewsProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [needsConnection, setNeedsConnection] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Guarda de segurança - verificar se props VIP estão presentes
  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Google Reviews
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

  const fetchReviews = async (isRefresh = false) => {
    // Debounce: evitar chamadas muito frequentes
    const now = Date.now();
    if (!isRefresh && now - lastFetch < 5000) {
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
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
      if (result.ok) {
        setReviewsData(result.data);
        setError(null);
        setIsConnected(true);
        setNeedsConnection(false);
        setLastFetch(now);
      } else {
        // Verificar se é erro de credenciais não encontradas
        if (result.error?.includes('Credenciais não encontradas') || 
            result.error?.includes('Conecte sua conta Google')) {
          setNeedsConnection(true);
          setError(null);
        } else {
          throw new Error(result.error || 'Erro desconhecido');
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
  }, [siteSlug, vipPin, userEmail]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-50';
    if (rating >= 4.0) return 'text-blue-600 bg-blue-50';
    if (rating >= 3.0) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  if (error) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-red-400 flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Google Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-red-400 mb-4">{error}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button 
                onClick={() => fetchReviews()} 
                variant="outline" 
                size="sm"
                className="border-red-500 text-red-400 hover:bg-red-500/10"
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              {userEmail && (
                <Button 
                  asChild
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <a
                    href={`/.netlify/functions/gmb-oauth-start?site=${encodeURIComponent(siteSlug)}&email=${encodeURIComponent(userEmail)}`}
                  >
                    Conectar Google
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se precisa conectar Google
  if (needsConnection) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <UserIcon className="h-5 w-5" />
            Google Reviews
          </CardTitle>
          <CardDescription className="text-slate-400">
            Conecte sua conta Google para visualizar reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Conectar Google My Business</h3>
              <p className="text-slate-400 text-sm mb-4">
                Para visualizar e gerenciar seus reviews do Google, conecte sua conta Google My Business.
              </p>
            </div>
            {userEmail && (
              <Button 
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <a
                  href={`/.netlify/functions/gmb-oauth-start?site=${encodeURIComponent(siteSlug)}&email=${encodeURIComponent(userEmail)}`}
                >
                  Conectar Google
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se precisa de configuração, mostrar o setup
  if (reviewsData?.needsSetup) {
    return <GoogleMyBusinessSetup siteSlug={siteSlug} vipPin={vipPin} />;
  }

  if (!reviewsData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Google Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">Nenhum review encontrado</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => fetchReviews()} variant="outline" size="sm">
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              {userEmail && (
                <Button 
                  asChild
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <a
                    href={`/.netlify/functions/gmb-oauth-start?site=${encodeURIComponent(siteSlug)}&email=${encodeURIComponent(userEmail)}`}
                  >
                    Conectar Google
                  </a>
                </Button>
              )}
            </div>
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
              <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Google Reviews
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              {reviewsData.businessInfo.name}
            </CardDescription>
          </div>
          <Button 
            onClick={() => fetchReviews(true)} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
            className="text-xs sm:text-sm"
          >
            <RefreshCwIcon className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="text-center p-3 sm:p-4 bg-white/10 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <span className={`text-xl sm:text-2xl font-bold px-2 sm:px-3 py-1 rounded-full ${getRatingColor(reviewsData.averageRating)}`}>
                {reviewsData.averageRating.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-center mb-1">
              {renderStars(Math.round(reviewsData.averageRating))}
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Avaliação média</p>
          </div>

          <div className="text-center p-3 sm:p-4 bg-white/10 rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-blue-400 mb-2">
              {reviewsData.totalReviews}
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Total de reviews</p>
            {reviewsData.trends.monthlyIncrease > 0 && (
              <div className="flex items-center justify-center mt-1 text-green-400">
                <TrendingUpIcon className="h-3 w-3 mr-1" />
                <span className="text-xs">+{reviewsData.trends.monthlyIncrease} este mês</span>
              </div>
            )}
          </div>

          <div className="text-center p-3 sm:p-4 bg-white/10 rounded-lg sm:col-span-2 lg:col-span-1">
            <div className="text-xl sm:text-2xl font-bold text-purple-400 mb-2">
              {Math.round((reviewsData.reviews.filter(r => r.rating >= 4).length / reviewsData.reviews.length) * 100)}%
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Reviews positivos</p>
            <p className="text-xs text-slate-500 mt-1">(4-5 estrelas)</p>
          </div>
        </div>

        {/* Reviews Recentes */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
            <h3 className="font-semibold text-sm sm:text-base">Reviews Recentes</h3>
            <a 
              href={`https://www.google.com/maps/search/${encodeURIComponent(reviewsData.businessInfo.name + ' ' + reviewsData.businessInfo.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-xs sm:text-sm flex items-center gap-1"
            >
              Ver no Google
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          </div>

          <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
            {reviewsData.reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="border-l-4 border-blue-400/50 pl-3 sm:pl-4 py-2 bg-white/5 rounded-r-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/10 rounded-full flex items-center justify-center">
                      {review.profilePhotoUrl ? (
                        <img 
                          src={review.profilePhotoUrl} 
                          alt={review.author}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-xs sm:text-sm text-white">{review.author}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <span className="text-xs text-slate-400">{review.relativeTimeDescription}</span>
                      </div>
                    </div>
                  </div>
                  <Badge 
                    className={`text-xs ${
                      review.rating >= 4 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : review.rating >= 3 
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}
                  >
                    {review.rating}★
                  </Badge>
                </div>
                
                {review.text && (
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                    {review.text.length > 150 ? `${review.text.substring(0, 150)}...` : review.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="border-t pt-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a 
                href={`https://www.google.com/maps/search/${encodeURIComponent(reviewsData.businessInfo.name)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                Gerenciar no Google
              </a>
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <a 
                href={`https://www.google.com/maps/dir//${encodeURIComponent(reviewsData.businessInfo.address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Compartilhar Localização
              </a>
            </Button>

            {userEmail && (
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}