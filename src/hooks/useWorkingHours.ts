import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WorkingHour {
  open: string;
  close: string;
  closed: boolean;
}

export interface WorkingHours {
  monday: WorkingHour;
  tuesday: WorkingHour;
  wednesday: WorkingHour;
  thursday: WorkingHour;
  friday: WorkingHour;
  saturday: WorkingHour;
  sunday: WorkingHour;
}

export const useWorkingHours = () => {
  const { toast } = useToast();
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { open: "10:00", close: "22:00", closed: false },
    tuesday: { open: "10:00", close: "22:00", closed: false },
    wednesday: { open: "10:00", close: "22:00", closed: false },
    thursday: { open: "10:00", close: "22:00", closed: false },
    friday: { open: "10:00", close: "22:00", closed: false },
    saturday: { open: "10:00", close: "22:00", closed: false },
    sunday: { open: "10:00", close: "22:00", closed: false }
  });
  const [loading, setLoading] = useState(false);

  const loadWorkingHours = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('centers')
        .select('working_hours')
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading working hours:', error);
        return;
      }

      if (data?.working_hours) {
        // Convert the database format to our component format
        const dbHours = data.working_hours as any;
        const convertedHours: WorkingHours = {
          monday: {
            open: dbHours.monday?.start || "10:00",
            close: dbHours.monday?.end || "22:00",
            closed: !dbHours.monday?.enabled
          },
          tuesday: {
            open: dbHours.tuesday?.start || "10:00",
            close: dbHours.tuesday?.end || "22:00",
            closed: !dbHours.tuesday?.enabled
          },
          wednesday: {
            open: dbHours.wednesday?.start || "10:00",
            close: dbHours.wednesday?.end || "22:00",
            closed: !dbHours.wednesday?.enabled
          },
          thursday: {
            open: dbHours.thursday?.start || "10:00",
            close: dbHours.thursday?.end || "22:00",
            closed: !dbHours.thursday?.enabled
          },
          friday: {
            open: dbHours.friday?.start || "10:00",
            close: dbHours.friday?.end || "22:00",
            closed: !dbHours.friday?.enabled
          },
          saturday: {
            open: dbHours.saturday?.start || "10:00",
            close: dbHours.saturday?.end || "22:00",
            closed: !dbHours.saturday?.enabled
          },
          sunday: {
            open: dbHours.sunday?.start || "10:00",
            close: dbHours.sunday?.end || "22:00",
            closed: !dbHours.sunday?.enabled
          }
        };
        setWorkingHours(convertedHours);
      }
    } catch (error) {
      console.error('Error loading working hours:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveWorkingHours = async (hours: WorkingHours) => {
    try {
      setLoading(true);
      
      // Convert our format to database format
      const dbFormat = {
        monday: {
          start: hours.monday.open,
          end: hours.monday.close,
          enabled: !hours.monday.closed
        },
        tuesday: {
          start: hours.tuesday.open,
          end: hours.tuesday.close,
          enabled: !hours.tuesday.closed
        },
        wednesday: {
          start: hours.wednesday.open,
          end: hours.wednesday.close,
          enabled: !hours.wednesday.closed
        },
        thursday: {
          start: hours.thursday.open,
          end: hours.thursday.close,
          enabled: !hours.thursday.closed
        },
        friday: {
          start: hours.friday.open,
          end: hours.friday.close,
          enabled: !hours.friday.closed
        },
        saturday: {
          start: hours.saturday.open,
          end: hours.saturday.close,
          enabled: !hours.saturday.closed
        },
        sunday: {
          start: hours.sunday.open,
          end: hours.sunday.close,
          enabled: !hours.sunday.closed
        }
      };

      // Update the first center (assuming single center for now)
      const { error } = await supabase
        .from('centers')
        .update({ working_hours: dbFormat, updated_at: new Date().toISOString() })
        .eq('active', true)
        .limit(1);

      if (error) {
        console.error('Error saving working hours:', error);
        toast({
          title: "Error",
          description: "No se pudieron guardar los horarios de trabajo",
          variant: "destructive"
        });
        return false;
      }

      setWorkingHours(hours);
      toast({
        title: "Horarios guardados",
        description: "Los horarios de trabajo se han actualizado correctamente"
      });
      return true;
    } catch (error) {
      console.error('Error saving working hours:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los horarios de trabajo",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateWorkingHours = (day: keyof WorkingHours, updates: Partial<WorkingHour>) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], ...updates }
    }));
  };

  const isOpenNow = () => {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()] as keyof WorkingHours;
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    const daySchedule = workingHours[currentDay];
    
    if (daySchedule.closed) return false;
    
    return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
  };

  useEffect(() => {
    loadWorkingHours();
  }, []);

  return {
    workingHours,
    setWorkingHours,
    updateWorkingHours,
    saveWorkingHours,
    loadWorkingHours,
    isOpenNow,
    loading
  };
};