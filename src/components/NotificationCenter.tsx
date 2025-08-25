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
import { Checkbox } from '@/components/ui/checkbox';
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
  XCircle,
  Edit,
  Save,
  X
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
    updateRule,
    toggleRule,
    sendImmediateNotification,
    cancelNotification
  } = useNotificationAutomation();

  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    trigger_type: 'booking_reminder' as 'booking_reminder' | 'birthday' | 'appointment_confirmation' | 'no_show_follow_up',
    trigger_days_before: 0,
    message_template: '',
    send_via: [] as string[],
    target_audience: 'all_clients' as 'all_clients' | 'specific_segments',
    is_active: true
  });

  const triggerTypes = [
    { value: 'booking_reminder', label: 'Recordatorio de Reserva' },
    { value: 'birthday', label: 'Cumpleaños' },
    // { value: 'package_expiry', label: 'Expiración de Bono' }, // Eliminado - los bonos no caducan
    { value: 'appointment_confirmation', label: 'Confirmación de Cita' },
    { value: 'no_show_follow_up', label: 'Seguimiento No Show' },
  ];

  const channels = [
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'push', label: 'Push' },
  ];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'push': return <Bell className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getChannelLabel = (channel: string) => {
    const found = channels.find(c => c.value === channel);
    return found ? found.label : channel;
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule.id);
    setEditForm({
      name: rule.name,
      trigger_type: rule.trigger_type,
      trigger_days_before: rule.trigger_days_before || 0,
      message_template: rule.message_template,
      send_via: rule.send_via,
      target_audience: rule.target_audience,
      is_active: rule.is_active
    });
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;
    
    try {
      await updateRule(editingRule, editForm);
      setEditingRule(null);
    } catch (error) {
      console.error('Error updating rule:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      await createRule(editForm);
      setShowCreateDialog(false);
      setEditForm({
        name: '',
        trigger_type: 'booking_reminder',
        trigger_days_before: 0,
        message_template: '',
        send_via: [],
        target_audience: 'all_clients',
        is_active: true
      });
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const resetEditForm = () => {
    setEditForm({
      name: '',
      trigger_type: 'booking_reminder',
      trigger_days_before: 0,
      message_template: '',
      send_via: [],
      target_audience: 'all_clients',
      is_active: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Reglas de Notificación</h3>
          <p className="text-sm text-muted-foreground">
            Configura y gestiona las notificaciones automáticas
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Regla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Regla de Notificación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rule-name">Nombre de la regla</Label>
                <Input
                  id="rule-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Ej: Recordatorio de cita"
                />
              </div>
              
              <div>
                <Label htmlFor="trigger-type">Tipo de disparador</Label>
                <Select value={editForm.trigger_type} onValueChange={(value: any) => 
                  setEditForm({ ...editForm, trigger_type: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
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

              {(editForm.trigger_type === 'booking_reminder') && (
                <div>
                  <Label htmlFor="days-before">Días antes</Label>
                  <Input
                    id="days-before"
                    type="number"
                    min="0"
                    max="30"
                    value={editForm.trigger_days_before}
                    onChange={(e) => setEditForm({ ...editForm, trigger_days_before: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="message">Plantilla del mensaje</Label>
                <Textarea
                  id="message"
                  value={editForm.message_template}
                  onChange={(e) => setEditForm({ ...editForm, message_template: e.target.value })}
                  placeholder="Escribe tu mensaje aquí..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Canales de envío</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {channels.map((channel) => (
                    <div key={channel.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={channel.value}
                        checked={editForm.send_via.includes(channel.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditForm({ 
                              ...editForm, 
                              send_via: [...editForm.send_via, channel.value] 
                            });
                          } else {
                            setEditForm({ 
                              ...editForm, 
                              send_via: editForm.send_via.filter(c => c !== channel.value) 
                            });
                          }
                        }}
                      />
                      <Label htmlFor={channel.value} className="text-sm">
                        {channel.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateRule} disabled={loading} className="flex-1">
                  {loading ? 'Creando...' : 'Crear Regla'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateDialog(false);
                    resetEditForm();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="p-4 border rounded-lg">
            {editingRule === rule.id ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Nombre</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-trigger">Tipo de disparador</Label>
                  <Select value={editForm.trigger_type} onValueChange={(value: any) => 
                    setEditForm({ ...editForm, trigger_type: value })
                  }>
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

                <div>
                  <Label htmlFor="edit-message">Mensaje</Label>
                  <Textarea
                    id="edit-message"
                    value={editForm.message_template}
                    onChange={(e) => setEditForm({ ...editForm, message_template: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Canales</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {channels.map((channel) => (
                      <div key={channel.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${channel.value}`}
                          checked={editForm.send_via.includes(channel.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEditForm({ 
                                ...editForm, 
                                send_via: [...editForm.send_via, channel.value] 
                              });
                            } else {
                              setEditForm({ 
                                ...editForm, 
                                send_via: editForm.send_via.filter(c => c !== channel.value) 
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`edit-${channel.value}`} className="text-sm">
                          {channel.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveRule} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setEditingRule(null)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
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
                        <span className="text-xs text-muted-foreground">
                          {getChannelLabel(channel)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                  />
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 sm:flex-none"
                    onClick={() => handleEditRule(rule)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {rules.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No hay reglas configuradas</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primera regla de notificación para automatizar la comunicación con tus clientes.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear primera regla
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;