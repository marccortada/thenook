import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Bell, Calendar, Clock, Mail, MessageSquare, Phone, Plus, Settings, Users } from 'lucide-react';
import { useNotificationAutomation } from '@/hooks/useNotificationAutomation';
import { useToast } from '@/hooks/use-toast';

const NotificationAutomation = () => {
  const {
    rules,
    scheduledNotifications,
    templates,
    loading,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    cancelNotification,
    sendImmediateNotification,
    getNotificationStats,
    fetchScheduledNotifications
  } = useNotificationAutomation();

  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('rules');
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  // Form state for new/edit rule
  const [ruleForm, setRuleForm] = useState({
    name: '',
    trigger_type: 'booking_reminder' as const,
    trigger_days_before: 1,
    message_template: '',
    send_via: ['email'] as string[],
    target_audience: 'all_clients' as const,
    is_active: true
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await getNotificationStats(30);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      await createRule(ruleForm);
      setShowRuleDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const handleEditRule = async () => {
    if (!editingRule) return;
    
    try {
      await updateRule(editingRule.id, ruleForm);
      setShowRuleDialog(false);
      setEditingRule(null);
      resetForm();
    } catch (error) {
      console.error('Error updating rule:', error);
    }
  };

  const resetForm = () => {
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

  const openEditDialog = (rule: any) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      trigger_type: rule.trigger_type,
      trigger_days_before: rule.trigger_days_before || 1,
      message_template: rule.message_template,
      send_via: rule.send_via,
      target_audience: rule.target_audience,
      is_active: rule.is_active
    });
    setShowRuleDialog(true);
  };

  const getTriggerTypeLabel = (type: string) => {
    const labels = {
      booking_reminder: 'Recordatorio de Cita',
      // package_expiry: eliminado - los bonos no caducan
      appointment_confirmation: 'Confirmación de Cita',
      birthday: 'Cumpleaños',
      no_show_follow_up: 'Seguimiento No Show'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automatización de Notificaciones</h1>
          <p className="text-muted-foreground">
            Gestiona reglas automáticas y notificaciones programadas
          </p>
        </div>
        <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingRule(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Regla
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Editar Regla' : 'Nueva Regla de Notificación'}
              </DialogTitle>
              <DialogDescription>
                Configure una nueva regla para automatizar el envío de notificaciones
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre de la Regla</Label>
                <Input
                  id="name"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Recordatorio 24 horas antes"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="trigger_type">Tipo de Disparador</Label>
                <Select value={ruleForm.trigger_type} onValueChange={(value: any) => setRuleForm(prev => ({ ...prev, trigger_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking_reminder">Recordatorio de Cita</SelectItem>
                    {/* Opción eliminada - los bonos no caducan */}
                    <SelectItem value="appointment_confirmation">Confirmación de Cita</SelectItem>
                    <SelectItem value="birthday">Cumpleaños</SelectItem>
                    <SelectItem value="no_show_follow_up">Seguimiento No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(ruleForm.trigger_type === 'booking_reminder') && (
                <div className="grid gap-2">
                  <Label htmlFor="days_before">Días de Anticipación</Label>
                  <Input
                    id="days_before"
                    type="number"
                    min="0"
                    value={ruleForm.trigger_days_before}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, trigger_days_before: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="message">Plantilla del Mensaje</Label>
                <Textarea
                  id="message"
                  value={ruleForm.message_template}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, message_template: e.target.value }))}
                  placeholder="Hola {{client_name}}, te recordamos..."
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label>Canales de Envío</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="email"
                      checked={ruleForm.send_via.includes('email')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRuleForm(prev => ({ ...prev, send_via: [...prev.send_via, 'email'] }));
                        } else {
                          setRuleForm(prev => ({ ...prev, send_via: prev.send_via.filter(ch => ch !== 'email') }));
                        }
                      }}
                    />
                    <label htmlFor="email">Email</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sms"
                      checked={ruleForm.send_via.includes('sms')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRuleForm(prev => ({ ...prev, send_via: [...prev.send_via, 'sms'] }));
                        } else {
                          setRuleForm(prev => ({ ...prev, send_via: prev.send_via.filter(ch => ch !== 'sms') }));
                        }
                      }}
                    />
                    <label htmlFor="sms">SMS</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="in_app"
                      checked={ruleForm.send_via.includes('in_app')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRuleForm(prev => ({ ...prev, send_via: [...prev.send_via, 'in_app'] }));
                        } else {
                          setRuleForm(prev => ({ ...prev, send_via: prev.send_via.filter(ch => ch !== 'in_app') }));
                        }
                      }}
                    />
                    <label htmlFor="in_app">App</label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={ruleForm.is_active}
                  onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Regla Activa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={editingRule ? handleEditRule : handleCreateRule}>
                {editingRule ? 'Actualizar' : 'Crear'} Regla
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notificaciones</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Últimos 30 días</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}% del total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">En cola de envío</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fallidas</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">Requieren atención</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Reglas Automáticas</TabsTrigger>
          <TabsTrigger value="scheduled">Notificaciones Programadas</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                      <Badge variant="outline">
                        {getTriggerTypeLabel(rule.trigger_type)}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                      />
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(rule)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteRule(rule.id)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {rule.trigger_days_before && `${rule.trigger_days_before} días de anticipación • `}
                    Canales: {rule.send_via.join(', ')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {rule.message_template}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => fetchScheduledNotifications()}>
                Todas
              </Button>
              <Button variant="outline" onClick={() => fetchScheduledNotifications('pending')}>
                Pendientes
              </Button>
              <Button variant="outline" onClick={() => fetchScheduledNotifications('sent')}>
                Enviadas
              </Button>
              <Button variant="outline" onClick={() => fetchScheduledNotifications('failed')}>
                Fallidas
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {scheduledNotifications.map((notification) => (
              <Card key={notification.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{notification.client_name}</CardTitle>
                      <CardDescription>
                        {notification.client_email} • {new Date(notification.scheduled_for).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(notification.status)}>
                        {notification.status}
                      </Badge>
                      {notification.status === 'pending' && (
                        <Button variant="outline" size="sm" onClick={() => cancelNotification(notification.id)}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Canales: {notification.send_via.join(', ')}
                  </p>
                  <p className="text-sm">
                    {notification.message_content}
                  </p>
                  {notification.error_message && (
                    <p className="text-sm text-red-600 mt-2">
                      Error: {notification.error_message}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>
                        Tipo: {template.type} • Variables: {template.variables.join(', ')}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{template.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.subject && (
                    <p className="text-sm font-medium mb-2">
                      Asunto: {template.subject}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {template.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationAutomation;