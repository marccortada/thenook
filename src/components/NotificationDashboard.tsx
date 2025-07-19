import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bell, 
  Send, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertCircle, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Calendar as CalendarIcon,
  Play,
  BarChart3,
  Zap
} from 'lucide-react';
import { useNotificationDashboard } from '@/hooks/useNotificationDashboard';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationDashboard = () => {
  const {
    metrics,
    loading,
    clients,
    fetchClients,
    sendQuickNotification,
    processNotifications,
    getNotificationPreview,
  } = useNotificationDashboard();

  const [showQuickSend, setShowQuickSend] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [quickSendData, setQuickSendData] = useState({
    message: '',
    subject: '',
    channels: ['email'] as string[],
  });

  const handleClientSearch = (value: string) => {
    setClientSearch(value);
    fetchClients(value);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleQuickSend = async () => {
    if (selectedClients.length === 0 || !quickSendData.message.trim()) {
      return;
    }

    const success = await sendQuickNotification({
      clientIds: selectedClients,
      message: quickSendData.message,
      subject: quickSendData.subject || undefined,
      channels: quickSendData.channels,
      scheduleFor: scheduleDate?.toISOString(),
    });

    if (success) {
      setShowQuickSend(false);
      setSelectedClients([]);
      setQuickSendData({ message: '', subject: '', channels: ['email'] });
      setScheduleDate(undefined);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Smartphone className="h-4 w-4" />;
      case 'in_app': return <Bell className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'email': return 'Email';
      case 'sms': return 'SMS';
      case 'in_app': return 'In-App';
      default: return channel;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centro de Notificaciones</h1>
          <p className="text-muted-foreground">
            Dashboard y control de notificaciones automatizadas
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={processNotifications} variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Procesar Cola
          </Button>
          <Dialog open={showQuickSend} onOpenChange={setShowQuickSend}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Envío Rápido
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Envío Rápido de Notificaciones</DialogTitle>
                <DialogDescription>
                  Envía notificaciones inmediatas o programadas a clientes seleccionados
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {/* Client Selection */}
                <div className="space-y-2">
                  <Label>Buscar Clientes</Label>
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={clientSearch}
                    onChange={(e) => handleClientSearch(e.target.value)}
                  />
                  <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                    {clients.map(client => (
                      <div
                        key={client.id}
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-accent",
                          selectedClients.includes(client.id) && "bg-accent"
                        )}
                        onClick={() => toggleClientSelection(client.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => {}}
                        />
                        <span className="text-sm">
                          {client.first_name} {client.last_name} ({client.email})
                        </span>
                      </div>
                    ))}
                  </div>
                  {selectedClients.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedClients.length} cliente(s) seleccionado(s)
                    </p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto (Opcional)</Label>
                  <Input
                    id="subject"
                    value={quickSendData.subject}
                    onChange={(e) => setQuickSendData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Asunto de la notificación"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensaje</Label>
                  <Textarea
                    id="message"
                    value={quickSendData.message}
                    onChange={(e) => setQuickSendData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Escribe tu mensaje aquí... Usa {{client_name}} para personalizar"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables disponibles: client_name, date, time
                  </p>
                </div>

                {/* Channels */}
                <div className="space-y-2">
                  <Label>Canales de Envío</Label>
                  <div className="flex space-x-4">
                    {['email', 'sms', 'in_app'].map(channel => (
                      <div key={channel} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={channel}
                          checked={quickSendData.channels.includes(channel)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setQuickSendData(prev => ({ 
                                ...prev, 
                                channels: [...prev.channels, channel] 
                              }));
                            } else {
                              setQuickSendData(prev => ({ 
                                ...prev, 
                                channels: prev.channels.filter(c => c !== channel) 
                              }));
                            }
                          }}
                        />
                        <label htmlFor={channel} className="flex items-center space-x-1">
                          {getChannelIcon(channel)}
                          <span>{getChannelLabel(channel)}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-2">
                  <Label>Programación (Opcional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !scheduleDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleDate ? format(scheduleDate, "PPP", { locale: es }) : "Enviar ahora"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Preview */}
                {quickSendData.message && (
                  <div className="space-y-2">
                    <Label>Vista Previa</Label>
                    <div className="p-3 bg-muted rounded text-sm">
                      {getNotificationPreview(quickSendData.message, {
                        client_name: 'Juan Pérez',
                        date: new Date().toLocaleDateString('es-ES'),
                        time: new Date().toLocaleTimeString('es-ES')
                      })}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowQuickSend(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleQuickSend}
                  disabled={selectedClients.length === 0 || !quickSendData.message.trim()}
                >
                  {scheduleDate ? 'Programar' : 'Enviar'} Notificaciones
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.successRate}%</div>
              <Progress value={metrics.successRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.totalSent}</div>
              <p className="text-xs text-muted-foreground">Últimos 30 días</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{metrics.totalPending}</div>
              <p className="text-xs text-muted-foreground">En cola</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fallidas</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.totalFailed}</div>
              <p className="text-xs text-muted-foreground">Requieren atención</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Channels */}
        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Canales Más Usados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.topChannels.map((channel, index) => (
                  <div key={channel.channel} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getChannelIcon(channel.channel)}
                      <span className="text-sm font-medium">
                        {getChannelLabel(channel.channel)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{channel.count}</span>
                      <Badge variant={index === 0 ? "default" : "outline"}>
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Notifications */}
        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Próximas Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.upcomingNotifications.length > 0 ? (
                  metrics.upcomingNotifications.map((notification) => (
                    <div key={notification.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{notification.client_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(notification.scheduled_for), "HH:mm")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {notification.message_preview}
                      </p>
                      <div className="flex space-x-1">
                        {notification.channels.map((channel) => (
                          <Badge key={channel} variant="outline" className="text-xs">
                            {getChannelLabel(channel)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay notificaciones programadas
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={processNotifications}
              >
                <Play className="h-4 w-4 mr-2" />
                Procesar Cola de Notificaciones
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowQuickSend(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                Envío Rápido
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/notifications'}
              >
                <Bell className="h-4 w-4 mr-2" />
                Configurar Reglas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Chart */}
      {metrics && metrics.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente (7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {metrics.recentActivity.map((day, index) => (
                <div key={day.date} className="flex flex-col items-center space-y-2">
                  <div className="flex flex-col items-center space-y-1">
                    <div 
                      className="bg-green-500 rounded-t w-8 min-h-[4px]"
                      style={{ height: `${(day.sent / Math.max(...metrics.recentActivity.map(d => d.sent + d.failed))) * 200}px` }}
                    />
                    <div 
                      className="bg-red-500 rounded-b w-8 min-h-[4px]"
                      style={{ height: `${(day.failed / Math.max(...metrics.recentActivity.map(d => d.sent + d.failed))) * 200}px` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(day.date), "dd/MM")}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-sm">Enviadas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-sm">Fallidas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationDashboard;