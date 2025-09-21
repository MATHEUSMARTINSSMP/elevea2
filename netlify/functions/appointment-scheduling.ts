import type { Handler } from '@netlify/functions'
import { rateLimitMiddleware, verifyVipAccess } from './shared/security'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

interface Appointment {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceType: string;
  date: string;
  time: string;
  duration: number; // em minutos
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  price?: number;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceType {
  id: string;
  name: string;
  description: string;
  duration: number; // em minutos
  price: number;
  enabled: boolean;
  color: string;
  requiresDeposit: boolean;
  depositAmount?: number;
}

interface AvailabilitySlot {
  date: string;
  time: string;
  available: boolean;
  booked?: boolean;
  serviceTypes: string[];
}

interface BusinessHours {
  dayOfWeek: number; // 0 = domingo, 1 = segunda, etc.
  isOpen: boolean;
  openTime: string; // HH:mm format
  closeTime: string; // HH:mm format
  breakStart?: string;
  breakEnd?: string;
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
    await rateLimitMiddleware('appointment-scheduling', event)
    
    const body = JSON.parse(event.body || '{}')
    const { 
      action, 
      siteSlug, 
      vipPin, 
      appointment,
      serviceType,
      businessHours,
      dateRange,
      appointmentId,
      status,
      clientData
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
      case 'get_availability':
        return await getAvailability(siteSlug, dateRange)
      
      case 'get_service_types':
        return await getServiceTypes(siteSlug)
      
      case 'book_appointment':
        return await bookAppointment(siteSlug, appointment)
      
      case 'get_appointments':
        return await getAppointments(siteSlug, dateRange)
      
      case 'update_appointment_status':
        return await updateAppointmentStatus(siteSlug, appointmentId, status)
      
      case 'cancel_appointment':
        return await cancelAppointment(siteSlug, appointmentId)
      
      case 'reschedule_appointment':
        return await rescheduleAppointment(siteSlug, appointmentId, appointment)
      
      case 'get_business_hours':
        return await getBusinessHours(siteSlug)
      
      case 'update_business_hours':
        return await updateBusinessHours(siteSlug, businessHours)
      
      case 'add_service_type':
        return await addServiceType(siteSlug, serviceType)
      
      case 'update_service_type':
        return await updateServiceType(siteSlug, serviceType)
      
      case 'send_appointment_reminder':
        return await sendAppointmentReminder(siteSlug, appointmentId)
      
      case 'get_appointment_stats':
        return await getAppointmentStats(siteSlug)
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Ação inválida' })
        }
    }

  } catch (error) {
    console.error('Erro no sistema de agendamento:', error)
    
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

async function getAvailability(siteSlug: string, dateRange: { start: string, end: string }) {
  try {
    const businessHours = await getBusinessHoursData(siteSlug)
    const existingAppointments = await getExistingAppointments(siteSlug, dateRange)
    
    const availabilitySlots: AvailabilitySlot[] = []
    const currentDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      const dateString = currentDate.toISOString().split('T')[0]
      const businessDay = businessHours.find(bh => bh.dayOfWeek === dayOfWeek)

      if (businessDay && businessDay.isOpen) {
        // Gerar slots de 30 em 30 minutos
        const slots = generateTimeSlots(businessDay, existingAppointments, dateString)
        availabilitySlots.push(...slots)
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        availability: availabilitySlots,
        dateRange
      })
    }

  } catch (error) {
    console.error('Erro ao obter disponibilidade:', error)
    throw error
  }
}

