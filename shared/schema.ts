import { pgTable, serial, varchar, text, timestamp, integer, boolean, jsonb, decimal } from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'

// Tabela de leads com scoring
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  siteSlug: varchar('site_slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  company: varchar('company', { length: 255 }),
  message: text('message'),
  source: varchar('source', { length: 100 }),
  score: integer('score').default(0),
  priority: varchar('priority', { length: 20 }).default('cold'), // hot, warm, cold
  interactions: jsonb('interactions').default([]),
  demographics: jsonb('demographics'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastContactedAt: timestamp('last_contacted_at'),
  status: varchar('status', { length: 50 }).default('new') // new, contacted, qualified, converted
})

// Tabela de conversas WhatsApp
export const whatsappConversations = pgTable('whatsapp_conversations', {
  id: serial('id').primaryKey(),
  siteSlug: varchar('site_slug', { length: 100 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  message: text('message').notNull(),
  messageType: varchar('message_type', { length: 50 }).notNull(), // received, sent, auto_response
  messageId: varchar('message_id', { length: 255 }),
  status: varchar('status', { length: 50 }).default('sent'), // sent, delivered, read, failed
  isFromBot: boolean('is_from_bot').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  metadata: jsonb('metadata') // Extra data like media, location, etc
})

// Tabela de análises SEO
export const seoAnalyses = pgTable('seo_analyses', {
  id: serial('id').primaryKey(),
  siteSlug: varchar('site_slug', { length: 100 }).notNull(),
  url: varchar('url', { length: 500 }),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  keywords: jsonb('keywords').default([]),
  score: integer('score').default(0),
  recommendations: jsonb('recommendations').default([]),
  metaData: jsonb('meta_data'),
  structuredData: jsonb('structured_data'),
  createdAt: timestamp('created_at').defaultNow(),
  lastOptimizedAt: timestamp('last_optimized_at')
})

// Tabela de templates do marketplace
export const templates = pgTable('templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  price: decimal('price', { precision: 10, scale: 2 }).default('0.00'),
  isPremium: boolean('is_premium').default(false),
  isActive: boolean('is_active').default(true),
  previewUrl: varchar('preview_url', { length: 500 }),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  demoUrl: varchar('demo_url', { length: 500 }),
  downloadCount: integer('download_count').default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0.00'),
  features: jsonb('features').default([]),
  techStack: jsonb('tech_stack').default([]),
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// Tabela de compras de templates
export const templatePurchases = pgTable('template_purchases', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => templates.id),
  siteSlug: varchar('site_slug', { length: 100 }).notNull(),
  purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paymentId: varchar('payment_id', { length: 255 }),
  status: varchar('status', { length: 50 }).default('pending'), // pending, completed, failed, refunded
  createdAt: timestamp('created_at').defaultNow(),
  downloadedAt: timestamp('downloaded_at')
})

// Tabela de analytics/métricas
export const siteAnalytics = pgTable('site_analytics', {
  id: serial('id').primaryKey(),
  siteSlug: varchar('site_slug', { length: 100 }).notNull(),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
  visits: integer('visits').default(0),
  uniqueVisitors: integer('unique_visitors').default(0),
  pageViews: integer('page_views').default(0),
  bounceRate: decimal('bounce_rate', { precision: 5, scale: 2 }).default('0.00'),
  avgSessionDuration: integer('avg_session_duration').default(0), // seconds
  conversionRate: decimal('conversion_rate', { precision: 5, case: 2 }).default('0.00'),
  leads: integer('leads').default(0),
  conversions: integer('conversions').default(0),
  topPages: jsonb('top_pages').default([]),
  deviceTypes: jsonb('device_types').default([]),
  trafficSources: jsonb('traffic_sources').default([]),
  createdAt: timestamp('created_at').defaultNow()
})

// Tabela de configurações white-label
export const whiteLabelConfigs = pgTable('white_label_configs', {
  id: serial('id').primaryKey(),
  siteSlug: varchar('site_slug', { length: 100 }).notNull(),
  resellerName: varchar('reseller_name', { length: 255 }),
  resellerEmail: varchar('reseller_email', { length: 255 }),
  customDomain: varchar('custom_domain', { length: 255 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  primaryColor: varchar('primary_color', { length: 20 }).default('#3B82F6'),
  secondaryColor: varchar('secondary_color', { length: 20 }).default('#10B981'),
  customCss: text('custom_css'),
  isActive: boolean('is_active').default(false),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('10.00'),
  totalCommissions: decimal('total_commissions', { precision: 10, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// Tabela de audit logs para rastreamento VIP
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  siteSlug: varchar('site_slug', { length: 100 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: varchar('resource_id', { length: 100 }),
  userId: varchar('user_id', { length: 100 }),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow()
})

// Schemas Zod para validação
export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const insertWhatsappConversationSchema = createInsertSchema(whatsappConversations).omit({
  id: true,
  createdAt: true
})

export const insertSeoAnalysisSchema = createInsertSchema(seoAnalyses).omit({
  id: true,
  createdAt: true
})

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  downloadCount: true,
  rating: true
})

export const insertSiteAnalyticsSchema = createInsertSchema(siteAnalytics).omit({
  id: true,
  createdAt: true
})

export const insertWhiteLabelConfigSchema = createInsertSchema(whiteLabelConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalCommissions: true
})

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true
})

// Types para TypeScript
export type Lead = typeof leads.$inferSelect
export type InsertLead = z.infer<typeof insertLeadSchema>

export type WhatsappConversation = typeof whatsappConversations.$inferSelect
export type InsertWhatsappConversation = z.infer<typeof insertWhatsappConversationSchema>

export type SeoAnalysis = typeof seoAnalyses.$inferSelect
export type InsertSeoAnalysis = z.infer<typeof insertSeoAnalysisSchema>

export type Template = typeof templates.$inferSelect
export type InsertTemplate = z.infer<typeof insertTemplateSchema>

export type TemplatePurchase = typeof templatePurchases.$inferSelect

export type SiteAnalytics = typeof siteAnalytics.$inferSelect
export type InsertSiteAnalytics = z.infer<typeof insertSiteAnalyticsSchema>

export type WhiteLabelConfig = typeof whiteLabelConfigs.$inferSelect
export type InsertWhiteLabelConfig = z.infer<typeof insertWhiteLabelConfigSchema>

export type AuditLog = typeof auditLogs.$inferSelect
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>