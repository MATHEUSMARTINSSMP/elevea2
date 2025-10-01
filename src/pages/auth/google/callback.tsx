import { useEffect, useState } from "react";

export default function GoogleCallback() {
  const [msg, setMsg] = useState("Finalizando conexão com o Google…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = new URLSearchParams(window.location.search);
        const code = p.get("code");
        const state = p.get("state");
        const error = p.get("error");
        
        if (error) {
          setError(`Erro do Google: ${error}`);
          return;
        }
        
        if (!code || !state) { 
          setError("URL inválida - código ou state ausente"); 
          return; 
        }

        // Validar e extrair dados do state
        let stateData;
        try {
          stateData = JSON.parse(atob(state.replace(/-/g, '+').replace(/_/g, '/')));
        } catch (e) {
          setError("State corrompido - tente novamente");
          return;
        }
        
        const { site: siteSlug, email: userEmail } = stateData;
        
        if (!siteSlug || !userEmail) {
          setError("State inválido - dados ausentes");
          return;
        }
        
        // Validar timestamp (state não pode ser muito antigo - 10 minutos)
        const stateAge = Date.now() - (stateData.ts || 0);
        if (stateAge > 10 * 60 * 1000) {
          setError("State expirado - tente novamente");
          return;
        }

        setMsg("Processando autorização...");

        // Fazer POST para exchange (não redirect)
        try {
          const response = await fetch('/.netlify/functions/gmb-oauth-exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              state,
              redirect_uri: 'https://eleveaagencia.netlify.app/auth/google/callback',
              siteSlug,
              userEmail
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
          
          // Sucesso - redirecionar para dashboard
          window.location.replace(`/client/dashboard?gmb=ok&site=${encodeURIComponent(siteSlug)}`);
        } catch (err: any) {
          setError(`Erro na troca de tokens: ${err.message}`);
        }
      } catch (e) {
        console.error('Erro no callback:', e);
        setError(`Erro interno: ${String(e)}`);
      }
    })();
  }, []);

  if (error) {
    return (
      <div style={{color:"#fff", background:"#0b1324", minHeight:"100vh", display:"grid", placeItems:"center"}}>
        <div style={{opacity:.85, textAlign: 'center'}}>
          <div style={{color: '#ef4444', marginBottom: '1rem'}}>❌ Erro</div>
          <div style={{marginBottom: '1rem'}}>{error}</div>
          <button 
            onClick={() => window.location.href = '/client/dashboard'}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{color:"#fff", background:"#0b1324", minHeight:"100vh", display:"grid", placeItems:"center"}}>
      <div style={{opacity:.85, textAlign: 'center'}}>
        <div style={{marginBottom: '1rem'}}>🔄 {msg}</div>
        <div style={{fontSize: '0.875rem', opacity: 0.7}}>
          Aguarde enquanto processamos sua autorização...
        </div>
      </div>
    </div>
  );
}
