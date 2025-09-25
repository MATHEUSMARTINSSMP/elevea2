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
    proxy: {
      // Proxy para funções Netlify em desenvolvimento
      '/.netlify/functions': {
        target: 'http://localhost:9999',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
            res.writeHead(500, {
              'Content-Type': 'text/plain',
            });
            res.end('Função Netlify não disponível em desenvolvimento local. Deploy necessário.');
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxy request to:', req.url);
          });
        },
      },
    },
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
