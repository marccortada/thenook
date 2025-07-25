import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  Plus, 
  Send, 
  Calendar as CalendarIcon, 
  Mail, 
  MessageSquare, 
  Phone,
  Users,
  Settings,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useNotificationAutomation } from '@/hooks/useNotificationAutomation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationCenter = () => {
  const {
    rules,
    scheduledNotifications,
    templates,
    loading,
    createRule,
    toggleRule,
    sendImmediateNotification,
    cancelNotification
  } = useNotificationAutomation();

  const [activeTab, setActiveTab] = useState('rules');
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();

  const [ruleForm, setRuleForm] = useState({
    name: '',
    trigger_type: 'booking_reminder' as 'booking_reminder' | 'birthday' | 'package_expiry' | 'appointment_confirmation' | 'no_show_follow_up',
    trigger_days_before: 1,
    message_template: '',
    send_via: ['email'],
    target_audience: 'all_clients' as 'all_clients' | 'specific_segments',
    is_active: true
  });

  const [sendForm, setSendForm] = useState({
    clientIds: [] as string[],
    message: '',
    subject: '',
    sendVia: ['email'],
    scheduleFor: ''
  });

  const triggerTypes = [
    { value: 'booking_reminder', label: 'Recordatorio de Reserva' },
    { value: 'booking_confirmation', label: 'Confirmación de Reserva' },
    { value: 'payment_reminder', label: 'Recordatorio de Pago' },
    { value: 'package_expiring', label: 'Paquete por Vencer' },
    { value: 'birthday', label: 'Cumpleaños' },
    { value: 'promotional', label: 'Promocional' }
  ];

  const channels = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'sms', label: 'SMS', icon: MessageSquare },
    { value: 'whatsapp', label: 'WhatsApp', icon: Phone }
  ];

  const handleCreateRule = async () => {
    await createRule(ruleForm);
    setShowRuleDialog(false);
    resetRuleForm();
  };

  const handleSendNotification = async () => {
    await sendImmediateNotification(
      sendForm.clientIds,
      sendForm.message,
      sendForm.sendVia,
      sendForm.subject
    );
    setShowSendDialog(false);
    resetSendForm();
  };

  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      trigger_type: 'booking_reminder',
      trigger_days_before: 1,
      message_template: '',
      send_via: ['email'],
      target_audience: 'all_clients',
      is_active: true
    });
  };

  const resetSendForm = () => {
    setSendForm({
      clientIds: [],
      message: '',
      subject: '',
      sendVia: ['email'],
      scheduleFor: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getChannelIcon = (channel: string) => {
    const channelData = channels.find(c => c.value === channel);
    const IconComponent = channelData?.icon || Bell;
    return <IconComponent className="w-4 h-4" />;
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Regla
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Regla de Notificación</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ruleName">Nombre de la Regla</Label>
                    <Input
                      id="ruleName"
                      value={ruleForm.name}
                      onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                      placeholder="Ej: Recordatorio 24h antes"
                    />
                  </div>
                  <div>
                    <Label htmlFor="triggerType">Tipo de Activador</Label>
                    <Select 
                      value={ruleForm.trigger_type} 
                      onValueChange={(value) => setRuleForm({ ...ruleForm, trigger_type: value as 'booking_reminder' | 'birthday' | 'package_expiry' | 'appointment_confirmation' | 'no_show_follow_up' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {triggerTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="daysBefore">Días Antes (para recordatorios)</Label>
                  <Input
                    id="daysBefore"
                    type="number"
                    min="1"
                    max="30"
                    value={ruleForm.trigger_days_before}
                    onChange={(e) => setRuleForm({ ...ruleForm, trigger_days_before: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="messageTemplate">Plantilla del Mensaje</Label>
                  <Textarea
                    id="messageTemplate"
                    value={ruleForm.message_template}
                    onChange={(e) => setRuleForm({ ...ruleForm, message_template: e.target.value })}
                    placeholder="Hola {{nombre}}, te recordamos tu cita el {{fecha}} a las {{hora}}..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Canales de Envío</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {channels.map((channel) => (
                      <div key={channel.value} className="flex items-center space-x-2">
                        <Switch
                          id={channel.value}
                          checked={ruleForm.send_via.includes(channel.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setRuleForm({
                                ...ruleForm,
                                send_via: [...ruleForm.send_via, channel.value]
                              });
                            } else {
                              setRuleForm({
                                ...ruleForm,
                                send_via: ruleForm.send_via.filter(c => c !== channel.value)
                              });
                            }
                          }}
                        />
                        <label htmlFor={channel.value} className="flex items-center gap-2 text-sm">
                          {getChannelIcon(channel.value)}
                          {channel.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={ruleForm.is_active}
                    onCheckedChange={(checked) => setRuleForm({ ...ruleForm, is_active: checked })}
                  />
                  <label htmlFor="isActive" className="text-sm">Regla activa</label>
                </div>

                <Button onClick={handleCreateRule} className="w-full" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Regla'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Send className="w-4 h-4 mr-2" />
                Envío Inmediato
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Enviar Notificación Inmediata</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Asunto</Label>
                  <Input
                    id="subject"
                    value={sendForm.subject}
                    onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                    placeholder="Asunto del mensaje"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Mensaje</Label>
                  <Textarea
                    id="message"
                    value={sendForm.message}
                    onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                    placeholder="Escribe tu mensaje aquí..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Canales de Envío</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {channels.map((channel) => (
                      <div key={channel.value} className="flex items-center space-x-2">
                        <Switch
                          id={`send-${channel.value}`}
                          checked={sendForm.sendVia.includes(channel.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSendForm({
                                ...sendForm,
                                sendVia: [...sendForm.sendVia, channel.value]
                              });
                            } else {
                              setSendForm({
                                ...sendForm,
                                sendVia: sendForm.sendVia.filter(c => c !== channel.value)
                              });
                            }
                          }}
                        />
                        <label htmlFor={`send-${channel.value}`} className="flex items-center gap-2 text-sm">
                          {getChannelIcon(channel.value)}
                          {channel.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSendNotification} className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar Notificación'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Reglas</TabsTrigger>
          <TabsTrigger value="scheduled">Programadas</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Reglas de Notificación Automática</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1 mb-2 sm:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{rule.name}</h3>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {triggerTypes.find(t => t.value === rule.trigger_type)?.label}
                        {rule.trigger_days_before && ` - ${rule.trigger_days_before} días antes`}
                      </p>
                      <div className="flex items-center gap-1">
                        {rule.send_via.map((channel) => (
                          <div key={channel} className="flex items-center gap-1">
                            {getChannelIcon(channel)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                      />
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
                {rules.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay reglas de notificación configuradas. Crea tu primera regla usando el botón "Nueva Regla".
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones Programadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="hidden sm:table-cell">Mensaje</TableHead>
                      <TableHead>Programada</TableHead>
                      <TableHead>Canales</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledNotifications.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{notification.client_name}</p>
                            <p className="text-sm text-muted-foreground sm:hidden">
                              {notification.message_content.slice(0, 50)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <p className="text-sm max-w-xs truncate">
                            {notification.message_content.slice(0, 100)}...
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {formatDateTime(notification.scheduled_for)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {notification.send_via.map((channel) => (
                              <div key={channel} className="flex items-center">
                                {getChannelIcon(channel)}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(notification.status) as any}>
                            {notification.status === 'sent' ? 'Enviada' :
                             notification.status === 'pending' ? 'Pendiente' : 'Fallida'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {notification.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelNotification(notification.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {scheduledNotifications.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No hay notificaciones programadas actualmente.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas de Mensajes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1 mb-2 sm:mb-0">
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Tipo: {template.type}
                      </p>
                      <p className="text-sm bg-muted p-2 rounded max-w-md">
                        {template.content.substring(0, 100)}...
                      </p>
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {template.variables.map((variable) => (
                            <Badge key={variable} variant="outline" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                        Usar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay plantillas de mensajes creadas.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationCenter;