import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TreatmentGroup {
  id: string;
  name: string;
  color: string;
  lane_id?: string;
  center_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  lanes?: {
    id: string;
    name: string;
  };
}

export interface CreateTreatmentGroupData {
  name: string;
  color: string;
  lane_id?: string;
  center_id?: string;
  active?: boolean;
}

export const useTreatmentGroups = () => {
  const [treatmentGroups, setTreatmentGroups] = useState<TreatmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTreatmentGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('treatment_groups')
        .select(`
          *,
          lanes (
            id,
            name
          )
        `)
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Error fetching treatment groups:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los grupos de tratamientos',
          variant: 'destructive',
        });
        return;
      }

      setTreatmentGroups(data || []);
    } catch (error) {
      console.error('Error fetching treatment groups:', error);
      toast({
        title: 'Error',
        description: 'Error inesperado al cargar los grupos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTreatmentGroup = async (groupData: CreateTreatmentGroupData) => {
    try {
      const { data, error } = await supabase
        .from('treatment_groups')
        .insert({
          name: groupData.name,
          color: groupData.color,
          lane_id: groupData.lane_id || null,
          center_id: groupData.center_id || null,
          active: groupData.active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating treatment group:', error);
        toast({
          title: 'Error',
          description: `No se pudo crear el grupo: ${error.message}`,
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: 'Éxito',
        description: 'Grupo de tratamiento creado correctamente',
      });

      fetchTreatmentGroups();
      return data;
    } catch (error) {
      console.error('Error creating treatment group:', error);
      toast({
        title: 'Error',
        description: 'Error inesperado al crear el grupo',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTreatmentGroup = async (id: string, updates: Partial<CreateTreatmentGroupData>) => {
    try {
      const { data, error } = await supabase
        .from('treatment_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating treatment group:', error);
        toast({
          title: 'Error',
          description: `No se pudo actualizar el grupo: ${error.message}`,
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: 'Éxito',
        description: 'Grupo de tratamiento actualizado correctamente',
      });

      fetchTreatmentGroups();
      return data;
    } catch (error) {
      console.error('Error updating treatment group:', error);
      toast({
        title: 'Error',
        description: 'Error inesperado al actualizar el grupo',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteTreatmentGroup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('treatment_groups')
        .update({ active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting treatment group:', error);
        toast({
          title: 'Error',
          description: `No se pudo eliminar el grupo: ${error.message}`,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Éxito',
        description: 'Grupo de tratamiento eliminado correctamente',
      });

      fetchTreatmentGroups();
      return true;
    } catch (error) {
      console.error('Error deleting treatment group:', error);
      toast({
        title: 'Error',
        description: 'Error inesperado al eliminar el grupo',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getTreatmentGroupByService = (serviceId: string, services: any[]) => {
    const service = services.find(s => s.id === serviceId);
    if (!service?.group_id) return null;
    return treatmentGroups.find(group => group.id === service.group_id) || null;
  };

  useEffect(() => {
    fetchTreatmentGroups();
  }, []);

  return {
    treatmentGroups,
    loading,
    fetchTreatmentGroups,
    createTreatmentGroup,
    updateTreatmentGroup,
    deleteTreatmentGroup,
    getTreatmentGroupByService,
  };
};