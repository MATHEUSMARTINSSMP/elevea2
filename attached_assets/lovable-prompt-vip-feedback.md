# Prompt Lovable para Clientes VIP - Sistema de Feedbacks

## Contexto
Este prompt deve ser usado APENAS para clientes VIP durante o onboarding. Ele garante que o site do cliente tenha nativamente a funcionalidade de exibir feedbacks aprovados.

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
Crie uma seção de depoimentos que carrega feedbacks dinamicamente de um arquivo JSON.

**Arquivo de dados**: `public/feedbacks.json`
**Estrutura esperada**:
```json
{
  "lastUpdated": "2024-01-01T00:00:00.000Z",
  "total": 5,
  "feedbacks": [
    {
      "id": "unique-id",
      "name": "Nome do Cliente",
      "email": "email@cliente.com",
      "phone": "+5511999999999",
      "rating": 5,
      "message": "Excelente atendimento!",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "publishedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Componente de Feedback**:
- Exibir estrelas de avaliação (1-5)
- Nome do cliente
- Mensagem do feedback
- Data de publicação
- Layout responsivo com grid
- Animações suaves ao carregar

### 3. Funcionalidades Técnicas
- **Carregamento dinâmico**: Buscar feedbacks de `public/feedbacks.json`
- **Fallback**: Se arquivo não existir, mostrar mensagem "Em breve nossos clientes compartilharão suas experiências"
- **Performance**: Implementar lazy loading para feedbacks
- **SEO**: Meta tags otimizadas para depoimentos
- **Acessibilidade**: Alt texts e ARIA labels apropriados

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
3. **Verifique arquivos**: Confirme que `public/feedbacks.json` foi criado
4. **Teste integração**: Verifique se o componente carrega o JSON corretamente

## Resultado Esperado

O site gerado terá:
- ✅ Seção de feedbacks funcional
- ✅ Arquivo `public/feedbacks.json` criado
- ✅ Componentes React para exibir feedbacks
- ✅ Design responsivo e moderno
- ✅ Integração pronta com o sistema da agência

## Manutenção

- O arquivo `feedbacks.json` será atualizado automaticamente pelo GAS
- Não é necessário intervenção manual no site do cliente
- A seção de feedbacks se atualiza automaticamente quando novos feedbacks são publicados
