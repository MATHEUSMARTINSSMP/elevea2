# 🔍 Diagnóstico Dashboard ELEVEA - Tela Branca

## ❌ Problema Identificado

A tela branca no dashboard do cliente está sendo causada por **inconsistências nas rotas do GAS** e **falta de configuração de ambiente**.

## 🐛 Bugs Encontrados

### 1. **Rota `get_status` não existe no GAS**
- **Client-api.ts** chama: `get_status`
- **GAS** tem apenas: `status`
- **Status**: ✅ **CORRIGIDO**

### 2. **Falta de configuração de ambiente**
- `GAS_BASE_URL` não está definida
- Sem URL do Google Apps Script configurada
- **Status**: ⚠️ **PENDENTE**

### 3. **Logs de debug adicionados**
- Console logs para identificar problemas
- **Status**: ✅ **IMPLEMENTADO**

## 🔧 Correções Aplicadas

### 1. **Corrigido client-api.ts**
```typescript
// ANTES (INCORRETO)
return json(200, await callGAS("get_status", { site }, "GET"));

// DEPOIS (CORRETO)
return json(200, await callGAS("status", { site }, "GET"));
```

### 2. **Adicionados logs de debug no Dashboard**
```typescript
console.log("🔍 Dashboard Debug:", {
  user,
  canQuery,
  timestamp: new Date().toISOString()
});
```

### 3. **Criados arquivos de teste**
- `debug-dashboard.html` - Teste completo do dashboard
- `test-gas.html` - Teste de conectividade GAS
- `config-example.txt` - Exemplo de configuração

## 🚀 Próximos Passos

### 1. **Configurar variáveis de ambiente**
```bash
# Criar arquivo .env.local
cp config-example.txt .env.local

# Editar com sua URL real do GAS
VITE_GAS_URL=https://script.google.com/macros/s/SUA_SCRIPT_ID/exec
GAS_BASE_URL=https://script.google.com/macros/s/SUA_SCRIPT_ID/exec
```

### 2. **Testar conectividade**
1. Abrir `debug-dashboard.html` no navegador
2. Verificar logs no console (F12)
3. Testar funções individualmente

### 3. **Verificar GAS**
1. Confirmar que o script está publicado
2. Testar URL diretamente no navegador
3. Verificar permissões de acesso

## 🔍 Como Debugar

### 1. **Console do Navegador (F12)**
```javascript
// Verificar se o usuário está logado
console.log('User:', window.user);

// Verificar se as funções estão carregando
console.log('Can Query:', canQuery);

// Verificar erros de rede
console.log('Network errors:', errors);
```

### 2. **Teste de Conectividade**
```bash
# Testar GAS diretamente
curl "https://script.google.com/macros/s/SUA_SCRIPT_ID/exec?type=ping"

# Testar via Netlify
curl "https://seu-site.netlify.app/.netlify/functions/client-api?action=debug_env"
```

### 3. **Logs de Debug**
- Abrir `debug-dashboard.html`
- Verificar se todas as funções retornam dados
- Identificar qual função está falhando

## 📋 Checklist de Verificação

- [ ] ✅ Corrigido rota `get_status` → `status`
- [ ] ⚠️ Configurar `GAS_BASE_URL` no ambiente
- [ ] ⚠️ Testar conectividade com GAS
- [ ] ⚠️ Verificar se usuário está logado
- [ ] ⚠️ Testar funções individualmente
- [ ] ⚠️ Verificar logs de erro no console

## 🎯 Solução Esperada

Após configurar as variáveis de ambiente e testar a conectividade, o dashboard deve:

1. **Carregar sem tela branca**
2. **Detectar plano VIP/Essential corretamente**
3. **Exibir dados do usuário**
4. **Funcionar todas as funcionalidades**

## 📞 Suporte

Se o problema persistir após seguir os passos:

1. Verificar logs no console (F12)
2. Testar com `debug-dashboard.html`
3. Verificar se o GAS está funcionando
4. Confirmar configuração de ambiente

