import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Center {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  type: 'massage' | 'treatment' | 'package';
  duration_minutes: number;
  price_cents: number;
  center_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  profile_id: string;
  center_id: string;
  specialties: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export interface Lane {
  id: string;
  center_id: string;
  name: string;
  capacity: number;
  active: boolean;
  blocked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  client_id: string;
  service_id: string;
  center_id: string;
  lane_id: string;
  employee_id: string;
  booking_datetime: string;
  duration_minutes: number;
  total_price_cents: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  channel: 'web' | 'whatsapp' | 'email' | 'phone';
  notes: string | null;
  stripe_session_id: string | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  services?: {
    name: string;
  };
  centers?: {
    name: string;
  };
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  center_id?: string;
  service_id?: string;
  sessions_count: number;
  price_cents: number;
  discount_percentage?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  services?: Service;
}

export const useCenters = () => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('centers')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCenters(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching centers');
    } finally {
      setLoading(false);
    }
  };

  return { centers, loading, error, refetch: fetchCenters };
};

export const useServices = (centerId?: string) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, [centerId]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('services')
        .select('*')
        .eq('active', true);

      if (centerId) {
        query = query.eq('center_id', centerId);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching services');
    } finally {
      setLoading(false);
    }
  };

  return { services, loading, error, refetch: fetchServices };
};

export const useEmployees = (centerId?: string) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [centerId]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('employees')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('active', true);

      if (centerId) {
        query = query.eq('center_id', centerId);
      }

      const { data, error } = await query.order('created_at');

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching employees');
    } finally {
      setLoading(false);
    }
  };

  return { employees, loading, error, refetch: fetchEmployees };
};

export const useLanes = (centerId?: string) => {
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLanes();
  }, [centerId]);

  const fetchLanes = async () => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('lanes')
        .select('*')
        .eq('active', true);

      if (centerId) {
        query = query.eq('center_id', centerId);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setLanes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching lanes');
    } finally {
      setLoading(false);
    }
  };

  return { lanes, loading, error, refetch: fetchLanes };
};

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('bookings')
        .select(`
          *,
          profiles!client_id (
            first_name,
            last_name,
            email,
            phone
          ),
          services (
            name
          ),
          centers (
            name
          )
        `)
        .order('booking_datetime', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching bookings');
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async (bookingData: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Creating booking with data:', bookingData);
      
      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) {
        console.error('Booking creation error:', error);
        throw error;
      }
      
      console.log('Booking created successfully:', data);
      await fetchBookings(); // Refresh the list
      return data;
    } catch (err) {
      console.error('Error in createBooking:', err);
      throw new Error(err instanceof Error ? err.message : 'Error creating booking');
    }
  };

  const updateBookingStatus = async (id: string, status: Booking['status']) => {
    try {
      const { error } = await (supabase as any)
        .from('bookings')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      await fetchBookings(); // Refresh the list
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Error updating booking');
    }
  };

  return { 
    bookings, 
    loading, 
    error, 
    refetch: fetchBookings, 
    createBooking, 
    updateBookingStatus 
  };
};

export const usePackages = (centerId?: string) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPackages();
  }, [centerId]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('packages')
        .select(`
          *,
          services (
            name,
            description,
            duration_minutes,
            type
          )
        `)
        .eq('active', true);

      if (centerId) {
        query = query.eq('center_id', centerId);
      }

      const { data, error } = await query.order('sessions_count').order('name');

      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching packages');
    } finally {
      setLoading(false);
    }
  };

  return { packages, loading, error, refetch: fetchPackages };
};