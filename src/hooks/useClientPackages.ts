import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientPackage {
  id: string;
  client_id: string;
  package_id: string;
  purchase_date: string;
  expiry_date: string;
  purchase_price_cents: number;
  total_sessions: number;
  used_sessions: number;
  status: 'active' | 'expired' | 'used_up' | 'cancelled';
  voucher_code: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  packages?: {
    name: string;
    description?: string;
    service_id?: string;
    services?: {
      name: string;
      type: string;
    };
  };
  profiles?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

export interface ExpiringPackage {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  package_name: string;
  voucher_code: string;
  expiry_date: string;
  remaining_sessions: number;
  days_to_expiry: number;
}

export const useClientPackages = (clientId?: string) => {
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('client_packages')
        .select(`
          *,
          packages!inner(
            name,
            description,
            service_id,
            services(name, type)
          ),
          profiles!inner(
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setPackages(data as ClientPackage[] || []);
    } catch (error) {
      console.error('Error fetching client packages:', error);
      setError('Error al cargar los bonos');
      toast({
        title: "Error",
        description: "No se pudieron cargar los bonos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPackage = async (packageData: {
    client_id: string;
    package_id: string;
    expiry_date?: string; // opcional
    purchase_price_cents: number;
    total_sessions: number;
    notes?: string;
  }) => {
    try {
      // Generar código de voucher único
      const { data: voucherData, error: voucherError } = await supabase
        .rpc('generate_voucher_code');

      if (voucherError) throw voucherError;

      // Preparar datos, omitiendo expiry_date si no se proporciona
      const insertData: any = {
        ...packageData,
        voucher_code: voucherData,
      };
      if (!packageData.expiry_date) delete insertData.expiry_date;

      const { data, error } = await supabase
        .from('client_packages')
        .insert([insertData])
        .select(`
          *,
          packages!inner(
            name,
            description,
            service_id,
            services(name, type)
          ),
          profiles!inner(
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      setPackages(prev => [data as ClientPackage, ...prev]);
      
      toast({
        title: "Éxito",
        description: `Bono creado con código: ${data.voucher_code}`,
      });

      return data;
    } catch (error) {
      console.error('Error creating package:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el bono",
        variant: "destructive",
      });
      throw error;
    }
  };

  const usePackageSession = async (packageId: string, bookingId?: string) => {
    try {
      const { data, error } = await supabase
        .rpc('use_client_package_session', {
          package_id: packageId,
          booking_id: bookingId,
        });

      if (error) throw error;

      if (data) {
        await fetchPackages(); // Refresh data
        toast({
          title: "Éxito",
          description: "Sesión del bono utilizada correctamente",
        });
        return true;
      } else {
        toast({
          title: "Error",
          description: "No se pudo usar la sesión del bono (puede estar expirado o agotado)",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error using package session:', error);
      toast({
        title: "Error",
        description: "Error al usar la sesión del bono",
        variant: "destructive",
      });
      return false;
    }
  };

  const cancelPackage = async (packageId: string) => {
    try {
      const { error } = await supabase
        .from('client_packages')
        .update({ status: 'cancelled' })
        .eq('id', packageId);

      if (error) throw error;

      await fetchPackages();
      toast({
        title: "Éxito",
        description: "Bono cancelado correctamente",
      });
    } catch (error) {
      console.error('Error cancelling package:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar el bono",
        variant: "destructive",
      });
    }
  };

  const updatePackageNotes = async (packageId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('client_packages')
        .update({ notes })
        .eq('id', packageId);

      if (error) throw error;

      await fetchPackages();
      toast({
        title: "Éxito",
        description: "Notas actualizadas correctamente",
      });
    } catch (error) {
      console.error('Error updating package notes:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las notas",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [clientId]);

  const refetch = () => {
    fetchPackages();
  };

  return {
    packages,
    loading,
    error,
    refetch,
    createPackage,
    usePackageSession,
    cancelPackage,
    updatePackageNotes,
  };
};

export const useExpiringPackages = (daysAhead: number = 7) => {
  const [expiringPackages, setExpiringPackages] = useState<ExpiringPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchExpiringPackages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_expiring_packages', { days_ahead: daysAhead });

      if (fetchError) throw fetchError;

      setExpiringPackages(data || []);
    } catch (error) {
      console.error('Error fetching expiring packages:', error);
      setError('Error al cargar bonos próximos a vencer');
      toast({
        title: "Error",
        description: "No se pudieron cargar los bonos próximos a vencer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiringPackages();
  }, [daysAhead]);

  const refetch = () => {
    fetchExpiringPackages();
  };

  return {
    expiringPackages,
    loading,
    error,
    refetch,
  };
};

export const useAvailablePackages = (clientId: string) => {
  const [availablePackages, setAvailablePackages] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailablePackages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('client_packages')
        .select(`
          *,
          packages!inner(
            name,
            description,
            service_id,
            services(name, type)
          )
        `)
        .eq('client_id', clientId)
        .eq('status', 'active')
        .filter('used_sessions', 'lt', 'total_sessions')
        .gt('expiry_date', new Date().toISOString())
        .order('expiry_date', { ascending: true });

      if (fetchError) throw fetchError;

      setAvailablePackages(data as ClientPackage[] || []);
    } catch (error) {
      console.error('Error fetching available packages:', error);
      setError('Error al cargar bonos disponibles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchAvailablePackages();
    }
  }, [clientId]);

  const refetch = () => {
    fetchAvailablePackages();
  };

  return {
    availablePackages,
    loading,
    error,
    refetch,
  };
};