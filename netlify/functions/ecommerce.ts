import type { Handler } from '@netlify/functions'
import { rateLimitMiddleware, verifyVipAccess } from './shared/security'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  category: string;
  tags: string[];
  images: string[];
  inventory: {
    quantity: number;
    trackQuantity: boolean;
    allowBackorder: boolean;
  };
  dimensions?: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  shippingMethod: string;
  trackingCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
  parentId?: string;
  image?: string;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  sortOrder: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface StoreSettings {
  storeName: string;
  storeDescription: string;
  currency: string;
  taxRate: number;
  shippingRates: ShippingRate[];
  paymentMethods: PaymentMethod[];
  notificationEmails: string[];
  termsAndConditions: string;
  privacyPolicy: string;
  returnPolicy: string;
}

interface ShippingRate {
  id: string;
  name: string;
  description: string;
  rate: number;
  freeShippingThreshold?: number;
  zones: string[];
}

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  provider: 'stripe' | 'paypal' | 'mercadopago' | 'pix';
  settings: Record<string, any>;
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    }
  }

  try {
    // Verificar rate limiting
    await rateLimitMiddleware('ecommerce', event)
    
    const body = JSON.parse(event.body || '{}')
    const { 
      action, 
      siteSlug, 
      vipPin, 
      product,
      order,
      category,
      settings,
      productId,
      orderId,
      filters,
      pagination
    } = body

    if (!siteSlug || !vipPin) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Site e PIN VIP são obrigatórios' 
        })
      }
    }

    // Verificar acesso VIP
    const isVipValid = await verifyVipAccess(siteSlug, vipPin)
    if (!isVipValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ ok: false, error: 'Acesso VIP inválido' })
      }
    }

    switch (action) {
      // PRODUTOS
      case 'get_products':
        return await getProducts(siteSlug, filters, pagination)
      
      case 'get_product':
        return await getProduct(siteSlug, productId)
      
      case 'create_product':
        return await createProduct(siteSlug, product)
      
      case 'update_product':
        return await updateProduct(siteSlug, productId, product)
      
      case 'delete_product':
        return await deleteProduct(siteSlug, productId)
      
      case 'toggle_product_status':
        return await toggleProductStatus(siteSlug, productId)
      
      // CATEGORIAS
      case 'get_categories':
        return await getCategories(siteSlug)
      
      case 'create_category':
        return await createCategory(siteSlug, category)
      
      case 'update_category':
        return await updateCategory(siteSlug, category)
      
      // PEDIDOS
      case 'get_orders':
        return await getOrders(siteSlug, filters, pagination)
      
      case 'get_order':
        return await getOrder(siteSlug, orderId)
      
      case 'create_order':
        return await createOrder(siteSlug, order)
      
      case 'update_order_status':
        return await updateOrderStatus(siteSlug, orderId, order.status)
      
      case 'process_payment':
        return await processPayment(siteSlug, orderId, order)
      
      // CONFIGURAÇÕES
      case 'get_store_settings':
        return await getStoreSettings(siteSlug)
      
      case 'update_store_settings':
        return await updateStoreSettings(siteSlug, settings)
      
      // ANALYTICS
      case 'get_store_analytics':
        return await getStoreAnalytics(siteSlug)
      
      case 'get_product_analytics':
        return await getProductAnalytics(siteSlug, productId)
      
      // INVENTÁRIO
      case 'update_inventory':
        return await updateInventory(siteSlug, productId, product.inventory)
      
      case 'bulk_inventory_update':
        return await bulkInventoryUpdate(siteSlug, product)
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Ação inválida' })
        }
    }

  } catch (error) {
    console.error('Erro no sistema de e-commerce:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

// ================= PRODUTOS =================

async function getProducts(siteSlug: string, filters?: any, pagination?: any) {
  try {
    // TODO: Buscar produtos do Google Sheets com filtros
    // Mock data para desenvolvimento
    const products: Product[] = [
      {
        id: '1',
        name: 'Camiseta Premium',
        description: 'Camiseta de alta qualidade feita com algodão orgânico',
        price: 89.90,
        compareAtPrice: 119.90,
        sku: 'CAM-PREM-001',
        category: 'Roupas',
        tags: ['camiseta', 'premium', 'algodão'],
        images: ['/api/placeholder/400/400'],
        inventory: {
          quantity: 50,
          trackQuantity: true,
          allowBackorder: false
        },
        dimensions: {
          weight: 0.2,
          length: 30,
          width: 25,
          height: 1
        },
        seo: {
          title: 'Camiseta Premium - Algodão Orgânico',
          description: 'Camiseta de alta qualidade feita com algodão orgânico certificado',
          keywords: ['camiseta', 'premium', 'algodão', 'orgânico']
        },
        status: 'active',
        featured: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Tênis Esportivo',
        description: 'Tênis confortável para atividades físicas',
        price: 299.90,
        sku: 'TEN-ESP-001',
        category: 'Calçados',
        tags: ['tênis', 'esporte', 'corrida'],
        images: ['/api/placeholder/400/400'],
        inventory: {
          quantity: 25,
          trackQuantity: true,
          allowBackorder: true
        },
        seo: {
          title: 'Tênis Esportivo Confortável',
          description: 'Tênis ideal para corrida e atividades físicas',
          keywords: ['tênis', 'esporte', 'corrida', 'confortável']
        },
        status: 'active',
        featured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Mochila Executiva',
        description: 'Mochila elegante para uso profissional',
        price: 189.90,
        sku: 'MOC-EXE-001',
        category: 'Acessórios',
        tags: ['mochila', 'executiva', 'profissional'],
        images: ['/api/placeholder/400/400'],
        inventory: {
          quantity: 15,
          trackQuantity: true,
          allowBackorder: false
        },
        seo: {
          title: 'Mochila Executiva Elegante',
          description: 'Mochila profissional perfeita para o ambiente corporativo',
          keywords: ['mochila', 'executiva', 'profissional', 'elegante']
        },
        status: 'active',
        featured: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    const filteredProducts = applyFilters(products, filters)
    const paginatedProducts = applyPagination(filteredProducts, pagination)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        products: paginatedProducts.items,
        total: filteredProducts.length,
        page: paginatedProducts.page,
        totalPages: paginatedProducts.totalPages
      })
    }

  } catch (error) {
    console.error('Erro ao obter produtos:', error)
    throw error
  }
}

function applyFilters(products: Product[], filters?: any): Product[] {
  if (!filters) return products

  return products.filter(product => {
    if (filters.category && product.category !== filters.category) return false
    if (filters.status && product.status !== filters.status) return false
    if (filters.featured !== undefined && product.featured !== filters.featured) return false
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      const searchableText = `${product.name} ${product.description} ${product.tags.join(' ')}`.toLowerCase()
      if (!searchableText.includes(searchTerm)) return false
    }
    if (filters.minPrice && product.price < filters.minPrice) return false
    if (filters.maxPrice && product.price > filters.maxPrice) return false
    
    return true
  })
}

