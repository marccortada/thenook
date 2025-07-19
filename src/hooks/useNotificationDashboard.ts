import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationMetrics {
  totalSent: number;
  totalPending: number;
  totalFailed: number;
  successRate: number;
  avgResponseTime: number;
  topChannels: { channel: string; count: number }[];
  recentActivity: {
    date: string;
    sent: number;
    failed: number;
  }[];
  upcomingNotifications: {
    id: string;
    client_name: string;
    scheduled_for: string;
    message_preview: string;
    channels: string[];
  }[];
}

export interface QuickSendData {
  clientIds: string[];
  message: string;
  subject?: string;
  channels: string[];
  scheduleFor?: string;
}

export const useNotificationDashboard = () => {
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchMetrics = async (days = 30) => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get notification statistics
      const { data: notifications, error } = await supabase
        .from('scheduled_notifications')
        .select('status, send_via, scheduled_for, sent_at, error_message')
        .gte('scheduled_for', startDate.toISOString());

      if (error) throw error;

      const totalSent = notifications?.filter(n => n.status === 'sent').length || 0;
      const totalPending = notifications?.filter(n => n.status === 'pending').length || 0;
      const totalFailed = notifications?.filter(n => n.status === 'failed').length || 0;
      const total = notifications?.length || 0;

      // Calculate success rate
      const successRate = total > 0 ? (totalSent / total) * 100 : 0;

      // Calculate top channels
      const channelCounts = new Map<string, number>();
      notifications?.forEach(n => {
        n.send_via?.forEach((channel: string) => {
          channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
        });
      });

      const topChannels = Array.from(channelCounts.entries())
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Calculate recent activity (last 7 days)
      const recentActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayNotifications = notifications?.filter(n => 
          n.scheduled_for?.startsWith(dateStr)
        ) || [];
        
        recentActivity.push({
          date: dateStr,
          sent: dayNotifications.filter(n => n.status === 'sent').length,
          failed: dayNotifications.filter(n => n.status === 'failed').length,
        });
      }

      // Get upcoming notifications
      const { data: upcoming, error: upcomingError } = await supabase
        .from('scheduled_notifications')
        .select(`
          id,
          scheduled_for,
          message_content,
          send_via,
          client_id,
          profiles!inner(first_name, last_name)
        `)
        .eq('status', 'pending')
        .gte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(5);

      if (upcomingError) throw upcomingError;

      const upcomingNotifications = upcoming?.map(n => ({
        id: n.id,
        client_name: `${n.profiles.first_name || ''} ${n.profiles.last_name || ''}`.trim(),
        scheduled_for: n.scheduled_for,
        message_preview: n.message_content.substring(0, 60) + (n.message_content.length > 60 ? '...' : ''),
        channels: n.send_via || []
      })) || [];

      setMetrics({
        totalSent,
        totalPending,
        totalFailed,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: 2.5, // Mock data - implement real calculation
        topChannels,
        recentActivity,
        upcomingNotifications
      });

    } catch (err) {
      console.error('Error fetching metrics:', err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las métricas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async (search?: string) => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .eq('role', 'client')
        .order('first_name', { ascending: true })
        .limit(50);

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    }
  };

  const sendQuickNotification = async (data: QuickSendData) => {
    try {
      const scheduleFor = data.scheduleFor || new Date().toISOString();
      
      const notifications = data.clientIds.map(clientId => ({
        client_id: clientId,
        message_content: data.message,
        send_via: data.channels,
        scheduled_for: scheduleFor,
        status: 'pending',
        ...(data.subject && { subject: data.subject })
      }));

      const { error } = await supabase
        .from('scheduled_notifications')
        .insert(notifications);

      if (error) throw error;

      toast({
        title: "Notificaciones programadas",
        description: `Se han programado ${data.clientIds.length} notificaciones`,
      });

      // Refresh metrics
      fetchMetrics();

      return true;
    } catch (err) {
      console.error('Error sending notification:', err);
      toast({
        title: "Error",
        description: "No se pudieron enviar las notificaciones",
        variant: "destructive",
      });
      return false;
    }
  };

  const processNotifications = async () => {
    try {
      // Call the edge function to process pending notifications
      const { error } = await supabase.functions.invoke('process-notifications');
      
      if (error) throw error;

      toast({
        title: "Procesamiento iniciado",
        description: "Las notificaciones pendientes están siendo procesadas",
      });

      // Refresh metrics after a short delay
      setTimeout(() => fetchMetrics(), 2000);

    } catch (err) {
      console.error('Error processing notifications:', err);
      toast({
        title: "Error",
        description: "No se pudieron procesar las notificaciones",
        variant: "destructive",
      });
    }
  };

  const getNotificationPreview = (template: string, variables: Record<string, string>): string => {
    let preview = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      preview = preview.replace(regex, value || `[${key}]`);
    }
    return preview;
  };

  useEffect(() => {
    fetchMetrics();
    fetchClients();
  }, []);

  return {
    metrics,
    loading,
    clients,
    fetchMetrics,
    fetchClients,
    sendQuickNotification,
    processNotifications,
    getNotificationPreview,
  };
};