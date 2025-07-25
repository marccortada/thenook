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

  const triggerTypes = [
    { value: 'booking_reminder', label: 'Recordatorio de Reserva' },
    { value: 'birthday', label: 'Cumpleaños' },
    { value: 'package_expiry', label: 'Expiración de Bono' },
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

  return (
    <div className="space-y-6">
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
            No hay reglas de notificación configuradas.
          </p>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;