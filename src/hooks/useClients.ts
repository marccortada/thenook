import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Client {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  total_bookings?: number;
  last_booking?: string;
  total_spent?: number;
  tags?: string[];
}

export interface ClientBooking {
  id: string;
  booking_datetime: string;
  duration_minutes: number;
  total_price_cents: number;
  status: string;
  service_name?: string;
  center_name?: string;
  notes: string | null;
}

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 useClients: Iniciando consulta a Supabase...');

      // Fetch clients with booking statistics
      const { data: clientsData, error } = await supabase
        .from('profiles')
        .select(`
          *,
          bookings:bookings(
            id,
            booking_datetime,
            total_price_cents,
            status
          )
        `)
        .eq('role', 'client')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('🔍 useClients: Datos recibidos de Supabase:', { 
        clientsCount: clientsData?.length || 0, 
        firstClient: clientsData?.[0] 
      });

      // Process client data with statistics
      const processedClients = clientsData?.map(client => {
        const completedBookings = client.bookings?.filter((b: any) => b.status === 'completed') || [];
        
        return {
          ...client,
          total_bookings: client.bookings?.length || 0,
          last_booking: client.bookings?.length > 0 
            ? client.bookings.sort((a: any, b: any) => 
                new Date(b.booking_datetime).getTime() - new Date(a.booking_datetime).getTime()
              )[0].booking_datetime
            : null,
          total_spent: completedBookings.reduce((sum: number, booking: any) => 
            sum + (booking.total_price_cents || 0), 0),
          tags: [] // We'll implement tags later
        };
      }) || [];

      setClients(processedClients);
      console.log('🔍 useClients: Clientes procesados exitosamente:', processedClients.length);
    } catch (error) {
      console.error('🚨 useClients Error fetching clients:', error);
      setError('Error al cargar los clientes');
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    try {
      // Si se está actualizando el email, verificar que no exista en otro perfil
      if (updates.email) {
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', updates.email)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw checkError;
        }

        // Si el email existe y pertenece a otro cliente, mostrar error
        if (existingProfile && existingProfile.id !== clientId) {
          throw new Error(`El email ${updates.email} ya está registrado en otro cliente. Por favor, usa un email diferente.`);
        }
      }

      // Preparar los campos a actualizar (solo incluir los que tienen valor)
      const updateData: any = {};
      if (updates.first_name !== undefined) updateData.first_name = updates.first_name;
      if (updates.last_name !== undefined) updateData.last_name = updates.last_name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;

      // Solo actualizar si hay campos para actualizar
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', clientId);

        if (error) throw error;
      }

      await fetchClients(); // Refresh the list
      toast({
        title: "Éxito",
        description: "Cliente actualizado correctamente",
      });
    } catch (error: any) {
      console.error('Error updating client:', error);
      const errorMessage = error?.message || 'No se pudo actualizar el cliente';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Re-throw para que el código que llama pueda manejar el error
      throw error;
    }
  };

  const fetchClientBookings = async (clientId: string): Promise<ClientBooking[]> => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services(name),
          centers(name)
        `)
        .eq('client_id', clientId)
        .order('booking_datetime', { ascending: false });

      if (error) throw error;

      return data?.map(booking => ({
        ...booking,
        service_name: booking.services?.name || 'Servicio desconocido',
        center_name: booking.centers?.name || 'Centro desconocido'
      })) || [];
    } catch (error) {
      console.error('Error fetching client bookings:', error);
      return [];
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchClients();

    // Subscribe to profiles changes
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.client'
        },
        (payload) => {
          console.log('Profile change detected:', payload);
          fetchClients();
        }
      )
      .subscribe();

    // Subscribe to bookings changes
    const bookingsChannel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Booking change detected:', payload);
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, []);

  return {
    clients,
    loading,
    error,
    refetch: fetchClients,
    updateClient,
    fetchClientBookings,
  };
};