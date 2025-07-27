import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const createStaffUsers = async () => {
  const { toast } = useToast();
  
  try {
    // Crear usuario admin
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@thenookmadrid.com',
      password: 'Gnerai123',
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: 'The Nook',
        role: 'admin'
      }
    });

    if (adminError && !adminError.message.includes('already registered')) {
      throw adminError;
    }

    // Crear usuario empleado
    const { data: employeeData, error: employeeError } = await supabase.auth.admin.createUser({
      email: 'work@thenookmadrid.com',
      password: 'worker1234',
      email_confirm: true,
      user_metadata: {
        first_name: 'Empleado',
        last_name: 'The Nook',
        role: 'employee'
      }
    });

    if (employeeError && !employeeError.message.includes('already registered')) {
      throw employeeError;
    }

    console.log('Staff users created successfully');
    return true;
  } catch (error) {
    console.error('Error creating staff users:', error);
    return false;
  }
};