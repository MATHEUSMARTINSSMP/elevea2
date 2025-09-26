// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  base: "/",                       // garante caminhos corretos em produção
  server: {
    host: "::",
    port: 5000,  // Corrigido para match com workflow
    proxy: mode === "development" ? {
      // Proxy para Netlify Functions em desenvolvimento
      "/.netlify/functions": {
        target: "http://localhost:8888",
        changeOrigin: true,
        configure: (proxy, options) => {
          // Fallback inteligente para quando Netlify Dev não está rodando
          proxy.on('error', (err, req, res) => {
            console.warn('Netlify Functions não disponíveis - usando fallback:', err.message);
            
            // Para auth-session, redirecionar para uma versão simplificada
            if (req.url?.includes('auth-session')) {
              res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Set-Cookie': 'elevea_sess=dev-mode-token; HttpOnly; Path=/'
              });
              res.end(JSON.stringify({ 
                ok: true, 
                mode: 'development',
                user: { email: 'dev@elevea.com.br', name: 'Modo Desenvolvimento' },
                message: 'Login simulado para desenvolvimento. Use "npm run dev:netlify" para login real.'
              }));
            } else {
              // Para outras functions, retornar estado não disponível
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                ok: false, 
                error: 'dev_functions_unavailable',
                message: 'Execute "npm run dev:netlify" para ativar todas as functions'
              }));
            }
          });
        }
      }
    } : undefined
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(), // só no dev
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,               // essencial p/ ver o arquivo/linha do erro
  },
}));
