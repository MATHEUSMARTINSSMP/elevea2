# Elevea - SaaS de Sites para Clientes

## 📋 Visão Geral

**Elevea** é uma plataforma SaaS que permite criar e gerenciar sites personalizados para clientes, oferecendo dois planos distintos:

- **Essential**: Funcionalidades básicas com feedbacks aprovados
- **VIP**: Acesso completo com painel administrativo, gerenciamento de mídias, configurações avançadas e todos os feedbacks

O sistema oferece dashboards separados para clientes e administradores, com autenticação segura e integração completa com infraestrutura Google.

## 🏗️ Arquitetura do Sistema

### **Stack Tecnológico**
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Netlify Functions (Node.js/TypeScript)
- **Processamento**: Google Apps Script (GAS)
- **Banco de Dados**: Google Sheets
- **Deploy**: GitHub + Netlify
- **Autenticação**: Sistema customizado via Google Apps Script

### **Infraestrutura**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│   React/Vite    │───▶│ Netlify Functions │───▶│ Google Apps Script  │───▶│ Google Sheets   │
│   (Frontend)    │    │   (Middleware)   │    │    (Backend)        │    │  (Database)     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘    └─────────────────┘
```

## 🔄 Fluxo de Dados

### **1. Dashboard Cliente → Netlify → GAS → Planilha**
```typescript
// Client Dashboard solicita dados
const response = await fetch('/.netlify/functions/client-plan?site=exemplo&email=usuario@email.com')

// Netlify Function processa
export default async (req, res) => {
  const gasResponse = await fetch(`${GAS_URL}?action=client_billing&site=${site}&email=${email}`)
  return gasResponse.json()
}

// Google Apps Script consulta planilha
function client_billing(site, email) {
  const sheet = SpreadsheetApp.openById(SHEETS_ID).getSheetByName('usuarios')
  // Busca dados e retorna JSON
}
```

### **2. Principais Endpoints**

| Endpoint | Função | Método | Descrição |
|----------|---------|---------|-----------|
| `/client-plan` | Detectar plano VIP/Essential | GET | Valida assinatura e tipo de plano |
| `/client-api` | Operações gerais do cliente | GET/POST | Status, settings, feedbacks |
| `/assets` | Upload/gerenciamento de mídias | GET/PUT | Imagens e vídeos do site |
| `/admin-api` | Painel administrativo | GET/POST | Gestão completa do sistema |

## 🎯 Funções Principais

### **Frontend (React/TypeScript)**

#### **Dashboard Cliente (`pages/client/Dashboard.tsx`)**
- ✅ **Detecção automática** de plano (VIP/Essential)
- ✅ **Cards informativos**: Status, próxima cobrança, último pagamento
- ✅ **Gate VIP**: Funcionalidades bloqueadas para plano Essential
- ✅ **Gerenciamento de feedbacks**: Aprovação/rejeição (VIP apenas)
- ✅ **Upload de mídias**: 6 slots personalizáveis (VIP apenas)
- ✅ **Configurações**: Temas, PIN VIP, contatos (VIP apenas)

#### **Dashboard Admin (`pages/admin/dashboard.tsx`)**
- Gestão completa de sites e usuários
- Controle de assinaturas e pagamentos
- Moderação de feedbacks globalmente

### **Backend (Netlify Functions)**

#### **`client-plan.ts`** - Detecção de Plano
```typescript
// Otimizado: 3s timeout, AbortController
const gasResponse = await fetch(`${GAS_URL}?action=client_billing&site=${site}&email=${email}`, {
  signal: AbortSignal.timeout(4000)
})

// Retorna: { ok: boolean, vip: boolean, plan: string, status, nextCharge, lastPayment }
```

#### **`client-api.js`** - Operações Gerais
- `get_status`: Status detalhado da assinatura
- `get_settings`: Configurações do site
- `save_settings`: Atualiza configurações (requer PIN VIP)
- `list_feedbacks`: Feedbacks aprovados (Essential) ou todos (VIP)
- `feedback_set_approval`: Aprova/rejeita feedback (VIP apenas)

### **Google Apps Script (`GAS-CORRIGIDO-FINAL.js`)**

#### **Funções Principais**
```javascript
// ✅ CORRIGIDO: Detecção de plano principal
function client_billing(site, email) {
  const sheet = getSheet_('usuarios')
  const userData = findUserData_(sheet, site, email)
  return {
    ok: true,
    vip: isVipPlan_(userData.plano),
    plan: userData.plano || 'essential',
    status: userData.status,
    nextCharge: userData.next_renewal,
    lastPayment: userData.last_payment
  }
}

// ✅ CORRIGIDO: Endpoint GET para billing
function doGet(e) {
  const action = e.parameter.action
  if (action === 'client_billing') {
    return jsonOut_(client_billing(e.parameter.site, e.parameter.email))
  }
  // ... outras ações
}

// ✅ CORRIGIDO: Helpers necessários
function ensure(value, message) {
  if (!value) throw new Error(message || 'Assertion failed')
  return value
}

function jsonOut_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
```

## 🗃️ Estrutura do Google Sheets

### **Planilha "usuarios"**
| Coluna | Tipo | Descrição |
|---------|------|-----------|
| `email` | string | Email do cliente |
| `site` | string | Slug do site |
| `plano` | string | "vip", "essential", etc. |
| `status` | string | "approved", "active", etc. |
| `next_renewal` | date | Próxima cobrança |
| `last_payment` | object | `{date, amount}` |

### **Planilha "feedbacks"**
| Coluna | Tipo | Descrição |
|---------|------|-----------|
| `id` | string | ID único |
| `site` | string | Site relacionado |
| `name` | string | Nome do usuário |
| `email` | string | Email (privado) |
| `phone` | string | Telefone (privado) |
| `message` | string | Feedback público |
| `approved` | boolean | Status de aprovação |
| `timestamp` | date | Data/hora |

## 🔧 Desenvolvimento Local

### **Pré-requisitos**
- Node.js 18+ ([instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm ou yarn
- Conta Google com Apps Script habilitado

### **Configuração**
```bash
# 1. Clone o repositório
git clone <URL_DO_SEU_REPO>
cd elevea

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
# Crie .env.local com:
VITE_GAS_URL=https://script.google.com/macros/s/SEU_SCRIPT_ID/exec
VITE_UPGRADE_URL=https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=SEU_ID

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

### **Scripts Disponíveis**
```bash
npm run dev          # Servidor desenvolvimento (localhost:8080)
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # ESLint
npm run type-check   # Verificação TypeScript
```

### **Health Check**
Acesse `http://localhost:8080/health` para verificar se a aplicação está funcionando corretamente.

## 🚀 Deploy em Produção

### **1. Netlify (Frontend + Functions)**
```bash
# Build automaticamente via GitHub
# Configurações no Netlify:
Build command: npm run build
Publish directory: dist
Functions directory: netlify/functions

# Variáveis de ambiente no Netlify:
VITE_GAS_URL=https://script.google.com/macros/s/SEU_SCRIPT_ID/exec
VITE_UPGRADE_URL=https://...
```

