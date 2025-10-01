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

        // Validar state (opcional - para segurança extra)
        try {
          const stateData = JSON.parse(atob(state.replace(/-/g, '+').replace(/_/g, '/')));
          if (!stateData.site || !stateData.email) {
            setError("State inválido - dados ausentes");
            return;
          }
          
          // Validar timestamp (state não pode ser muito antigo - 10 minutos)
          const stateAge = Date.now() - (stateData.ts || 0);
          if (stateAge > 10 * 60 * 1000) {
            setError("State expirado - tente novamente");
            return;
          }
          
          // Validar formato do email
          if (!stateData.email.includes('@') || stateData.email.length < 5) {
            setError("State inválido - email malformado");
            return;
          }
        } catch (e) {
          console.warn('Erro ao validar state:', e);
          setError("State corrompido - tente novamente");
          return;
        }

        setMsg("Processando autorização...");

        // Redireciona o navegador para a função que troca o code por tokens e salva no GAS.
        const url = `/.netlify/functions/gmb-oauth-exchange?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        window.location.replace(url);
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