async function getBusinessHoursData(siteSlug: string): Promise<BusinessHours[]> {
  // TODO: Buscar do Google Sheets
  // Mock data para desenvolvimento
  return [
    { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' }, // Segunda
    { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' }, // Terça
    { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' }, // Quarta
    { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' }, // Quinta
    { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '15:00' }, // Sexta
    { dayOfWeek: 6, isOpen: false, openTime: '', closeTime: '' }, // Sábado
    { dayOfWeek: 0, isOpen: false, openTime: '', closeTime: '' }  // Domingo
  ]
}

async function getExistingAppointments(siteSlug: string, dateRange: { start: string, end: string }): Promise<Appointment[]> {
  // TODO: Buscar agendamentos existentes do Google Sheets
  // Mock data para desenvolvimento
  return [
    {
      id: '1',
      clientName: 'João Silva',
      clientEmail: 'joao@email.com',
      clientPhone: '+5511999999999',
      serviceType: 'consultoria',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      duration: 60,
      status: 'confirmed',
      price: 150,
      reminderSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

function generateTimeSlots(businessDay: BusinessHours, existingAppointments: Appointment[], date: string): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = []
  
  const openTime = parseTime(businessDay.openTime)
  const closeTime = parseTime(businessDay.closeTime)
  const breakStart = businessDay.breakStart ? parseTime(businessDay.breakStart) : null
  const breakEnd = businessDay.breakEnd ? parseTime(businessDay.breakEnd) : null
  
  // Gerar slots de 30 em 30 minutos
  let currentTime = openTime
  const slotDuration = 30 // minutos

  while (currentTime < closeTime) {
    const timeString = formatTime(currentTime)
    
    // Verificar se está no horário de almoço
    let inBreak = false
    if (breakStart && breakEnd) {
      inBreak = currentTime >= breakStart && currentTime < breakEnd
    }
    
    // Verificar se já tem agendamento
    const isBooked = existingAppointments.some(apt => 
      apt.date === date && apt.time === timeString && apt.status !== 'cancelled'
    )
    
    // Verificar se é no passado
    const now = new Date()
    const slotDateTime = new Date(`${date}T${timeString}:00`)
    const isPast = slotDateTime < now

    slots.push({
      date,
      time: timeString,
      available: !inBreak && !isBooked && !isPast,
      booked: isBooked,
      serviceTypes: ['consultoria', 'reunião', 'apresentação'] // TODO: buscar do config
    })

    currentTime += slotDuration
  }

  return slots
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

async function getServiceTypes(siteSlug: string) {
  try {
    // TODO: Buscar do Google Sheets
    // Mock data para desenvolvimento
    const serviceTypes: ServiceType[] = [
      {
        id: '1',
        name: 'Consultoria de Marketing',
        description: 'Sessão de consultoria para estratégias de marketing digital',
        duration: 60,
        price: 200,
        enabled: true,
        color: '#3B82F6',
        requiresDeposit: false
      },
      {
        id: '2',
        name: 'Reunião de Planejamento',
        description: 'Reunião para planejamento de projeto ou campanha',
        duration: 90,
        price: 150,
        enabled: true,
        color: '#10B981',
        requiresDeposit: true,
        depositAmount: 50
      },
      {
        id: '3',
        name: 'Apresentação de Proposta',
        description: 'Apresentação de proposta comercial personalizada',
        duration: 45,
        price: 100,
        enabled: true,
        color: '#F59E0B',
        requiresDeposit: false
      }
    ]

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        serviceTypes: serviceTypes.filter(st => st.enabled)
      })
    }

  } catch (error) {
    console.error('Erro ao obter tipos de serviço:', error)
    throw error
  }
}

async function bookAppointment(siteSlug: string, appointmentData: any) {
  try {
    // Validar dados
    if (!appointmentData.clientName || !appointmentData.clientEmail || !appointmentData.date || !appointmentData.time) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Dados obrigatórios não fornecidos' })
      }
    }

    // Verificar disponibilidade do slot
    const isSlotAvailable = await checkSlotAvailability(siteSlug, appointmentData.date, appointmentData.time)
    if (!isSlotAvailable) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ ok: false, error: 'Horário não disponível' })
      }
    }

    // Criar agendamento
    const appointment: Appointment = {
      id: generateAppointmentId(),
      clientName: appointmentData.clientName,
      clientEmail: appointmentData.clientEmail,
      clientPhone: appointmentData.clientPhone || '',
      serviceType: appointmentData.serviceType,
      date: appointmentData.date,
      time: appointmentData.time,
      duration: appointmentData.duration || 60,
      status: 'pending',
      notes: appointmentData.notes,
      price: appointmentData.price,
      reminderSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // TODO: Salvar no Google Sheets
    await saveAppointmentToStorage(siteSlug, appointment)

    // Enviar confirmação por email/SMS
    await sendAppointmentConfirmation(appointment)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        appointment,
        message: 'Agendamento criado com sucesso'
      })
    }

  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    throw error
  }
}

async function checkSlotAvailability(siteSlug: string, date: string, time: string): Promise<boolean> {
  // TODO: Verificar no Google Sheets se o slot está disponível
  return true // Mock - sempre disponível para desenvolvimento
}

