import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  user_id?: string;
  action_url?: string;
  metadata?: Record<string, any>;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Generar notificaciones simuladas basadas en datos reales
  const generateSystemNotifications = async () => {
    const systemNotifications: Notification[] = [];

    try {
      // Obtener reservas pendientes de hoy
      const today = new Date().toISOString().split('T')[0];
      const { data: todayBookings } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!inner(first_name, last_name),
          services!inner(name)
        `)
        .eq('status', 'pending')
        .gte('booking_datetime', `${today}T00:00:00`)
        .lte('booking_datetime', `${today}T23:59:59`);

      if (todayBookings && todayBookings.length > 0) {
        systemNotifications.push({
          id: 'pending-bookings',
          title: 'Reservas Pendientes',
          message: `Tienes ${todayBookings.length} reservas pendientes de confirmar para hoy`,
          type: 'warning',
          read: false,
          created_at: new Date().toISOString(),
          metadata: { count: todayBookings.length, type: 'bookings' }
        });
      }

      // Verificar bonos que expiran pronto
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      
      const { data: expiringPackages } = await supabase
        .from('client_packages')
        .select(`
          *,
          profiles!inner(first_name, last_name)
        `)
        .eq('status', 'active')
        .lte('expiry_date', weekFromNow.toISOString())
        .gt('used_sessions', 0);

      if (expiringPackages && expiringPackages.length > 0) {
        systemNotifications.push({
          id: 'expiring-packages',
          title: 'Bonos por Expirar',
          message: `${expiringPackages.length} bonos expiran en los próximos 7 días`,
          type: 'warning',
          read: false,
          created_at: new Date().toISOString(),
          metadata: { count: expiringPackages.length, type: 'packages' }
        });
      }

      // Verificar alertas de clientes
      const { data: clientAlerts } = await supabase
        .from('client_notes')
        .select(`
          *,
          profiles!inner(first_name, last_name)
        `)
        .eq('is_alert', true);

      if (clientAlerts && clientAlerts.length > 0) {
        systemNotifications.push({
          id: 'client-alerts',
          title: 'Alertas de Clientes',
          message: `${clientAlerts.length} clientes tienen alertas activas`,
          type: 'error',
          read: false,
          created_at: new Date().toISOString(),
          metadata: { count: clientAlerts.length, type: 'alerts' }
        });
      }

      // Estadísticas del día
      const { data: todayStats } = await supabase
        .from('bookings')
        .select('status')
        .gte('booking_datetime', `${today}T00:00:00`)
        .lte('booking_datetime', `${today}T23:59:59`);

      if (todayStats && todayStats.length > 0) {
        const confirmed = todayStats.filter(b => b.status === 'confirmed').length;
        systemNotifications.push({
          id: 'daily-stats',
          title: 'Resumen del Día',
          message: `${confirmed} de ${todayStats.length} reservas confirmadas para hoy`,
          type: 'info',
          read: false,
          created_at: new Date().toISOString(),
          metadata: { confirmed, total: todayStats.length, type: 'stats' }
        });
      }

      return systemNotifications;
    } catch (error) {
      console.error('Error generating notifications:', error);
      return [];
    }
  };

  // Cargar notificaciones
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const systemNotifications = await generateSystemNotifications();
      
      // Agregar algunas notificaciones de ejemplo para demostración
      const demoNotifications: Notification[] = [
        {
          id: 'welcome',
          title: '¡Bienvenido!',
          message: 'Sistema de notificaciones activado. Recibirás alertas importantes aquí.',
          type: 'success',
          read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 'system-update',
          title: 'Actualización del Sistema',
          message: 'Nueva funcionalidad de workflows disponible en el panel de administración.',
          type: 'info',
          read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        },
      ];

      const allNotifications = [...systemNotifications, ...demoNotifications]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar como leída
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Marcar todas como leídas
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Eliminar notificación
  const removeNotification = (notificationId: string) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== notificationId);
      const unreadFiltered = filtered.filter(n => !n.read);
      setUnreadCount(unreadFiltered.length);
      return filtered;
    });
  };

  // Agregar nueva notificación
  const addNotification = (notification: Omit<Notification, 'id' | 'created_at'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      created_at: new Date().toISOString(),
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    if (!newNotification.read) {
      setUnreadCount(prev => prev + 1);
    }

    // Mostrar toast para notificaciones importantes
    if (notification.type === 'error' || notification.type === 'warning') {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    }
  };

  // Simular tiempo real con actualizaciones periódicas
  useEffect(() => {
    fetchNotifications();

    // Actualizar cada 5 minutos
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);

    // Simular nuevas notificaciones ocasionalmente
    const randomNotifications = setInterval(() => {
      if (Math.random() > 0.7) { // 30% de probabilidad
        const randomMessages = [
          { title: 'Nueva Reserva', message: 'Se ha registrado una nueva reserva', type: 'info' as const },
          { title: 'Recordatorio', message: 'Revisar bonos que expiran esta semana', type: 'warning' as const },
          { title: 'Sistema OK', message: 'Todos los servicios funcionan correctamente', type: 'success' as const },
        ];
        
        const randomMsg = randomMessages[Math.floor(Math.random() * randomMessages.length)];
        addNotification({
          ...randomMsg,
          read: false,
        });
      }
    }, 30000); // Cada 30 segundos

    return () => {
      clearInterval(interval);
      clearInterval(randomNotifications);
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    addNotification,
    refetch: fetchNotifications,
  };
};