import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarIcon, ExternalLinkIcon, RefreshCwIcon, TrendingUpIcon, UserIcon } from 'lucide-react';
import { DashboardCardSkeleton } from '@/components/ui/loading-skeletons';

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

export default function GoogleReviews({ siteSlug, vipPin }: GoogleReviewsProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);

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
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch('/.netlify/functions/google-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_reviews',
          siteSlug,
          vipPin
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar reviews');

      const result = await response.json();
      if (result.ok) {
        setReviewsData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
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
    fetchReviews();
  }, [siteSlug, vipPin]);

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
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-red-600 flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Google Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchReviews()} variant="outline" size="sm">
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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
            <Button onClick={() => fetchReviews()} variant="outline" size="sm">
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Google Reviews
            </CardTitle>
            <CardDescription>
              {reviewsData.businessInfo.name}
            </CardDescription>
          </div>
          <Button 
            onClick={() => fetchReviews(true)} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <span className={`text-2xl font-bold px-3 py-1 rounded-full ${getRatingColor(reviewsData.averageRating)}`}>
                {reviewsData.averageRating.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-center mb-1">
              {renderStars(Math.round(reviewsData.averageRating))}
            </div>
            <p className="text-sm text-gray-600">Avaliação média</p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {reviewsData.totalReviews}
            </div>
            <p className="text-sm text-gray-600">Total de reviews</p>
            {reviewsData.trends.monthlyIncrease > 0 && (
              <div className="flex items-center justify-center mt-1 text-green-600">
                <TrendingUpIcon className="h-3 w-3 mr-1" />
                <span className="text-xs">+{reviewsData.trends.monthlyIncrease} este mês</span>
              </div>
            )}
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {Math.round((reviewsData.reviews.filter(r => r.rating >= 4).length / reviewsData.reviews.length) * 100)}%
            </div>
            <p className="text-sm text-gray-600">Reviews positivos</p>
            <p className="text-xs text-gray-500 mt-1">(4-5 estrelas)</p>
          </div>
        </div>

        {/* Reviews Recentes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Reviews Recentes</h3>
            <a 
              href={`https://www.google.com/maps/search/${encodeURIComponent(reviewsData.businessInfo.name + ' ' + reviewsData.businessInfo.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm flex items-center gap-1"
            >
              Ver no Google
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {reviewsData.reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="border-l-4 border-blue-200 pl-4 py-2">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      {review.profilePhotoUrl ? (
                        <img 
                          src={review.profilePhotoUrl} 
                          alt={review.author}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{review.author}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <span className="text-xs text-gray-500">{review.relativeTimeDescription}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={review.rating >= 4 ? 'default' : review.rating >= 3 ? 'secondary' : 'destructive'}>
                    {review.rating}★
                  </Badge>
                </div>
                
                {review.text && (
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {review.text.length > 200 ? `${review.text.substring(0, 200)}...` : review.text}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}