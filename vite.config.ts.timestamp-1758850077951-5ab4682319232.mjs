// vite.config.ts
import { defineConfig } from "file:///home/runner/workspace/node_modules/vite/dist/node/index.js";
import react from "file:///home/runner/workspace/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "node:path";
import { componentTagger } from "file:///home/runner/workspace/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/home/runner/workspace";
var vite_config_default = defineConfig(({ mode }) => ({
  base: "/",
  // garante caminhos corretos em produção
  server: {
    host: "::",
    port: 5e3,
    // Corrigido para match com workflow
    proxy: mode === "development" ? {
      // Proxy para Netlify Functions em desenvolvimento
      "/.netlify/functions": {
        target: "http://localhost:8888",
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.warn("Netlify Functions n\xE3o dispon\xEDveis em desenvolvimento:", err.message);
            res.writeHead(503, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              ok: false,
              error: "dev_functions_unavailable",
              message: 'Execute "npm run dev:netlify" em outro terminal para ativar as functions'
            }));
          });
        }
      }
    } : void 0
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
    // só no dev
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "src")
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true
    // essencial p/ ver o arquivo/linha do erro
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3J1bm5lci93b3Jrc3BhY2Uvdml0ZS5jb25maWcudHNcIjsvLyB2aXRlLmNvbmZpZy50c1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgYmFzZTogXCIvXCIsICAgICAgICAgICAgICAgICAgICAgICAvLyBnYXJhbnRlIGNhbWluaG9zIGNvcnJldG9zIGVtIHByb2R1XHUwMEU3XHUwMEUzb1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogNTAwMCwgIC8vIENvcnJpZ2lkbyBwYXJhIG1hdGNoIGNvbSB3b3JrZmxvd1xuICAgIHByb3h5OiBtb2RlID09PSBcImRldmVsb3BtZW50XCIgPyB7XG4gICAgICAvLyBQcm94eSBwYXJhIE5ldGxpZnkgRnVuY3Rpb25zIGVtIGRlc2Vudm9sdmltZW50b1xuICAgICAgXCIvLm5ldGxpZnkvZnVuY3Rpb25zXCI6IHtcbiAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly9sb2NhbGhvc3Q6ODg4OFwiLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBvcHRpb25zKSA9PiB7XG4gICAgICAgICAgLy8gRmFsbGJhY2sgcGFyYSBxdWFuZG8gTmV0bGlmeSBEZXYgblx1MDBFM28gZXN0XHUwMEUxIHJvZGFuZG9cbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyLCByZXEsIHJlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdOZXRsaWZ5IEZ1bmN0aW9ucyBuXHUwMEUzbyBkaXNwb25cdTAwRUR2ZWlzIGVtIGRlc2Vudm9sdmltZW50bzonLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMywgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgICAgICBvazogZmFsc2UsIFxuICAgICAgICAgICAgICBlcnJvcjogJ2Rldl9mdW5jdGlvbnNfdW5hdmFpbGFibGUnLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnRXhlY3V0ZSBcIm5wbSBydW4gZGV2Om5ldGxpZnlcIiBlbSBvdXRybyB0ZXJtaW5hbCBwYXJhIGF0aXZhciBhcyBmdW5jdGlvbnMnXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IDogdW5kZWZpbmVkXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKSwgLy8gc1x1MDBGMyBubyBkZXZcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwic3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiBcImRpc3RcIixcbiAgICBzb3VyY2VtYXA6IHRydWUsICAgICAgICAgICAgICAgLy8gZXNzZW5jaWFsIHAvIHZlciBvIGFycXVpdm8vbGluaGEgZG8gZXJyb1xuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFKaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxNQUFNO0FBQUE7QUFBQSxFQUNOLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQTtBQUFBLElBQ04sT0FBTyxTQUFTLGdCQUFnQjtBQUFBO0FBQUEsTUFFOUIsdUJBQXVCO0FBQUEsUUFDckIsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsV0FBVyxDQUFDLE9BQU8sWUFBWTtBQUU3QixnQkFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLEtBQUssUUFBUTtBQUNuQyxvQkFBUSxLQUFLLCtEQUF5RCxJQUFJLE9BQU87QUFDakYsZ0JBQUksVUFBVSxLQUFLLEVBQUUsZ0JBQWdCLG1CQUFtQixDQUFDO0FBQ3pELGdCQUFJLElBQUksS0FBSyxVQUFVO0FBQUEsY0FDckIsSUFBSTtBQUFBLGNBQ0osT0FBTztBQUFBLGNBQ1AsU0FBUztBQUFBLFlBQ1gsQ0FBQyxDQUFDO0FBQUEsVUFDSixDQUFDO0FBQUEsUUFDSDtBQUFBLE1BQ0Y7QUFBQSxJQUNGLElBQUk7QUFBQSxFQUNOO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTLGlCQUFpQixnQkFBZ0I7QUFBQTtBQUFBLEVBQzVDLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDaEIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLElBQ3BDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBO0FBQUEsRUFDYjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