function applyPagination(items: any[], pagination?: any) {
  const page = pagination?.page || 1
  const limit = pagination?.limit || 12
  const offset = (page - 1) * limit
  
  return {
    items: items.slice(offset, offset + limit),
    page,
    totalPages: Math.ceil(items.length / limit)
  }
}

async function getProduct(siteSlug: string, productId: string) {
  try {
    // TODO: Buscar produto específico do Google Sheets
    const products = await getProductsData(siteSlug)
    const product = products.find(p => p.id === productId)

    if (!product) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: 'Produto não encontrado' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        product
      })
    }

  } catch (error) {
    console.error('Erro ao obter produto:', error)
    throw error
  }
}

async function getProductsData(siteSlug: string): Promise<Product[]> {
  // TODO: Implementar busca real no Google Sheets
  return [] // Mock data usado nas outras funções
}

async function createProduct(siteSlug: string, productData: any) {
  try {
    // Validar dados obrigatórios
    if (!productData.name || !productData.price || !productData.sku) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Nome, preço e SKU são obrigatórios' })
      }
    }

    // Verificar se SKU já existe
    const existingProducts = await getProductsData(siteSlug)
    if (existingProducts.some(p => p.sku === productData.sku)) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ ok: false, error: 'SKU já existe' })
      }
    }

    const product: Product = {
      id: generateProductId(),
      name: productData.name,
      description: productData.description || '',
      price: parseFloat(productData.price),
      compareAtPrice: productData.compareAtPrice ? parseFloat(productData.compareAtPrice) : undefined,
      sku: productData.sku,
      category: productData.category || 'Sem categoria',
      tags: productData.tags || [],
      images: productData.images || [],
      inventory: {
        quantity: productData.quantity || 0,
        trackQuantity: productData.trackQuantity || false,
        allowBackorder: productData.allowBackorder || false
      },
      dimensions: productData.dimensions,
      seo: {
        title: productData.seoTitle || productData.name,
        description: productData.seoDescription || productData.description,
        keywords: productData.seoKeywords || []
      },
      status: 'draft',
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // TODO: Salvar no Google Sheets
    await saveProductToStorage(siteSlug, product)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        product,
        message: 'Produto criado com sucesso'
      })
    }

  } catch (error) {
    console.error('Erro ao criar produto:', error)
    throw error
  }
}

