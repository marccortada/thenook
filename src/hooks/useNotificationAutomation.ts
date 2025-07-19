import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationRule {
  id: string;
  name: string;
  trigger_type: 'booking_reminder' | 'package_expiry' | 'appointment_confirmation' | 'birthday' | 'no_show_follow_up';
  trigger_days_before?: number;
  is_active: boolean;
  message_template: string;
  send_via: string[];
  target_audience: 'all_clients' | 'specific_segments';
  segment_criteria?: any;
  created_at: string;
  updated_at: string;
}

export interface ScheduledNotification {
  id: string;
  rule_id?: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  scheduled_for: string;
  message_content: string;
  subject?: string;
  send_via: string[];
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string;
  error_message?: string;
  related_booking_id?: string;
  related_package_id?: string;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject?: string;
  content: string;
  variables: string[];
  type: 'email' | 'sms';
  created_at: string;
  updated_at: string;
}

export const useNotificationAutomation = () => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch notification rules
  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules((data || []) as NotificationRule[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching rules';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch scheduled notifications
  const fetchScheduledNotifications = async (status?: string, limit = 100) => {
    setLoading(true);
    try {
      let query = supabase
        .from('scheduled_notifications')
        .select('*')
        .order('scheduled_for', { ascending: true })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get client info separately
      const notificationsWithClients = await Promise.all(
        (data || []).map(async (notification) => {
          const { data: client } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, phone')
            .eq('id', notification.client_id)
            .single();

          return {
            ...notification,
            client_name: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : '',
            client_email: client?.email || '',
            client_phone: client?.phone || '',
          };
        })
      );

      setScheduledNotifications(notificationsWithClients as ScheduledNotification[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching notifications';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as NotificationTemplate[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching templates';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Create notification rule
  const createRule = async (rule: Omit<NotificationRule, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .insert([rule])
        .select()
        .single();

      if (error) throw error;

      setRules(prev => [data as NotificationRule, ...prev]);
      toast({
        title: "Regla creada",
        description: "La regla de notificación se ha creado exitosamente",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating rule';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Update notification rule
  const updateRule = async (id: string, updates: Partial<NotificationRule>) => {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setRules(prev => prev.map(rule => rule.id === id ? data as NotificationRule : rule));
      toast({
        title: "Regla actualizada",
        description: "La regla de notificación se ha actualizado exitosamente",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating rule';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Delete notification rule
  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notification_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRules(prev => prev.filter(rule => rule.id !== id));
      toast({
        title: "Regla eliminada",
        description: "La regla de notificación se ha eliminado exitosamente",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting rule';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Toggle rule active status
  const toggleRule = async (id: string, isActive: boolean) => {
    return updateRule(id, { is_active: isActive });
  };

  // Cancel scheduled notification
  const cancelNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_notifications')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      setScheduledNotifications(prev => 
        prev.map(notif => notif.id === id ? { ...notif, status: 'cancelled' } : notif)
      );

      toast({
        title: "Notificación cancelada",
        description: "La notificación programada se ha cancelado",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cancelling notification';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Send immediate notification
  const sendImmediateNotification = async (
    clientIds: string[],
    message: string,
    sendVia: string[],
    subject?: string
  ) => {
    try {
      const notifications = clientIds.map(clientId => ({
        client_id: clientId,
        message_content: message,
        send_via: sendVia,
        scheduled_for: new Date().toISOString(),
        status: 'pending',
        ...(subject && { subject })
      }));

      const { error } = await supabase
        .from('scheduled_notifications')
        .insert(notifications);

      if (error) throw error;

      toast({
        title: "Notificaciones enviadas",
        description: `Se han programado ${clientIds.length} notificaciones`,
      });

      // Refresh scheduled notifications
      fetchScheduledNotifications();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error sending notifications';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Get notification statistics
  const getNotificationStats = async (days = 30) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('scheduled_notifications')
        .select('status, send_via, scheduled_for')
        .gte('scheduled_for', startDate.toISOString());

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        sent: data?.filter(n => n.status === 'sent').length || 0,
        pending: data?.filter(n => n.status === 'pending').length || 0,
        failed: data?.filter(n => n.status === 'failed').length || 0,
        cancelled: data?.filter(n => n.status === 'cancelled').length || 0,
        byChannel: {
          email: data?.filter(n => n.send_via?.includes('email')).length || 0,
          sms: data?.filter(n => n.send_via?.includes('sms')).length || 0,
          in_app: data?.filter(n => n.send_via?.includes('in_app')).length || 0,
        }
      };

      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching stats';
      setError(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    fetchRules();
    fetchScheduledNotifications('pending');
    fetchTemplates();
  }, []);

  return {
    rules,
    scheduledNotifications,
    templates,
    loading,
    error,
    fetchRules,
    fetchScheduledNotifications,
    fetchTemplates,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    cancelNotification,
    sendImmediateNotification,
    getNotificationStats,
  };
};