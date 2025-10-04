# Prompt Lovable para Clientes VIP - Sistema de Feedbacks

## Contexto
Este prompt deve ser usado APENAS para clientes VIP durante o onboarding. Ele garante que o site do cliente tenha nativamente a funcionalidade de exibir feedbacks aprovados via API do GAS.

## Prompt Completo

```
Crie um site moderno e responsivo para [NOME_DO_CLIENTE] que é [DESCRIÇÃO_DO_NEGÓCIO]. 

REQUISITOS OBRIGATÓRIOS:

### 1. Estrutura Básica
- Header com logo e navegação
- Seção Hero com chamada principal
- Seções de serviços/produtos
- Seção de depoimentos/feedbacks
- Footer com contatos

### 2. Sistema de Feedbacks (OBRIGATÓRIO)
Crie uma seção de depoimentos que carrega feedbacks dinamicamente via API do GAS.

**Endpoint de dados**: `GET {GAS_URL}?type=feedback&action=get_public&site={SITE_SLUG}`
**Estrutura da resposta**:
```json
{
  "ok": true,
  "data": {
    "feedbacks": [
      {
        "id": "unique-id",
        "name": "Nome do Cliente",
        "rating": 5,
        "message": "Excelente atendimento!",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 5,
    "pagination": {
      "limit": 10,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

**Componente de Feedback**:
- Carregar feedbacks via fetch() do endpoint GAS
- Exibir estrelas de avaliação (1-5)
- Nome do cliente
- Mensagem do feedback
- Data de criação
- Layout responsivo com grid
- Animações suaves ao carregar
- Loading state durante carregamento

### 3. Funcionalidades Técnicas
- **Carregamento dinâmico**: Buscar feedbacks via API do GAS
- **Fallback**: Se API falhar, mostrar mensagem "Em breve nossos clientes compartilharão suas experiências"
- **Performance**: Implementar lazy loading para feedbacks
- **SEO**: Meta tags otimizadas para depoimentos
- **Acessibilidade**: Alt texts e ARIA labels apropriados
- **Error handling**: Tratamento de falhas de rede

### 4. Estilo Visual
- Design moderno e profissional
- Cores que reflitam a identidade do negócio
- Tipografia clara e legível
- Espaçamento adequado entre elementos
- Botões com hover effects
- Cards com sombras sutis

### 5. Responsividade
- Mobile-first design
- Breakpoints: 320px, 768px, 1024px, 1440px
- Grid adaptável para feedbacks
- Navegação mobile otimizada

### 6. Integração com Sistema
O sistema de feedbacks será alimentado automaticamente através do dashboard da agência. O arquivo `public/feedbacks.json` será atualizado sempre que um feedback for aprovado e publicado.

**IMPORTANTE**: 
- NÃO criar um formulário de feedback no site
- NÃO implementar sistema de envio de feedbacks
- Apenas EXIBIR os feedbacks já aprovados via dashboard
- O arquivo `feedbacks.json` será gerenciado externamente

### 7. Estrutura de Arquivos
```
src/
├── components/
│   ├── FeedbackSection.tsx
│   ├── FeedbackCard.tsx
│   └── StarRating.tsx
├── pages/
│   ├── index.tsx
│   └── feedbacks.json (em public/)
└── styles/
    └── globals.css
```

### 8. Tecnologias
- React/Next.js
- TypeScript
- Tailwind CSS
- Lucide React (ícones)

Crie um site que impressione e converta visitantes em clientes, com uma seção de depoimentos que demonstre credibilidade e confiança através dos feedbacks reais dos clientes.
```

## Instruções de Uso

1. **Durante o onboarding VIP**: Use este prompt quando o cliente for VIP
2. **Substitua placeholders**: [NOME_DO_CLIENTE] e [DESCRIÇÃO_DO_NEGÓCIO]
3. **Verifique integração**: Confirme que o componente faz fetch() do endpoint GAS
4. **Teste API**: Verifique se a API retorna feedbacks aprovados corretamente

## Resultado Esperado

O site gerado terá:
- ✅ Seção de feedbacks funcional
- ✅ Integração com API do GAS para carregar feedbacks
- ✅ Componentes React para exibir feedbacks
- ✅ Design responsivo e moderno
- ✅ Integração pronta com o sistema da agência

## Manutenção

- Os feedbacks são carregados dinamicamente via API do GAS
- Não é necessário intervenção manual no site do cliente
- A seção de feedbacks se atualiza automaticamente quando novos feedbacks são aprovados
- Não há necessidade de arquivos JSON ou configurações GitHub
