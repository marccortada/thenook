import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmployeeShift {
  id: string;
  employee_id: string;
  center_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAbsence {
  id: string;
  employee_id: string;
  absence_type: 'vacation' | 'sick_leave' | 'personal' | 'training';
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAvailability {
  id: string;
  employee_id: string;
  date: string;
  is_available: boolean;
  available_from?: string;
  available_until?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useScheduleManagement = () => {
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [absences, setAbsences] = useState<EmployeeAbsence[]>([]);
  const [availability, setAvailability] = useState<EmployeeAvailability[]>([]);
  const { toast } = useToast();

  // Shift Management
  const fetchShifts = async (employeeId?: string) => {
    setLoading(true);
    try {
      let query = supabase.from('employee_shifts').select('*');
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query.order('day_of_week');
      
      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los turnos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createShift = async (shiftData: Omit<EmployeeShift, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_shifts')
        .insert([shiftData])
        .select()
        .single();

      if (error) throw error;

      setShifts(prev => [...prev, data]);
      toast({
        title: "Turno creado",
        description: "El turno ha sido creado exitosamente",
      });
      return data;
    } catch (error) {
      console.error('Error creating shift:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el turno",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateShift = async (shiftId: string, updates: Partial<EmployeeShift>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_shifts')
        .update(updates)
        .eq('id', shiftId)
        .select()
        .single();

      if (error) throw error;

      setShifts(prev => prev.map(shift => shift.id === shiftId ? data : shift));
      toast({
        title: "Turno actualizado",
        description: "El turno ha sido actualizado exitosamente",
      });
      return data;
    } catch (error) {
      console.error('Error updating shift:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el turno",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Absence Management
  const fetchAbsences = async (employeeId?: string) => {
    setLoading(true);
    try {
      let query = supabase.from('employee_absences').select('*');
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query.order('start_date', { ascending: false });
      
      if (error) throw error;
      setAbsences(data as any || []);
    } catch (error) {
      console.error('Error fetching absences:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las ausencias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAbsence = async (absenceData: Omit<EmployeeAbsence, 'id' | 'created_at' | 'updated_at' | 'approved_by' | 'approved_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_absences')
        .insert([absenceData])
        .select()
        .single();

      if (error) throw error;

      setAbsences(prev => [data as any, ...prev]);
      toast({
        title: "Ausencia solicitada",
        description: "La solicitud de ausencia ha sido creada",
      });
      return data;
    } catch (error) {
      console.error('Error creating absence:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud de ausencia",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateAbsenceStatus = async (absenceId: string, status: 'approved' | 'rejected', currentUserId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_absences')
        .update({
          status,
          approved_by: currentUserId,
          approved_at: new Date().toISOString()
        })
        .eq('id', absenceId)
        .select()
        .single();

      if (error) throw error;

      setAbsences(prev => prev.map(absence => absence.id === absenceId ? data as any : absence));
      toast({
        title: "Estado actualizado",
        description: `Ausencia ${status === 'approved' ? 'aprobada' : 'rechazada'}`,
      });
      return data;
    } catch (error) {
      console.error('Error updating absence status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la ausencia",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Availability Management
  const fetchAvailability = async (employeeId?: string, startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      let query = supabase.from('employee_availability').select('*');
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      if (startDate) {
        query = query.gte('date', startDate);
      }
      
      if (endDate) {
        query = query.lte('date', endDate);
      }
      
      const { data, error } = await query.order('date');
      
      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la disponibilidad",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (availabilityData: Omit<EmployeeAvailability, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_availability')
        .upsert([availabilityData], { 
          onConflict: 'employee_id,date' 
        })
        .select()
        .single();

      if (error) throw error;

      setAvailability(prev => {
        const existing = prev.find(a => a.employee_id === data.employee_id && a.date === data.date);
        if (existing) {
          return prev.map(a => a.id === existing.id ? data : a);
        } else {
          return [...prev, data];
        }
      });

      toast({
        title: "Disponibilidad actualizada",
        description: "La disponibilidad ha sido actualizada exitosamente",
      });
      return data;
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la disponibilidad",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    shifts,
    absences,
    availability,
    fetchShifts,
    createShift,
    updateShift,
    fetchAbsences,
    createAbsence,
    updateAbsenceStatus,
    fetchAvailability,
    updateAvailability,
  };
};