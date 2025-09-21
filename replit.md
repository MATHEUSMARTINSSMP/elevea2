# ELEVEA - Agência Digital Inteligente com IA

## Overview

ELEVEA é uma agência digital especializada em democratizar a presença digital para pequenos negócios locais através de **Inteligência Artificial integrada**. O projeto oferece soluções completas incluindo sites profissionais, configuração do Google Meu Negócio, chatbots automatizados WhatsApp, sistema de lead scoring inteligente, auto-SEO com IA, e sistemas de gestão avançados. A plataforma utiliza uma arquitetura moderna com React/TypeScript no frontend, OpenAI para funcionalidades IA, e integração com Google Apps Script para backend, hospedada na Netlify com funções serverless.

## Recent Changes

### v2.0.0 - IA Integration (Janeiro 2025)
- **Auto-SEO System**: Implementado sistema completo de otimização SEO automática com análise de conteúdo via OpenAI, geração dinâmica de meta tags, sitemap.xml e robots.txt automáticos
- **WhatsApp Business API**: Integração completa com chatbot inteligente, webhook seguro, mensagens automáticas e histórico de conversas
- **Lead Scoring System**: Sistema de pontuação automática de leads (0-100) com classificação Hot/Warm/Cold baseada em múltiplos fatores
- **Security Hardening**: Implementação de validação VIP obrigatória, verificação de assinatura para webhooks, sanitização de dados e error handling robusto
- **Performance Optimization**: Otimização do dashboard (6s vs 22s anteriores), cache inteligente, lazy loading de componentes IA

### Security Implementations
- **VIP Gatekeeper**: Todas as funcionalidades IA requerem PIN VIP validado server-side
- **Webhook Signature Validation**: Verificação criptográfica usando crypto.timingSafeEqual()
- **Rate Limiting**: Sistema em implementação para prevenir abuso das APIs IA
- **Environment Protection**: Chaves OpenAI e WhatsApp protegidas no backend
- **CORS Security**: Headers apropriados configurados para todas as APIs

## User Preferences

Preferred communication style: Simple, everyday language.
Technology preference: **NEVER migrate to Replit - always maintain Netlify + GitHub + Google architecture**
Implementation focus: **100% adapted for Netlify, GitHub, and Google Apps Script**
Security requirements: All AI and new components must use server-side Netlify functions with VIP authentication
Client access: Only Dashboard page accessible to clients - all improvements focused on dashboard features

## Project Architecture

### Frontend Architecture Enhanced
- **Framework**: React 18 com TypeScript e Vite para build otimizado
- **UI Components**: Shadcn/ui baseado em Radix UI primitives + componentes IA customizados
- **Styling**: Tailwind CSS com design system para funcionalidades IA
- **State Management**: TanStack Query para cache de dados IA e sincronização de servidor
- **AI Components**: SEOOptimizer, WhatsAppManager, LeadScoring, AICopywriter
- **Security Guards**: VIP authentication guards para componentes IA

### Backend Architecture with AI
- **Serverless Functions**: Netlify Functions (Node.js) como proxy/middleware + OpenAI integration
- **AI Layer**: OpenAI GPT-4 Turbo para análises, geração de conteúdo e automações
- **Primary Backend**: Google Apps Script (GAS) como backend principal para persistência
- **Authentication**: JWT via cookies HttpOnly + VIP PIN validation para IA features
- **Webhook Security**: Signature validation para WhatsApp Business API

### AI Integration Architecture
- **OpenAI API**: Integração direta via Netlify Functions para análises SEO e geração de conteúdo
- **WhatsApp Business**: Webhook processing com chatbot inteligente e respostas automáticas
- **Lead Intelligence**: Sistema de scoring baseado em ML patterns e análise comportamental
- **Content Generation**: AI copywriting com prompts otimizados para diferentes tipos de negócio
- **SEO Automation**: Análise automática de conteúdo e geração de meta tags otimizadas

### Data Storage Solutions Enhanced
- **Primary Database**: Google Sheets via Google Apps Script + novas planilhas para IA data
- **AI Data Storage**: 
  - `lead_scoring`: Pontuações e análises de leads
  - `seo_analysis`: Resultados de análises SEO
  - `whatsapp_conversations`: Histórico de conversas WhatsApp
- **File Storage**: Google Drive integrado via GAS para assets + generated content
- **Cache Strategy**: TanStack Query para cache de resultados IA no frontend
- **Session Management**: Cookies HttpOnly com tokens JWT + VIP validation

