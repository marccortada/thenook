import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientNote {
  id: string;
  client_id: string;
  staff_id: string;
  title: string;
  content: string;
  category: 'general' | 'preferences' | 'medical' | 'allergies' | 'behavior' | 'payment' | 'complaints' | 'compliments' | 'follow_up';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_private: boolean;
  is_alert: boolean;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_email?: string;
  staff_name?: string;
  staff_email?: string;
}

export interface ClientAlert {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  created_at: string;
  staff_name: string;
}

export const useClientNotes = (
  clientId?: string, 
  category?: string, 
  searchQuery?: string
) => {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('client_notes')
        .select(`
          *,
          client:profiles!client_notes_client_id_fkey (
            first_name,
            last_name,
            email
          ),
          staff:profiles!client_notes_staff_id_fkey (
            first_name,
            last_name,
            email
          )
        `);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (category) {
        query = query.eq('category', category);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      // Transform data to match ClientNote interface
      const transformedData = data?.map(note => ({
        id: note.id,
        client_id: note.client_id,
        staff_id: note.staff_id,
        title: note.title,
        content: note.content,
        category: note.category as ClientNote['category'],
        priority: note.priority as ClientNote['priority'],
        is_private: note.is_private,
        is_alert: note.is_alert,
        created_at: note.created_at,
        updated_at: note.updated_at,
        client_name: `${note.client?.first_name || ''} ${note.client?.last_name || ''}`.trim(),
        client_email: note.client?.email || '',
        staff_name: `${note.staff?.first_name || ''} ${note.staff?.last_name || ''}`.trim(),
        staff_email: note.staff?.email || ''
      })) || [];

      setNotes(transformedData);
    } catch (error: any) {
      console.error('Error fetching client notes:', error);
      // Si es un error de permisos, no mostrar el toast de error ya que puede ser normal para empleados
      if (error?.code !== 'PGRST116' && !error?.message?.includes('permission denied')) {
        setError('Revisar en useClients hook');
        toast({
          title: "Error",
          description: "No se pudieron cargar las notas",
          variant: "destructive",
        });
      } else {
        setError('Sin permisos para ver notas');
      }
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (noteData: {
    client_id: string;
    title: string;
    content: string;
    category?: ClientNote['category'];
    priority?: ClientNote['priority'];
    is_private?: boolean;
    is_alert?: boolean;
  }) => {
    try {
      // Get current user's profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;

      const { data, error } = await supabase
        .from('client_notes')
        .insert([{
          ...noteData,
          staff_id: profile.id,
          category: noteData.category || 'general',
          priority: noteData.priority || 'normal',
          is_private: noteData.is_private || false,
          is_alert: noteData.is_alert || false,
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchNotes(); // Refresh the list
      
      toast({
        title: "Éxito",
        description: "Nota creada correctamente",
      });

      return data;
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la nota",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateNote = async (
    noteId: string, 
    updates: Partial<Pick<ClientNote, 'title' | 'content' | 'category' | 'priority' | 'is_private' | 'is_alert'>>
  ) => {
    try {
      const { error } = await supabase
        .from('client_notes')
        .update(updates)
        .eq('id', noteId);

      if (error) throw error;

      await fetchNotes();
      toast({
        title: "Éxito",
        description: "Nota actualizada correctamente",
      });
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la nota",
        variant: "destructive",
      });
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      await fetchNotes();
      toast({
        title: "Éxito",
        description: "Nota eliminada correctamente",
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la nota",
        variant: "destructive",
      });
    }
  };

  const toggleAlert = async (noteId: string, isAlert: boolean) => {
    try {
      const { error } = await supabase
        .from('client_notes')
        .update({ is_alert: isAlert })
        .eq('id', noteId);

      if (error) throw error;

      await fetchNotes();
      toast({
        title: "Éxito",
        description: isAlert ? "Alerta activada" : "Alerta desactivada",
      });
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de la alerta",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [clientId, category, searchQuery]);

  const refetch = () => {
    fetchNotes();
  };

  return {
    notes,
    loading,
    error,
    refetch,
    createNote,
    updateNote,
    deleteNote,
    toggleAlert,
  };
};

export const useClientAlerts = () => {
  const [alerts, setAlerts] = useState<ClientAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('client_notes')
        .select(`
          *,
          client:profiles!client_notes_client_id_fkey (
            first_name,
            last_name,
            email
          ),
          staff:profiles!client_notes_staff_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('is_alert', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAlerts(data?.map(note => ({
        id: note.id,
        client_id: note.client_id,
        client_name: `${note.client?.first_name || ''} ${note.client?.last_name || ''}`.trim(),
        client_email: note.client?.email || '',
        title: note.title,
        content: note.content,
        category: note.category,
        priority: note.priority,
        created_at: note.created_at,
        staff_name: `${note.staff?.first_name || ''} ${note.staff?.last_name || ''}`.trim()
      })) || []);
    } catch (error) {
      console.error('Error fetching client alerts:', error);
      setError('Error al cargar las alertas');
      toast({
        title: "Error",
        description: "No se pudieron cargar las alertas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('client_notes')
        .update({ is_alert: false })
        .eq('id', noteId);

      if (error) throw error;

      await fetchAlerts();
      toast({
        title: "Éxito",
        description: "Alerta descartada",
      });
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast({
        title: "Error",
        description: "No se pudo descartar la alerta",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const refetch = () => {
    fetchAlerts();
  };

  return {
    alerts,
    loading,
    error,
    refetch,
    dismissAlert,
  };
};

// Hook para obtener notas de un cliente específico con stats
export const useClientProfile = (clientId: string) => {
  const [profileStats, setProfileStats] = useState({
    totalNotes: 0,
    alertCount: 0,
    lastNoteDate: null as string | null,
    categories: {} as Record<string, number>,
    priorities: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);

  const fetchProfileStats = async () => {
    try {
      setLoading(true);

      const { data: notes, error } = await supabase
        .from('client_notes')
        .select('category, priority, is_alert, created_at')
        .eq('client_id', clientId);

      if (error) throw error;

      const stats = {
        totalNotes: notes?.length || 0,
        alertCount: notes?.filter(n => n.is_alert).length || 0,
        lastNoteDate: notes?.length ? notes.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0].created_at : null,
        categories: {} as Record<string, number>,
        priorities: {} as Record<string, number>,
      };

      // Count categories and priorities
      notes?.forEach(note => {
        stats.categories[note.category] = (stats.categories[note.category] || 0) + 1;
        stats.priorities[note.priority] = (stats.priorities[note.priority] || 0) + 1;
      });

      setProfileStats(stats);
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchProfileStats();
    }
  }, [clientId]);

  const refetch = () => {
    fetchProfileStats();
  };

  return {
    profileStats,
    loading,
    refetch,
  };
};