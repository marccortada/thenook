import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LaneBlock {
  id: string;
  lane_id: string;
  center_id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useLaneBlocks = () => {
  const [laneBlocks, setLaneBlocks] = useState<LaneBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLaneBlocks();
  }, []);

  const fetchLaneBlocks = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('lane_blocks')
        .select('*')
        .order('start_datetime');

      if (error) throw error;
      setLaneBlocks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching lane blocks');
    } finally {
      setLoading(false);
    }
  };

  const createLaneBlock = async (
    centerId: string,
    laneId: string,
    startDateTime: Date,
    endDateTime: Date,
    reason?: string
  ) => {
    try {
      // Get current user profile to use as created_by
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profileData) {
        throw new Error('Usuario no encontrado');
      }

      const { data, error } = await (supabase as any)
        .from('lane_blocks')
        .insert([{
          center_id: centerId,
          lane_id: laneId,
          start_datetime: startDateTime.toISOString(),
          end_datetime: endDateTime.toISOString(),
          reason: reason || 'Bloqueo manual',
          created_by: profileData.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: '🚫 Carril bloqueado',
        description: 'El carril se ha bloqueado correctamente'
      });

      await fetchLaneBlocks();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creando bloqueo';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      throw err;
    }
  };

  const deleteLaneBlock = async (blockId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('lane_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      toast({
        title: '✅ Bloqueo eliminado',
        description: 'El carril está disponible nuevamente'
      });

      await fetchLaneBlocks();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error eliminando bloqueo';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      throw err;
    }
  };

  const isLaneBlocked = (laneId: string, dateTime: Date): LaneBlock | null => {
    return laneBlocks.find(block => 
      block.lane_id === laneId &&
      new Date(block.start_datetime) <= dateTime &&
      new Date(block.end_datetime) > dateTime
    ) || null;
  };

  const getBlocksForLaneAndDate = (laneId: string, date: Date): LaneBlock[] => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return laneBlocks.filter(block => 
      block.lane_id === laneId &&
      (
        (new Date(block.start_datetime) >= startOfDay && new Date(block.start_datetime) <= endOfDay) ||
        (new Date(block.end_datetime) >= startOfDay && new Date(block.end_datetime) <= endOfDay) ||
        (new Date(block.start_datetime) <= startOfDay && new Date(block.end_datetime) >= endOfDay)
      )
    );
  };

  return {
    laneBlocks,
    loading,
    error,
    refetch: fetchLaneBlocks,
    createLaneBlock,
    deleteLaneBlock,
    isLaneBlocked,
    getBlocksForLaneAndDate
  };
};