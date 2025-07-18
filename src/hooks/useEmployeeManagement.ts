import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WorkingHours {
  [key: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface EmployeeMetrics {
  totalBookings: number;
  completedBookings: number;
  revenue: number;
  averageRating: number;
  thisWeekBookings: number;
  thisMonthBookings: number;
}

export interface EmployeeDetails {
  id: string;
  profile_id: string;
  center_id: string;
  specialties: string[];
  active: boolean;
  working_hours: WorkingHours;
  hire_date: string;
  notes: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

const defaultWorkingHours: WorkingHours = {
  monday: { enabled: true, start: '09:00', end: '18:00' },
  tuesday: { enabled: true, start: '09:00', end: '18:00' },
  wednesday: { enabled: true, start: '09:00', end: '18:00' },
  thursday: { enabled: true, start: '09:00', end: '18:00' },
  friday: { enabled: true, start: '09:00', end: '18:00' },
  saturday: { enabled: true, start: '10:00', end: '16:00' },
  sunday: { enabled: false, start: '10:00', end: '16:00' }
};

export const useEmployeeManagement = () => {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetails | null>(null);
  const [employeeMetrics, setEmployeeMetrics] = useState<{ [key: string]: EmployeeMetrics }>({});
  const [loading, setLoading] = useState(false);

  // Simular métricas de empleados (en un caso real, esto vendría de la base de datos)
  const generateMockMetrics = (employeeId: string): EmployeeMetrics => {
    const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    return {
      totalBookings: random(45, 150),
      completedBookings: random(40, 140),
      revenue: random(2500, 8500),
      averageRating: parseFloat((4.2 + Math.random() * 0.8).toFixed(1)),
      thisWeekBookings: random(5, 15),
      thisMonthBookings: random(18, 45)
    };
  };

  const updateEmployeeWorkingHours = async (employeeId: string, workingHours: WorkingHours) => {
    try {
      setLoading(true);
      
      // En un caso real, esto se guardaría en la base de datos
      // Por ahora solo simulamos la actualización
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (selectedEmployee) {
        setSelectedEmployee({
          ...selectedEmployee,
          working_hours: workingHours
        });
      }
      
      toast({
        title: "Horarios actualizados",
        description: "Los horarios de trabajo han sido guardados exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los horarios. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEmployeeStatus = async (employeeId: string, active: boolean) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('employees')
        .update({ active })
        .eq('id', employeeId);

      if (error) throw error;

      if (selectedEmployee) {
        setSelectedEmployee({
          ...selectedEmployee,
          active
        });
      }

      toast({
        title: active ? "Empleado activado" : "Empleado desactivado",
        description: `El empleado ha sido ${active ? 'activado' : 'desactivado'} exitosamente.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del empleado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEmployeeSpecialties = async (employeeId: string, specialties: string[]) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('employees')
        .update({ specialties })
        .eq('id', employeeId);

      if (error) throw error;

      if (selectedEmployee) {
        setSelectedEmployee({
          ...selectedEmployee,
          specialties
        });
      }

      toast({
        title: "Especialidades actualizadas",
        description: "Las especialidades han sido actualizadas exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar las especialidades.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeMetrics = (employeeId: string): EmployeeMetrics => {
    if (!employeeMetrics[employeeId]) {
      const metrics = generateMockMetrics(employeeId);
      setEmployeeMetrics(prev => ({
        ...prev,
        [employeeId]: metrics
      }));
      return metrics;
    }
    return employeeMetrics[employeeId];
  };

  const isEmployeeAvailable = (employee: EmployeeDetails): boolean => {
    if (!employee.active) return false;
    
    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5);
    
    const todayHours = employee.working_hours?.[today] || defaultWorkingHours[today];
    
    return todayHours.enabled && 
           currentTime >= todayHours.start && 
           currentTime <= todayHours.end;
  };

  const getEmployeeStatusText = (employee: EmployeeDetails): string => {
    if (!employee.active) return 'Inactivo';
    
    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = employee.working_hours?.[today] || defaultWorkingHours[today];
    
    if (!todayHours.enabled) return 'No trabaja hoy';
    
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (currentTime < todayHours.start) return `Entra a las ${todayHours.start}`;
    if (currentTime > todayHours.end) return 'Turno terminado';
    
    return 'Disponible';
  };

  return {
    selectedEmployee,
    setSelectedEmployee,
    employeeMetrics,
    loading,
    updateEmployeeWorkingHours,
    updateEmployeeStatus,
    updateEmployeeSpecialties,
    getEmployeeMetrics,
    isEmployeeAvailable,
    getEmployeeStatusText,
    defaultWorkingHours
  };
};