function generateProductId(): string {
  return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

async function saveProductToStorage(siteSlug: string, product: Product) {
  // TODO: Salvar no Google Sheets
  console.log('Salvando produto:', { siteSlug, product })
  
  // Em produção, implementar salvamento real no Google Sheets
  // Estrutura sugerida da planilha "products":
  // site_slug | id | name | description | price | compare_at_price | sku | category | tags | images | inventory_quantity | track_quantity | allow_backorder | seo_title | seo_description | status | featured | created_at | updated_at
}

async function updateProduct(siteSlug: string, productId: string, updateData: any) {
  try {
    // TODO: Atualizar produto no Google Sheets
    
    const updatedProduct = {
      ...updateData,
      id: productId,
      updatedAt: new Date().toISOString()
    }

    await saveProductToStorage(siteSlug, updatedProduct)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        product: updatedProduct,
        message: 'Produto atualizado com sucesso'
      })
    }

  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    throw error
  }
}

async function deleteProduct(siteSlug: string, productId: string) {
  try {
    // TODO: Remover produto do Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Produto removido com sucesso',
        productId
      })
    }

  } catch (error) {
    console.error('Erro ao remover produto:', error)
    throw error
  }
}

async function toggleProductStatus(siteSlug: string, productId: string) {
  try {
    // TODO: Alternar status no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Status do produto alterado',
        productId
      })
    }

  } catch (error) {
    console.error('Erro ao alterar status:', error)
    throw error
  }
}

// ================= CATEGORIAS =================

async function getCategories(siteSlug: string) {
  try {
    // TODO: Buscar categorias do Google Sheets
    // Mock data para desenvolvimento
    const categories: Category[] = [
      {
        id: '1',
        name: 'Roupas',
        description: 'Vestuário e acessórios de moda',
        slug: 'roupas',
        image: '/api/placeholder/300/200',
        seo: {
          title: 'Roupas e Moda',
          description: 'Coleção completa de roupas e acessórios',
          keywords: ['roupas', 'moda', 'vestuário']
        },
        sortOrder: 1,
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Calçados',
        description: 'Sapatos, tênis e sandálias',
        slug: 'calcados',
        image: '/api/placeholder/300/200',
        seo: {
          title: 'Calçados e Tênis',
          description: 'Variedade completa de calçados para todas as ocasiões',
          keywords: ['calçados', 'tênis', 'sapatos']
        },
        sortOrder: 2,
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Acessórios',
        description: 'Bolsas, mochilas e acessórios',
        slug: 'acessorios',
        image: '/api/placeholder/300/200',
        seo: {
          title: 'Acessórios e Bolsas',
          description: 'Acessórios essenciais para complementar seu look',
          keywords: ['acessórios', 'bolsas', 'mochilas']
        },
        sortOrder: 3,
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ]

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        categories: categories.filter(c => c.status === 'active')
      })
    }

  } catch (error) {
    console.error('Erro ao obter categorias:', error)
    throw error
  }
}

async function createCategory(siteSlug: string, categoryData: any) {
  try {
    const category: Category = {
      id: generateCategoryId(),
      name: categoryData.name,
      description: categoryData.description || '',
      slug: generateSlug(categoryData.name),
      parentId: categoryData.parentId,
      image: categoryData.image,
      seo: {
        title: categoryData.seoTitle || categoryData.name,
        description: categoryData.seoDescription || categoryData.description,
        keywords: categoryData.seoKeywords || []
      },
      sortOrder: categoryData.sortOrder || 999,
      status: 'active',
      createdAt: new Date().toISOString()
    }

    // TODO: Salvar no Google Sheets
    await saveCategoryToStorage(siteSlug, category)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        category,
        message: 'Categoria criada com sucesso'
      })
    }

  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    throw error
  }
}