function generateAppointmentId(): string {
  return `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

async function saveAppointmentToStorage(siteSlug: string, appointment: Appointment) {
  // TODO: Salvar no Google Sheets
  console.log('Salvando agendamento:', { siteSlug, appointment })
  
  // Em produção, implementar salvamento real no Google Sheets
  // Estrutura sugerida da planilha "appointments":
  // site_slug | id | client_name | client_email | client_phone | service_type | date | time | duration | status | notes | price | reminder_sent | created_at | updated_at
}

async function sendAppointmentConfirmation(appointment: Appointment) {
  // TODO: Integrar com serviço de email/SMS
  console.log('Enviando confirmação de agendamento:', appointment.clientEmail)
  
  // Em produção, enviar email/SMS com detalhes do agendamento
  // Pode usar Netlify Functions + SendGrid, Twilio, etc.
}

async function getAppointments(siteSlug: string, dateRange?: { start: string, end: string }) {
  try {
    // TODO: Buscar do Google Sheets
    // Mock data para desenvolvimento
    const appointments: Appointment[] = [
      {
        id: '1',
        clientName: 'João Silva',
        clientEmail: 'joao@email.com',
        clientPhone: '+5511999999999',
        serviceType: 'Consultoria de Marketing',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        duration: 60,
        status: 'confirmed',
        price: 200,
        reminderSent: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        clientName: 'Maria Santos',
        clientEmail: 'maria@email.com',
        clientPhone: '+5511888888888',
        serviceType: 'Reunião de Planejamento',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // amanhã
        time: '14:00',
        duration: 90,
        status: 'pending',
        price: 150,
        reminderSent: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        appointments,
        total: appointments.length
      })
    }

  } catch (error) {
    console.error('Erro ao obter agendamentos:', error)
    throw error
  }
}

async function updateAppointmentStatus(siteSlug: string, appointmentId: string, status: string) {
  try {
    // TODO: Atualizar no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: `Status do agendamento atualizado para ${status}`,
        appointmentId,
        status
      })
    }

  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    throw error
  }
}

async function cancelAppointment(siteSlug: string, appointmentId: string) {
  try {
    // TODO: Atualizar status no Google Sheets
    
    // Enviar notificação de cancelamento
    await sendCancellationNotification(appointmentId)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Agendamento cancelado com sucesso',
        appointmentId
      })
    }

  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error)
    throw error
  }
}

async function sendCancellationNotification(appointmentId: string) {
  // TODO: Enviar notificação de cancelamento
  console.log('Enviando notificação de cancelamento para:', appointmentId)
}

async function rescheduleAppointment(siteSlug: string, appointmentId: string, newAppointmentData: any) {
  try {
    // Verificar disponibilidade do novo horário
    const isSlotAvailable = await checkSlotAvailability(siteSlug, newAppointmentData.date, newAppointmentData.time)
    if (!isSlotAvailable) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ ok: false, error: 'Novo horário não disponível' })
      }
    }

    // TODO: Atualizar agendamento no Google Sheets
    
    // Enviar notificação de reagendamento
    await sendRescheduleNotification(appointmentId, newAppointmentData)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Agendamento reagendado com sucesso',
        appointmentId,
        newDate: newAppointmentData.date,
        newTime: newAppointmentData.time
      })
    }

  } catch (error) {
    console.error('Erro ao reagendar:', error)
    throw error
  }
}

async function sendRescheduleNotification(appointmentId: string, newData: any) {
  // TODO: Enviar notificação de reagendamento
  console.log('Enviando notificação de reagendamento:', { appointmentId, newData })
}

async function getBusinessHours(siteSlug: string) {
  try {
    const businessHours = await getBusinessHoursData(siteSlug)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        businessHours
      })
    }

  } catch (error) {
    console.error('Erro ao obter horário de funcionamento:', error)
    throw error
  }
}

async function updateBusinessHours(siteSlug: string, businessHours: BusinessHours[]) {
  try {
    // TODO: Salvar no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Horário de funcionamento atualizado',
        businessHours
      })
    }

  } catch (error) {
    console.error('Erro ao atualizar horário:', error)
    throw error
  }
}

async function addServiceType(siteSlug: string, serviceType: ServiceType) {
  try {
    // TODO: Salvar no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Tipo de serviço adicionado',
        serviceType
      })
    }

  } catch (error) {
    console.error('Erro ao adicionar serviço:', error)
    throw error
  }
}

async function updateServiceType(siteSlug: string, serviceType: ServiceType) {
  try {
    // TODO: Atualizar no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Tipo de serviço atualizado',
        serviceType
      })
    }

  } catch (error) {
    console.error('Erro ao atualizar serviço:', error)
    throw error
  }
}

async function sendAppointmentReminder(siteSlug: string, appointmentId: string) {
  try {
    // TODO: Enviar lembrete por email/SMS
    
    // TODO: Marcar lembrete como enviado no Google Sheets
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Lembrete enviado com sucesso',
        appointmentId
      })
    }

  } catch (error) {
    console.error('Erro ao enviar lembrete:', error)
    throw error
  }
}

async function getAppointmentStats(siteSlug: string) {
  try {
    // TODO: Calcular estatísticas do Google Sheets
    
    // Mock data para desenvolvimento
    const stats = {
      totalAppointments: 45,
      confirmedAppointments: 38,
      pendingAppointments: 4,
      cancelledAppointments: 3,
      completedAppointments: 35,
      revenue: 6750,
      averageAppointmentValue: 150,
      mostPopularService: 'Consultoria de Marketing',
      busyDays: ['tuesday', 'wednesday', 'thursday'],
      peakHours: ['10:00', '14:00', '16:00'],
      conversionRate: 85, // % de agendamentos confirmados
      noShowRate: 8, // % de no-shows
      lastUpdate: new Date().toISOString()
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        stats
      })
    }

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    throw error
  }
}