### **2. Google Apps Script (Backend)**
1. Acesse [Google Apps Script](https://script.google.com)
2. Crie novo projeto
3. Cole o código do arquivo `GAS-CORRIGIDO-FINAL.js`
4. Configure permissions para Google Sheets
5. Deploy como Web App (Executar como: Eu, Acesso: Qualquer pessoa)
6. Copie a URL do script para `VITE_GAS_URL`

### **3. Google Sheets (Database)**
1. Crie planilha com abas: `usuarios`, `feedbacks`, `assets`
2. Configure headers conforme estrutura documentada
3. Adicione ID da planilha no Google Apps Script

## 🧪 Credenciais de Teste

### **Usuários Demo**
```javascript
// Admin
email: "admin@elevea.com"
senha: "admin123"

// Cliente VIP
email: "cliente.vip@teste.com"
site: "vip-demo"
pin: "1234"

// Cliente Essential
email: "cliente.basic@teste.com"
site: "basic-demo"
```

### **Sites Demo**
- `vip-demo`: Site com plano VIP ativo
- `basic-demo`: Site com plano Essential
- `test-site`: Site para testes gerais

## 🔍 Debugging e Logs

### **Frontend (Browser DevTools)**
```javascript
// Debug localStorage
localStorage.getItem('dashboard:lastPlan:site-slug')

// Debug session
sessionStorage.getItem('elevea:session')

// Debug network requests
// Verifique aba Network para calls Netlify → GAS
```

### **Netlify Functions**
```bash
# Logs em tempo real
netlify functions:list
netlify functions:log nome-da-funcao
```

### **Google Apps Script**
```javascript
// Adicione logs no GAS
console.log('Debug:', JSON.stringify(data))

// Visualize em: Apps Script → Execuções
```

## 🐛 Problemas Conhecidos e Soluções

### **❌ "Não foi possível validar sua assinatura"**
**Causa**: Timeout na comunicação Netlify → GAS
**Solução**: 
- Verificar `VITE_GAS_URL` corretamente configurada
- Conferir permissões do Google Apps Script
- Reduzir timeout se necessário

### **❌ Plano não detectado corretamente**
**Causa**: Dados inconsistentes na planilha Google Sheets
**Solução**:
- Verificar campos `plano` e `status` na planilha "usuarios"
- Confirmar formato de dados (dates, objects)

### **❌ Upload de imagens falha**
**Causa**: Límite de tamanho ou permissões
**Solução**:
- Verificar tamanho máximo (5MB)
- Confirmar configuração do Google Drive/Storage

### **❌ Feedbacks não carregam**
**Causa**: PIN VIP incorreto ou permissões
**Solução**:
- Verificar PIN na planilha "usuarios"
- Confirmar lógica de aprovação de feedbacks

## 📈 Otimizações Recentes

### **Performance Dashboard** ⚡
- **Antes**: 22+ segundos para carregar
- **Depois**: Máximo 6 segundos
- **Métodos**: Cache inteligente, requests paralelos, timeouts otimizados

### **Detecção de Plano** 🎯
- **Correção**: Campo `vip` boolean detectado corretamente
- **Fallback**: Múltiplas fontes de validação (plan, status, vip flag)
- **Cache**: Sessão local para reduzir calls repetidas

### **Google Apps Script** 🔧
- **Correção**: Functions `ensure()` e `jsonOut_()` implementadas
- **Endpoints**: GET/POST funcionando corretamente
- **Error handling**: Tratamento robusto de erros

## 🛠️ Próximos Passos

### **Curto Prazo**
- [ ] **Testes automatizados**: Jest + React Testing Library
- [ ] **Monitoring**: Sentry para error tracking
- [ ] **Performance**: Lazy loading de componentes
- [ ] **PWA**: Service worker para cache offline

### **Médio Prazo**
- [ ] **Database**: Migração para PostgreSQL (opcional)
- [ ] **CDN**: Cloudflare para assets estáticos
- [ ] **Analytics**: Google Analytics + heatmaps
- [ ] **A/B Testing**: Teste de conversão de planos

### **Longo Prazo**
- [ ] **Multi-tenant**: Suporte a múltiplas organizações
- [ ] **API Public**: Webhook endpoints para integrações
- [ ] **Mobile App**: React Native para gestão mobile
- [ ] **White-label**: Customização completa da marca

## 📞 Suporte

Para dúvidas técnicas ou problemas:

1. **Verifique logs**: Browser DevTools + Netlify + Google Apps Script
2. **Teste endpoints**: Postman/Insomnia para validar APIs
3. **Consulte documentação**: Google Sheets API + Netlify Functions
4. **Debug passo-a-passo**: Frontend → Netlify → GAS → Sheets

---

## 📝 Histórico de Mudanças

### **v1.3.0** (Atual)
- ✅ Dashboard cliente otimizado (6s vs 22s)
- ✅ Detecção de plano VIP/Essential corrigida
- ✅ Google Apps Script endpoints funcionais
- ✅ TypeScript errors resolvidos
- ✅ Logout funcionando corretamente

### **v1.2.0**
- ✅ Integração Google Apps Script + Sheets
- ✅ Sistema de feedbacks com aprovação
- ✅ Upload de mídias VIP
- ✅ Configurações de tema e PIN

### **v1.1.0**
- ✅ Dashboard administrativo
- ✅ Sistema de planos VIP/Essential
- ✅ Netlify Functions backend

### **v1.0.0**
- ✅ Frontend React/TypeScript
- ✅ Autenticação básica
- ✅ Interface inicial

---

**Elevea** - Construindo sites que convertem 🚀