function generateCategoryId(): string {
  return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

async function saveCategoryToStorage(siteSlug: string, category: Category) {
  // TODO: Salvar no Google Sheets
  console.log('Salvando categoria:', { siteSlug, category })
}

async function updateCategory(siteSlug: string, categoryData: any) {
  try {
    // TODO: Atualizar categoria no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        category: categoryData,
        message: 'Categoria atualizada com sucesso'
      })
    }

  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    throw error
  }
}

// ================= PEDIDOS =================

async function getOrders(siteSlug: string, filters?: any, pagination?: any) {
  try {
    // TODO: Buscar pedidos do Google Sheets
    // Mock data para desenvolvimento
    const orders: Order[] = [
      {
        id: '1',
        orderNumber: 'ORD-2024-001',
        customer: {
          name: 'João Silva',
          email: 'joao@email.com',
          phone: '+5511999999999',
          address: {
            street: 'Rua das Flores, 123',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            country: 'Brasil'
          }
        },
        items: [
          {
            productId: '1',
            productName: 'Camiseta Premium',
            sku: 'CAM-PREM-001',
            quantity: 2,
            price: 89.90,
            total: 179.80
          }
        ],
        subtotal: 179.80,
        tax: 0,
        shipping: 15.00,
        discount: 0,
        total: 194.80,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'Cartão de Crédito',
        shippingMethod: 'Correios Sedex',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        orders,
        total: orders.length
      })
    }

  } catch (error) {
    console.error('Erro ao obter pedidos:', error)
    throw error
  }
}

async function getOrder(siteSlug: string, orderId: string) {
  try {
    // TODO: Buscar pedido específico do Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        order: null // Mock
      })
    }

  } catch (error) {
    console.error('Erro ao obter pedido:', error)
    throw error
  }
}

async function createOrder(siteSlug: string, orderData: any) {
  try {
    const order: Order = {
      id: generateOrderId(),
      orderNumber: generateOrderNumber(),
      customer: orderData.customer,
      items: orderData.items,
      subtotal: calculateSubtotal(orderData.items),
      tax: calculateTax(orderData.items, orderData.taxRate || 0),
      shipping: orderData.shipping || 0,
      discount: orderData.discount || 0,
      total: 0, // Será calculado
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: orderData.paymentMethod,
      shippingMethod: orderData.shippingMethod,
      notes: orderData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Calcular total
    order.total = order.subtotal + order.tax + order.shipping - order.discount

    // TODO: Salvar no Google Sheets
    await saveOrderToStorage(siteSlug, order)

    // Processar pagamento se fornecido
    if (orderData.processPayment) {
      await processOrderPayment(siteSlug, order)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        order,
        message: 'Pedido criado com sucesso'
      })
    }

  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    throw error
  }
}