### New API Structure with AI
- **AI SEO API**: `/.netlify/functions/auto-seo-generator` - Análise e otimização automática
- **WhatsApp API**: `/.netlify/functions/whatsapp-webhook` - Webhook e chat management
- **Lead Scoring API**: `/.netlify/functions/lead-scoring` - Pontuação inteligente de leads
- **Sitemap Generator**: `/.netlify/functions/sitemap-generator` - Geração automática de sitemap
- **Robots Generator**: `/.netlify/functions/robots-generator` - Configuração automática de robots.txt

## External Dependencies Enhanced

### AI and Communication Services
- **OpenAI API**: GPT-4 Turbo para análises de conteúdo, geração de texto e otimizações SEO
- **WhatsApp Business API**: Webhook integration para chatbot automatizado e mensagens
- **Google Apps Script**: Backend principal com extensões para processamento de dados IA
- **Google Sheets**: Database com novas planilhas para dados de IA (leads, SEO, conversas)

### Enhanced Third-party Services
- **Google Apps Script**: Backend principal + processamento de dados IA
- **Google Sheets**: Banco de dados + storage para análises IA e lead scoring
- **Google Drive**: Armazenamento de arquivos + conteúdo gerado por IA
- **Resend API**: Serviço de email transacional para notificações
- **MercadoPago**: Gateway de pagamento para assinaturas VIP
- **Netlify**: Hospedagem + functions serverless + AI processing layer

### Security and Monitoring
- **Crypto Module**: Para validação de assinaturas de webhook
- **Rate Limiting**: Sistema em desenvolvimento para proteção contra abuso
- **Environment Variables**: Proteção segura de chaves API (OpenAI, WhatsApp)
- **Error Tracking**: Monitoramento robusto de erros nas operações IA

### Environment Variables Required
- `GAS_BASE_URL`: URL do Google Apps Script deployment
- `VITE_UPGRADE_URL`: URL para upgrade de planos VIP
- `OPENAI_API_KEY`: Chave da API OpenAI para funcionalidades IA
- `WHATSAPP_ACCESS_TOKEN`: Token de acesso WhatsApp Business API
- `WHATSAPP_APP_SECRET`: Secret para validação de webhook WhatsApp
- `WHATSAPP_VERIFY_TOKEN`: Token de verificação do webhook
- `RESEND_API_KEY`: Chave da API do Resend para emails
- `MP_ACCESS_TOKEN`: Token do MercadoPago para webhooks

## Implementation Status

### ✅ Completed Features
- **Auto-SEO System**: Análise inteligente de conteúdo, meta tags automáticas, sitemap/robots.txt
- **WhatsApp Business**: Chatbot automatizado, webhook seguro, histórico de conversas
- **Lead Scoring**: Pontuação automática 0-100, classificação Hot/Warm/Cold, insights acionáveis
- **VIP Security**: Authentication gates, PIN validation, environment protection
- **Performance**: Dashboard otimizado, cache inteligente, error handling robusto

### 🔄 In Progress
- **Rate Limiting**: Sistema de proteção contra abuso das APIs IA (80% completo)
- **Audit Logs**: Rastreamento de mudanças e operações VIP (próxima implementação)

### 📋 Planned Features
- **Template Marketplace**: Loja de templates premium pagos
- **White-label System**: Sistema de revenda para outras agências  
- **E-commerce Integration**: Funcionalidades completas de venda online
- **Appointment Scheduling**: Sistema de agendamento inteligente
- **Multi-language Support**: Suporte completo a múltiplos idiomas
- **Advanced Analytics**: Dashboards preditivos com IA
- **Mobile App**: App nativo para gestão móvel

## Technical Debt and Improvements

### Security Enhancements
- Implement comprehensive rate limiting across all AI endpoints
- Add audit logging for all VIP operations and AI usage
- Enhance CORS policies and add request validation middleware
- Implement API usage monitoring and alerting

### Performance Optimizations  
- Implement Redis caching for AI responses
- Add CDN for static assets and generated content
- Optimize OpenAI prompt engineering for faster responses
- Implement background job processing for heavy AI tasks

### Code Quality
- Add comprehensive test coverage for AI functions
- Implement TypeScript strict mode across all files
- Add API documentation with OpenAPI/Swagger
- Refactor common patterns into reusable utilities

## Development Guidelines

### AI Development Patterns
- All AI functions must include VIP validation
- Implement proper error handling with fallbacks
- Cache AI responses to minimize API costs
- Use structured prompts for consistent results
- Always validate and sanitize AI-generated content

### Security First Approach
- Never expose API keys in frontend code
- Validate all inputs before AI processing
- Implement rate limiting on all AI endpoints
- Log security events and AI usage patterns
- Use environment variables for all sensitive data

### Performance Considerations
- Implement caching strategies for AI responses
- Use streaming for long-running AI operations
- Optimize prompts for faster OpenAI responses
- Monitor API usage and costs
- Implement graceful degradation when AI services fail