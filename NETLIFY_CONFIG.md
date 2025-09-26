# 🚀 CONFIGURAÇÃO NETLIFY PARA LOGIN

## ❌ PROBLEMA IDENTIFICADO
As **Netlify Functions estão falhando** porque as environment variables não estão configuradas.

## ✅ SOLUÇÃO - VARIÁVEIS OBRIGATÓRIAS

Configure estas variáveis no seu painel Netlify:

### 1. 🔑 **ELEVEA_GAS_URL**
- **Onde:** Site Settings → Environment Variables
- **Valor:** Sua URL do Google Apps Script
- **Exemplo:** `https://script.google.com/macros/s/ABCD123.../exec`

### 2. 🔒 **ADMIN_DASH_TOKEN**  
- **Onde:** Site Settings → Environment Variables
- **Valor:** Token de segurança para assinatura de cookies
- **Exemplo:** `elevea-secure-token-2025` (use algo único)

## 📋 COMO CONFIGURAR NO NETLIFY:

1. Acesse seu dashboard: https://app.netlify.com
2. Clique no seu site "elevea-agencia"
3. Vá em **Site settings → Environment variables**
4. Clique **"Add a variable"**
5. Adicione cada variável acima
6. Clique **"Save"**
7. Vá em **Deploys** e clique **"Trigger deploy"**

## 🧪 TESTE LOCAL (Opcional):
```bash
export ELEVEA_GAS_URL="https://script.google.com/macros/s/SEU_ID/exec"
export ADMIN_DASH_TOKEN="seu-token-secreto"
npm run dev:netlify
```

## ⚠️ IMPORTANTE:
- **Sem essas variáveis** → Functions retornam 500/404
- **Com essas variáveis** → Login funciona normalmente
- **Redeploy necessário** após configurar variáveis