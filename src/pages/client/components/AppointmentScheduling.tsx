import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  CalendarIcon, 
  ClockIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  SettingsIcon,
  PlusIcon,
  EditIcon,
  RefreshCwIcon,
  DollarSignIcon,
  TrendingUpIcon,
  UsersIcon
} from 'lucide-react';
import { DashboardCardSkeleton } from '@/components/ui/loading-skeletons';

interface Appointment {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceType: string;
  date: string;
  time: string;
  duration: number;
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
  duration: number;
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

interface AppointmentStats {
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  completedAppointments: number;
  revenue: number;
  averageAppointmentValue: number;
  mostPopularService: string;
  busyDays: string[];
  peakHours: string[];
  conversionRate: number;
  noShowRate: number;
  lastUpdate: string;
}

interface AppointmentSchedulingProps {
  siteSlug: string;
  vipPin: string;
}

export default function AppointmentScheduling({ siteSlug, vipPin }: AppointmentSchedulingProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'appointments' | 'services' | 'stats'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAppointment, setNewAppointment] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    serviceType: '',
    date: '',
    time: '',
    notes: ''
  });

  // Guarda de segurança VIP
  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Sistema de Agendamento
          </CardTitle>
          <CardDescription className="text-slate-400">
            Acesso restrito: Recurso VIP não disponível
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">Este recurso requer acesso VIP.</p>
            <Button variant="outline" disabled>
              Acesso Bloqueado
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const loadAppointments = async () => {
    try {
      const response = await fetch('/.netlify/functions/appointment-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_appointments',
          siteSlug,
          vipPin
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar agendamentos');

      const result = await response.json();
      if (result.ok) {
        setAppointments(result.appointments);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar agendamentos:', err);
      setError(err.message);
    }
  };

  const loadServiceTypes = async () => {
    try {
      const response = await fetch('/.netlify/functions/appointment-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_service_types',
          siteSlug,
          vipPin
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar serviços');

      const result = await response.json();
      if (result.ok) {
        setServiceTypes(result.serviceTypes);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar serviços:', err);
      setError(err.message);
    }
  };

  const loadAvailability = async (date: string) => {
    try {
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 7); // próximos 7 dias

      const response = await fetch('/.netlify/functions/appointment-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_availability',
          siteSlug,
          vipPin,
          dateRange: {
            start: date,
            end: endDate.toISOString().split('T')[0]
          }
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar disponibilidade');

      const result = await response.json();
      if (result.ok) {
        setAvailability(result.availability);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar disponibilidade:', err);
      setError(err.message);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/.netlify/functions/appointment-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_appointment_stats',
          siteSlug,
          vipPin
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar estatísticas');

      const result = await response.json();
      if (result.ok) {
        setStats(result.stats);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas:', err);
      setError(err.message);
    }
  };

  const bookAppointment = async () => {
    if (!newAppointment.clientName || !newAppointment.clientEmail || !newAppointment.date || !newAppointment.time) {
      setError('Todos os campos obrigatórios devem ser preenchidos');
      return;
    }

    setProcessing(true);
    
    try {
      const selectedService = serviceTypes.find(st => st.name === newAppointment.serviceType);
      
      const response = await fetch('/.netlify/functions/appointment-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book_appointment',
          siteSlug,
          vipPin,
          appointment: {
            ...newAppointment,
            duration: selectedService?.duration || 60,
            price: selectedService?.price || 0
          }
        })
      });

      if (!response.ok) throw new Error('Falha ao criar agendamento');

      const result = await response.json();
      if (result.ok) {
        // Limpar formulário
        setNewAppointment({
          clientName: '',
          clientEmail: '',
          clientPhone: '',
          serviceType: '',
          date: '',
          time: '',
          notes: ''
        });
        
        // Recarregar dados
        await Promise.all([loadAppointments(), loadAvailability(selectedDate)]);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro ao criar agendamento');
      }
    } catch (err: any) {
      console.error('Erro ao criar agendamento:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch('/.netlify/functions/appointment-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_appointment_status',
          siteSlug,
          vipPin,
          appointmentId,
          status: newStatus
        })
      });

      if (!response.ok) throw new Error('Falha ao atualizar status');

      const result = await response.json();
      if (result.ok) {
        await loadAppointments();
        setError(null);
      } else {
        throw new Error(result.error || 'Erro ao atualizar');
      }
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      setError(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'pending': return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
      case 'completed': return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
      case 'cancelled': return 'bg-red-600/20 text-red-300 border-red-500/30';
      case 'no_show': return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
      default: return 'bg-slate-600/20 text-slate-300 border-slate-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircleIcon className="w-4 h-4" />;
      case 'pending': return <ClockIcon className="w-4 h-4" />;
      case 'completed': return <CheckCircleIcon className="w-4 h-4" />;
      case 'cancelled': return <XCircleIcon className="w-4 h-4" />;
      case 'no_show': return <AlertCircleIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadAppointments(),
        loadServiceTypes(),
        loadAvailability(selectedDate),
        loadStats()
      ]);
      setLoading(false);
    };

    loadData();
  }, [siteSlug, vipPin]);

  useEffect(() => {
    if (selectedDate) {
      loadAvailability(selectedDate);
    }
  }, [selectedDate]);

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Sistema de Agendamento
            </CardTitle>
            <CardDescription className="text-slate-400">
              Gerencie agendamentos, horários e disponibilidade
            </CardDescription>
          </div>
          <Badge className="px-3 py-1 bg-green-600/20 text-green-300 border-green-500/30">
            {appointments.filter(a => a.status === 'confirmed').length} confirmados
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Abas */}
        <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'calendar' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <CalendarIcon className="w-4 h-4 inline mr-2" />
            Calendário
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'appointments' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <ClockIcon className="w-4 h-4 inline mr-2" />
            Agendamentos
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'services' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <SettingsIcon className="w-4 h-4 inline mr-2" />
            Serviços
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'stats' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <TrendingUpIcon className="w-4 h-4 inline mr-2" />
            Estatísticas
          </button>
        </div>

        {/* Conteúdo das Abas */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-300">Disponibilidade e Novo Agendamento</div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Horários Disponíveis */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-300">Horários para {selectedDate}</div>
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {availability
                    .filter(slot => slot.date === selectedDate)
                    .map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => setNewAppointment(prev => ({ ...prev, date: slot.date, time: slot.time }))}
                        disabled={!slot.available}
                        className={`p-2 rounded text-xs font-medium transition-colors ${
                          slot.available
                            ? newAppointment.time === slot.time
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/10 text-white hover:bg-white/20'
                            : 'bg-red-400/10 text-red-400 cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                        {slot.booked && <div className="text-xs text-red-400">Ocupado</div>}
                      </button>
                    ))}
                </div>
              </div>

              {/* Formulário de Novo Agendamento */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-300">Novo Agendamento</div>
                <div className="space-y-3">
                  <Input
                    placeholder="Nome do cliente"
                    value={newAppointment.clientName}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, clientName: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder-slate-400"
                  />
                  <Input
                    type="email"
                    placeholder="Email do cliente"
                    value={newAppointment.clientEmail}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, clientEmail: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder-slate-400"
                  />
                  <Input
                    placeholder="Telefone (opcional)"
                    value={newAppointment.clientPhone}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, clientPhone: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder-slate-400"
                  />
                  <select
                    value={newAppointment.serviceType}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, serviceType: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
                  >
                    <option value="">Selecione o serviço</option>
                    {serviceTypes.map(service => (
                      <option key={service.id} value={service.name}>
                        {service.name} - {service.duration}min - R$ {service.price}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    placeholder="Observações (opcional)"
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder-slate-400"
                    rows={2}
                  />
                  <Button
                    onClick={bookAppointment}
                    disabled={processing || !newAppointment.clientName || !newAppointment.clientEmail || !newAppointment.date || !newAppointment.time}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {processing ? (
                      <RefreshCwIcon className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <PlusIcon className="w-4 h-4 mr-2" />
                    )}
                    Agendar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-slate-300">Lista de Agendamentos</div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {appointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className="p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{appointment.clientName}</span>
                        <Badge className={`px-2 py-1 text-xs ${getStatusColor(appointment.status)}`}>
                          {getStatusIcon(appointment.status)}
                          <span className="ml-1">{appointment.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {appointment.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {appointment.time} ({appointment.duration}min)
                        </div>
                        <div className="flex items-center gap-1">
                          <MailIcon className="w-3 h-3" />
                          {appointment.clientEmail}
                        </div>
                        {appointment.price && (
                          <div className="flex items-center gap-1">
                            <DollarSignIcon className="w-3 h-3" />
                            R$ {appointment.price}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-sm text-white">{appointment.serviceType}</div>
                      
                      {appointment.notes && (
                        <div className="text-xs text-slate-400 italic">{appointment.notes}</div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {appointment.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                      
                      {appointment.status === 'confirmed' && (
                        <Button
                          size="sm"
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Completar
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <EditIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-300">Tipos de Serviço</div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <PlusIcon className="w-4 h-4 mr-2" />
                Novo Serviço
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {serviceTypes.map((service) => (
                <div 
                  key={service.id} 
                  className="p-4 rounded-lg bg-white/5 border border-white/10"
                  style={{ borderLeftColor: service.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-white">{service.name}</div>
                      <div className="text-sm text-slate-400 mt-1">{service.description}</div>
                      
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3 text-slate-400" />
                          {service.duration}min
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSignIcon className="w-3 h-3 text-slate-400" />
                          R$ {service.price}
                        </div>
                        {service.requiresDeposit && (
                          <Badge className="px-2 py-1 text-xs bg-yellow-600/20 text-yellow-300 border-yellow-500/30">
                            Sinal: R$ {service.depositAmount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={`px-2 py-1 text-xs ${
                        service.enabled 
                          ? 'bg-green-600/20 text-green-300 border-green-500/30' 
                          : 'bg-red-600/20 text-red-300 border-red-500/30'
                      }`}>
                        {service.enabled ? 'Ativo' : 'Inativo'}
                      </Badge>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <EditIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-slate-300">Estatísticas de Agendamento</div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-white">{stats.totalAppointments}</div>
                <div className="text-xs text-slate-400">Total</div>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-green-400">{stats.confirmedAppointments}</div>
                <div className="text-xs text-slate-400">Confirmados</div>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-blue-400">R$ {stats.revenue}</div>
                <div className="text-xs text-slate-400">Receita</div>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-purple-400">{stats.conversionRate}%</div>
                <div className="text-xs text-slate-400">Conversão</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="text-sm font-medium text-white mb-3">Serviço Mais Popular</div>
                <div className="text-lg text-blue-400">{stats.mostPopularService}</div>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="text-sm font-medium text-white mb-3">Ticket Médio</div>
                <div className="text-lg text-green-400">R$ {stats.averageAppointmentValue}</div>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="text-sm font-medium text-white mb-3">Taxa de No-Show</div>
                <div className="text-lg text-red-400">{stats.noShowRate}%</div>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="text-sm font-medium text-white mb-3">Horários de Pico</div>
                <div className="text-sm text-slate-300">
                  {stats.peakHours.join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button 
            onClick={() => window.location.reload()} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          
          <Button 
            variant="outline" 
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              // TODO: Exportar agenda
              console.log('Exportar agenda')
            }}
          >
            Exportar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}