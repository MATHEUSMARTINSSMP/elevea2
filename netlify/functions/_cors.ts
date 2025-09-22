/**
 * Middleware simples de CORS para Netlify Functions
 * Helper para todas as functions
 */

export function withCors(handler: (event: any) => Promise<any> | any) {
  return async (event: any) => {
    // Headers CORS padrão
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Tratar requests OPTIONS (preflight)
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: corsHeaders,
      };
    }

    try {
      // Executar o handler original
      const res = await handler(event);
      
      return {
        ...res,
        headers: {
          ...corsHeaders,
          ...(res.headers || {}),
        },
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: String(error) }),
      };
    }
  };
}