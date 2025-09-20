# ELEVEA - Agência Digital para Pequenos Negócios

## Overview

ELEVEA é uma agência digital especializada em democratizar a presença digital para pequenos negócios locais. O projeto oferece soluções completas incluindo sites profissionais, configuração do Google Meu Negócio, chatbots automatizados e sistemas de gestão. A plataforma utiliza uma arquitetura moderna com React/TypeScript no frontend e integração com Google Apps Script para backend, hospedada na Netlify com funções serverless.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 com TypeScript e Vite para build otimizado
- **UI Components**: Shadcn/ui baseado em Radix UI primitives para componentes acessíveis
- **Styling**: Tailwind CSS com design system customizado usando CSS variables e gradientes
- **State Management**: TanStack Query para cache e sincronização de dados do servidor
- **Routing**: React Router v6 com guards de proteção para rotas privadas
- **Forms**: React Hook Form com validação via Zod resolvers

### Backend Architecture
- **Serverless Functions**: Netlify Functions (Node.js) como proxy/middleware
- **Primary Backend**: Google Apps Script (GAS) como backend principal para persistência
- **Authentication**: JWT via cookies HttpOnly gerenciado por Netlify Functions
- **File Upload**: Base64 encoding para evitar CORS, proxy através de Netlify Functions

### Data Storage Solutions
- **Primary Database**: Google Sheets via Google Apps Script para dados estruturados
- **File Storage**: Google Drive integrado via GAS para assets (logos, fotos)
- **Cache Strategy**: TanStack Query para cache local no frontend
- **Session Management**: Cookies HttpOnly com tokens JWT

### Authentication and Authorization
- **Authentication Method**: Email/password com reset via token
- **Role System**: Duas roles principais (admin, client) com guards específicos
- **Session Persistence**: Cookies HttpOnly com validação server-side
- **Password Reset**: Sistema de tokens temporários enviados por email via Resend API

### API Structure
- **Client API**: Endpoints RESTful via Netlify Functions (`/.netlify/functions/client-api`)
- **Admin API**: Endpoints administrativos protegidos (`/.netlify/functions/admin-*`)
- **Proxy Pattern**: Netlify Functions como proxy para Google Apps Script
- **File Handling**: Upload multipart convertido para base64 no proxy

## External Dependencies

### Third-party Services
- **Google Apps Script**: Backend principal e integração com Google Workspace
- **Google Sheets**: Banco de dados principal para clientes, leads, configurações
- **Google Drive**: Armazenamento de arquivos (logos, fotos dos sites)
- **Resend API**: Serviço de email transacional para notificações e reset de senha
- **MercadoPago**: Gateway de pagamento para assinaturas e cobrança recorrente
- **Netlify**: Hospedagem, functions serverless e CI/CD

### External APIs and Integrations
- **Google Apps Script Web App**: Endpoint principal para operações CRUD
- **MercadoPago Webhooks**: Integração para notificações de pagamento
- **WhatsApp Business API**: Integração via URLs para comunicação com clientes
- **Google My Business**: Configuração automática via GAS

### Development Dependencies
- **Lovable Integration**: Platform-specific tooling para desenvolvimento colaborativo
- **TypeScript**: Type safety e melhor developer experience
- **ESLint**: Code quality e consistency
- **PostCSS**: Processing para Tailwind CSS

### Environment Variables Required
- `GAS_BASE_URL`: URL do Google Apps Script deployment
- `VITE_UPGRADE_URL`: URL para upgrade de planos
- `RESEND_API_KEY`: Chave da API do Resend para emails
- `MP_ACCESS_TOKEN`: Token do MercadoPago para webhooks
- `ADMIN_DASH_TOKEN`: Token para autenticação de admin