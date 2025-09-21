import type { Handler } from '@netlify/functions'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

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
    const body = JSON.parse(event.body || '{}')
    const { action, siteSlug, vipPin } = body

    // Validação VIP
    if (!siteSlug || !vipPin) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Site e PIN VIP são obrigatórios' 
        })
      }
    }

    switch (action) {
      case 'get_reviews':
        return await getGoogleReviews(siteSlug, vipPin)
      
      case 'sync_reviews':
        return await syncGoogleReviews(siteSlug, vipPin)
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: 'Ação inválida' 
          })
        }
    }

  } catch (error) {
    console.error('Erro na API de reviews:', error)
    
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

async function getGoogleReviews(siteSlug: string, vipPin: string) {
  try {
    // Simular dados de reviews do Google Business
    // Em uma implementação real, isso viria da Google My Business API
    const mockReviewsData = {
      reviews: [
        {
          id: '1',
          author: 'Maria Silva',
          rating: 5,
          text: 'Excelente atendimento! Recomendo muito o serviço. Equipe muito profissional e resultado superou expectativas.',
          time: '2024-01-15T10:30:00Z',
          relativeTimeDescription: 'há 2 semanas',
          profilePhotoUrl: ''
        },
        {
          id: '2',
          author: 'João Santos',
          rating: 5,
          text: 'Muito satisfeito com o resultado. Qualidade excepcional e preço justo.',
          time: '2024-01-10T14:20:00Z',
          relativeTimeDescription: 'há 3 semanas',
          profilePhotoUrl: ''
        },
        {
          id: '3',
          author: 'Ana Costa',
          rating: 4,
          text: 'Bom atendimento, resultados dentro do esperado. Recomendo!',
          time: '2024-01-08T09:15:00Z',
          relativeTimeDescription: 'há 1 mês',
          profilePhotoUrl: ''
        },
        {
          id: '4',
          author: 'Carlos Oliveira',
          rating: 5,
          text: 'Serviço impecável! Voltarei com certeza.',
          time: '2024-01-05T16:45:00Z',
          relativeTimeDescription: 'há 1 mês',
          profilePhotoUrl: ''
        },
        {
          id: '5',
          author: 'Fernanda Lima',
          rating: 4,
          text: 'Atendimento rápido e eficiente. Gostei muito do resultado.',
          time: '2024-01-03T11:30:00Z',
          relativeTimeDescription: 'há 1 mês',
          profilePhotoUrl: ''
        }
      ],
      averageRating: 4.6,
      totalReviews: 127,
      businessInfo: {
        name: siteSlug.charAt(0).toUpperCase() + siteSlug.slice(1).replace(/([A-Z])/g, ' $1'),
        address: 'Macapá, AP',
        placeId: 'mock_place_id'
      },
      trends: {
        weeklyIncrease: 3,
        monthlyIncrease: 12
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        data: mockReviewsData,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Erro ao buscar reviews:', error)
    throw error
  }
}

async function syncGoogleReviews(siteSlug: string, vipPin: string) {
  try {
    // Simular sincronização com Google My Business API
    // Em implementação real, faria sync com GMB API
    
    const syncResult = {
      synced: true,
      newReviews: 2,
      updatedReviews: 1,
      totalReviews: 129,
      lastSync: new Date().toISOString()
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        data: syncResult,
        message: 'Reviews sincronizados com sucesso'
      })
    }

  } catch (error) {
    console.error('Erro ao sincronizar reviews:', error)
    throw error
  }
}

// Função auxiliar para integração real com Google My Business API
// async function fetchGoogleBusinessReviews(placeId: string) {
//   const apiKey = process.env.GOOGLE_PLACES_API_KEY
//   
//   if (!apiKey) {
//     throw new Error('Google Places API key não configurada')
//   }
//
//   const response = await fetch(
//     `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${apiKey}`
//   )
//
//   if (!response.ok) {
//     throw new Error('Falha ao buscar dados do Google Places')
//   }
//
//   const data = await response.json()
//   
//   if (data.status !== 'OK') {
//     throw new Error(`Google Places API erro: ${data.status}`)
//   }
//
//   return {
//     reviews: data.result.reviews || [],
//     averageRating: data.result.rating || 0,
//     totalReviews: data.result.user_ratings_total || 0
//   }
// }