import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InternalCode {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  category: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  creator_name: string;
  usage_count: number;
  last_used: string;
}

export interface CodeAssignment {
  id: string;
  code_id: string;
  entity_type: string;
  entity_id: string;
  assigned_at: string;
  assigned_by: string;
  notes: string;
  code: string;
  code_name: string;
  code_color: string;
  code_category: string;
  assigner_name: string;
}

export const useInternalCodes = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<InternalCode[]>([]);
  const [assignments, setAssignments] = useState<CodeAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  // Obtener códigos con estadísticas
  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_codes_with_stats');

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los códigos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Obtener asignaciones de códigos
  const fetchAssignments = async (entityType?: string, entityId?: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_code_assignments_with_details', {
          target_entity_type: entityType || null,
          target_entity_id: entityId || null
        });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las asignaciones",
        variant: "destructive",
      });
    }
  };

  // Crear nuevo código
  const createCode = async (codeData: {
    code: string;
    name: string;
    description?: string;
    color?: string;
    category?: string;
  }) => {
    try {
      setLoading(true);
      
      // Obtener el perfil del usuario actual
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data, error } = await supabase
        .from('internal_codes')
        .insert([{
          ...codeData,
          created_by: profile?.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Código creado",
        description: `El código "${codeData.code}" ha sido creado exitosamente`,
      });

      await fetchCodes();
      return data;
    } catch (error: any) {
      console.error('Error creating code:', error);
      toast({
        title: "Error",
        description: error.message?.includes('duplicate') 
          ? "El código ya existe" 
          : "No se pudo crear el código",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar código
  const updateCode = async (id: string, updates: Partial<InternalCode>) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('internal_codes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Código actualizado",
        description: "El código ha sido actualizado exitosamente",
      });

      await fetchCodes();
    } catch (error) {
      console.error('Error updating code:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el código",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Eliminar código
  const deleteCode = async (id: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('internal_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Código eliminado",
        description: "El código ha sido eliminado exitosamente",
      });

      await fetchCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el código",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Asignar código a una entidad
  const assignCode = async (assignment: {
    code_id: string;
    entity_type: string;
    entity_id: string;
    notes?: string;
  }) => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData.session?.user?.id;
      if (!userId) {
        throw new Error("No se pudo obtener la sesión del usuario actual.");
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      if (!profile?.id) {
        throw new Error("El usuario actual no tiene un perfil asociado.");
      }

      const { data, error } = await supabase
        .from('code_assignments')
        .insert([{
          ...assignment,
          assigned_by: profile.id
        }])
        .select(`
          id,
          code_id,
          entity_type,
          entity_id,
          assigned_at,
          assigned_by,
          notes,
          code:code_id ( code, name, color, category ),
          assigner:assigned_by ( first_name, last_name )
        `)
        .single();

      if (error) throw error;

      const normalizedAssignment: CodeAssignment = {
        id: data.id,
        code_id: data.code_id,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        assigned_at: data.assigned_at,
        assigned_by: data.assigned_by,
        notes: data.notes,
        code: data.code?.code ?? '',
        code_name: data.code?.name ?? '',
        code_color: data.code?.color ?? '#94A3B8',
        code_category: data.code?.category ?? 'general',
        assigner_name: data.assigner
          ? `${data.assigner.first_name ?? ''} ${data.assigner.last_name ?? ''}`.trim() || 'Equipo'
          : `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Equipo',
      };

      setAssignments(prev => [normalizedAssignment, ...prev]);

      toast({
        title: "Código asignado",
        description: "El código ha sido asignado exitosamente",
      });
    } catch (error: any) {
      console.error('Error assigning code:', error);
      toast({
        title: "Error",
        description: error.message?.includes('duplicate') 
          ? "El código ya está asignado a esta entidad" 
          : error.message || "No se pudo asignar el código",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Desasignar código
  const unassignCode = async (assignmentId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('code_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Código desasignado",
        description: "El código ha sido desasignado exitosamente",
      });

      setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId));
    } catch (error) {
      console.error('Error unassigning code:', error);
      toast({
        title: "Error",
        description: "No se pudo desasignar el código",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Buscar entidades por códigos
  const searchEntitiesByCodes = async (codes: string[]) => {
    try {
      const { data, error } = await supabase
        .rpc('search_entities_by_codes', { codes });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching entities:', error);
      toast({
        title: "Error",
        description: "No se pudo realizar la búsqueda",
        variant: "destructive",
      });
      return [];
    }
  };

  // Obtener códigos por categoría
  const getCodesByCategory = (category: string) => {
    return codes.filter(code => code.category === category);
  };

  // Obtener asignaciones por entidad
  const getAssignmentsByEntity = (entityType: string, entityId: string) => {
    return assignments.filter(
      assignment => assignment.entity_type === entityType && assignment.entity_id === entityId
    );
  };

  // Obtener categorías disponibles
  const getAvailableCategories = () => {
    const categories = [...new Set(codes.map(code => code.category))];
    return categories.sort();
  };

  useEffect(() => {
    fetchCodes();
    fetchAssignments();
  }, []);

  return {
    codes,
    assignments,
    loading,
    createCode,
    updateCode,
    deleteCode,
    assignCode,
    unassignCode,
    searchEntitiesByCodes,
    getCodesByCategory,
    getAssignmentsByEntity,
    getAvailableCategories,
    refetchCodes: fetchCodes,
    refetchAssignments: fetchAssignments
  };
};