function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear()
  const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ORD-${year}-${sequence}`
}

function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.total, 0)
}

function calculateTax(items: OrderItem[], taxRate: number): number {
  const subtotal = calculateSubtotal(items)
  return subtotal * (taxRate / 100)
}

async function saveOrderToStorage(siteSlug: string, order: Order) {
  // TODO: Salvar no Google Sheets
  console.log('Salvando pedido:', { siteSlug, order })
}

async function processOrderPayment(siteSlug: string, order: Order) {
  // TODO: Integrar com gateway de pagamento (Stripe, PayPal, MercadoPago, etc.)
  console.log('Processando pagamento do pedido:', order.id)
}

async function updateOrderStatus(siteSlug: string, orderId: string, status: string) {
  try {
    // TODO: Atualizar status no Google Sheets
    
    // Enviar notificação de atualização
    await sendOrderStatusNotification(orderId, status)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: `Status do pedido atualizado para ${status}`,
        orderId,
        status
      })
    }

  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error)
    throw error
  }
}

async function sendOrderStatusNotification(orderId: string, status: string) {
  // TODO: Enviar notificação por email/SMS
  console.log('Enviando notificação de status:', { orderId, status })
}

async function processPayment(siteSlug: string, orderId: string, paymentData: any) {
  try {
    // TODO: Processar pagamento com gateway escolhido
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Pagamento processado com sucesso',
        orderId,
        paymentStatus: 'paid'
      })
    }

  } catch (error) {
    console.error('Erro ao processar pagamento:', error)
    throw error
  }
}

// ================= CONFIGURAÇÕES =================

async function getStoreSettings(siteSlug: string) {
  try {
    // TODO: Buscar configurações do Google Sheets
    // Mock data para desenvolvimento
    const settings: StoreSettings = {
      storeName: 'Minha Loja Online',
      storeDescription: 'A melhor loja virtual da região',
      currency: 'BRL',
      taxRate: 0,
      shippingRates: [
        {
          id: '1',
          name: 'Correios PAC',
          description: 'Entrega em 5-10 dias úteis',
          rate: 12.50,
          freeShippingThreshold: 99.00,
          zones: ['BR']
        },
        {
          id: '2',
          name: 'Correios Sedex',
          description: 'Entrega em 1-3 dias úteis',
          rate: 25.00,
          zones: ['BR']
        }
      ],
      paymentMethods: [
        {
          id: '1',
          name: 'Cartão de Crédito',
          enabled: true,
          provider: 'stripe',
          settings: {}
        },
        {
          id: '2',
          name: 'PIX',
          enabled: true,
          provider: 'pix',
          settings: {}
        }
      ],
      notificationEmails: ['vendas@minhaloja.com'],
      termsAndConditions: 'Termos e condições da loja...',
      privacyPolicy: 'Política de privacidade...',
      returnPolicy: 'Política de trocas e devoluções...'
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        settings
      })
    }

  } catch (error) {
    console.error('Erro ao obter configurações:', error)
    throw error
  }
}

async function updateStoreSettings(siteSlug: string, settingsData: any) {
  try {
    // TODO: Salvar configurações no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        settings: settingsData,
        message: 'Configurações da loja atualizadas'
      })
    }

  } catch (error) {
    console.error('Erro ao atualizar configurações:', error)
    throw error
  }
}

// ================= ANALYTICS =================

async function getStoreAnalytics(siteSlug: string) {
  try {
    // TODO: Calcular analytics do Google Sheets
    // Mock data para desenvolvimento
    const analytics = {
      totalRevenue: 12450.00,
      totalOrders: 87,
      averageOrderValue: 143.10,
      conversionRate: 2.8,
      topProducts: [
        { name: 'Camiseta Premium', revenue: 3500.00, quantity: 42 },
        { name: 'Tênis Esportivo', revenue: 2800.00, quantity: 15 },
        { name: 'Mochila Executiva', revenue: 1900.00, quantity: 10 }
      ],
      revenueByMonth: [
        { month: 'Jan', revenue: 2100 },
        { month: 'Fev', revenue: 2800 },
        { month: 'Mar', revenue: 3200 },
        { month: 'Abr', revenue: 4350 }
      ],
      ordersByStatus: {
        pending: 5,
        confirmed: 12,
        processing: 8,
        shipped: 25,
        delivered: 32,
        cancelled: 3,
        refunded: 2
      },
      customerMetrics: {
        newCustomers: 23,
        returningCustomers: 18,
        customerLifetimeValue: 287.50
      },
      lastUpdate: new Date().toISOString()
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        analytics
      })
    }

  } catch (error) {
    console.error('Erro ao obter analytics:', error)
    throw error
  }
}

async function getProductAnalytics(siteSlug: string, productId: string) {
  try {
    // TODO: Analytics específicas do produto
    
    const analytics = {
      views: 245,
      addToCart: 32,
      purchases: 18,
      conversionRate: 7.3,
      revenue: 1618.20,
      averageRating: 4.7,
      reviewCount: 12
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        analytics
      })
    }

  } catch (error) {
    console.error('Erro ao obter analytics do produto:', error)
    throw error
  }
}

// ================= INVENTÁRIO =================

async function updateInventory(siteSlug: string, productId: string, inventoryData: any) {
  try {
    // TODO: Atualizar inventário no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Inventário atualizado',
        productId,
        inventory: inventoryData
      })
    }

  } catch (error) {
    console.error('Erro ao atualizar inventário:', error)
    throw error
  }
}

async function bulkInventoryUpdate(siteSlug: string, updates: any) {
  try {
    // TODO: Atualização em lote do inventário
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Inventário atualizado em lote',
        updatedCount: updates.length
      })
    }

  } catch (error) {
    console.error('Erro na atualização em lote:', error)
    throw error
  }
}