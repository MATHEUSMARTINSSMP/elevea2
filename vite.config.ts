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
          // Fallback para quando Netlify Dev não está rodando
          proxy.on('error', (err, req, res) => {
            console.warn('Netlify Functions não disponíveis em desenvolvimento:', err.message);
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              ok: false, 
              error: 'dev_functions_unavailable',
              message: 'Execute "npm run dev:netlify" em outro terminal para ativar as functions'
            }));
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
