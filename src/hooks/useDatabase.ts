import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Center {
  id: string;
  name: string;
  address: string;
  address_zurbaran?: string | null;
  address_concha_espina?: string | null;
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
  has_discount?: boolean;
  discount_price_cents?: number;
  group_id?: string;
  color?: string;
  lane_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  profile_id: string;
  center_id: string;
  specialties: string[];
  employee_codes: string[];
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
  booking_codes?: string[];
  stripe_session_id: string | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
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
  client_notes?: Array<{
    id: string;
    title: string;
    content: string;
    is_alert: boolean;
    priority: string;
    created_at: string;
  }>;
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
  service_names?: string[];
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
        // Incluir también el nombre del grupo de tratamiento vinculado (treatment_groups)
        // para poder agrupar promociones en el frontal.
        .select('*, treatment_groups(name)') 
        .eq('active', true);

      if (centerId) {
        // Include services for this center AND general services (center_id is null)
        query = query.or(`center_id.eq.${centerId},center_id.is.null`);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      
      console.log('Services fetched:', data); // Debug log
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err); // Debug log
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

  const fetchBookings = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      // Optimize: Only fetch bookings from the last 30 days and next 60 days
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 60);
      
      const { data, error } = await (supabase as any)
        .from('bookings')
        .select(`
          *,
          profiles!client_id (
            id,
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
        // Traer TODO: siempre queremos ver las reservas, incluso si no hay tarjeta o cobro aún.
        .gte('booking_datetime', startDate.toISOString())
        .lte('booking_datetime', endDate.toISOString())
        .order('booking_datetime', { ascending: true });

      if (error) throw error;

      // Optimize: Load client notes only when needed (lazy loading)
      // For now, set empty array - notes will be loaded on-demand
      const normalizePaymentStatus = (booking: any) => {
        const status = (booking.payment_status || '').toLowerCase();
        const allowed = ['pending', 'paid', 'failed', 'refunded', 'partial_refund'];
        const hasPaymentEvidence = Boolean(
          booking.payment_intent_id ||
          booking.stripe_session_id ||
          booking.stripe_payment_method_id ||
          booking.payment_method ||
          booking.payment_notes ||
          booking.reserva_id
        );

        // Si no hay evidencia de cobro, forzar a pendiente aunque venga "paid"
        if (status === 'paid' && !hasPaymentEvidence) return 'pending';

        return allowed.includes(status) ? (status as any) : 'pending';
      };
      const normalizeBookingStatus = (status?: string) => {
        const allowed = ['pending', 'confirmed', 'cancelled', 'completed', 'requested', 'new', 'online', 'no_show'];
        return allowed.includes((status || '').toLowerCase())
          ? status
          : 'pending';
      };

      const bookingsWithNotes = (data || []).map((booking: any) => ({
        ...booking,
        payment_status: normalizePaymentStatus(booking),
        status: normalizeBookingStatus(booking.status),
        client_notes: [] // Will be loaded on-demand when viewing booking details
      }));

      // CRITICAL: Para reservas sin stripe_payment_method_id, buscar si el cliente tiene una tarjeta guardada
      // Esto asegura que el icono muestre el color correcto desde el inicio
      const bookingsWithoutPaymentMethod = bookingsWithNotes.filter(
        (b: any) => !b.stripe_payment_method_id && b.client_id
      );
      
      // Primero, intentar recuperar el método de pago directamente desde booking_payment_intents
      // Esto cubre el caso donde Stripe guardó la tarjeta pero la tabla de bookings no se actualizó
      const bookingPaymentMethods = new Map<string, { payment_method_id: string; customer_id: string | null; status?: string }>();
      if (bookingsWithoutPaymentMethod.length > 0) {
        const bookingIds = bookingsWithoutPaymentMethod
          .map((b: any) => b.id)
          .filter(Boolean);

        if (bookingIds.length > 0) {
          try {
            const { data: intentRows, error: intentsError } = await (supabase as any)
              .from('booking_payment_intents')
              .select('booking_id, stripe_payment_method_id, stripe_customer_id, status, updated_at')
              .in('booking_id', bookingIds)
              .not('stripe_payment_method_id', 'is', null)
              .order('updated_at', { ascending: false, nullsLast: true });

            if (intentsError) {
              console.warn('Error fetching booking payment intents:', intentsError);
            } else {
              (intentRows || []).forEach((row: any) => {
                const status = (row.status || '').toLowerCase();
                const isSucceeded = !status || status === 'succeeded';
                if (isSucceeded && row.booking_id && row.stripe_payment_method_id) {
                  if (!bookingPaymentMethods.has(row.booking_id)) {
                    bookingPaymentMethods.set(row.booking_id, {
                      payment_method_id: row.stripe_payment_method_id,
                      customer_id: row.stripe_customer_id || null,
                      status: row.status || 'succeeded'
                    });
                  }
                }
              });
            }
          } catch (err) {
            console.warn('Error resolving payment methods from intents:', err);
          }
        }

        // Persist en base de datos los métodos encontrados en intents para que el icono se actualice en todas las vistas
        if (bookingPaymentMethods.size > 0) {
          const bookingsNeedingPersist = bookingsWithNotes.filter(
            (b: any) =>
              (!b.stripe_payment_method_id || b.stripe_payment_method_id.trim() === '') &&
              bookingPaymentMethods.has(b.id)
          );

          await Promise.all(
            bookingsNeedingPersist.map(async (b: any) => {
              const intentData = bookingPaymentMethods.get(b.id);
              if (!intentData) return;
              try {
                await (supabase as any)
                  .from('bookings')
                  .update({
                    stripe_payment_method_id: intentData.payment_method_id,
                    stripe_customer_id: intentData.customer_id || null,
                    payment_method_status: intentData.status || 'succeeded',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', b.id);
              } catch (persistErr) {
                console.warn(`No se pudo persistir método de pago para booking ${b.id}:`, persistErr);
              }
            })
          );
        }

        // Intento extra: llamar a la edge function get-latest-payment-method para bookings que sigan sin tarjeta
        const bookingsNeedingFunction = bookingsWithoutPaymentMethod
          .filter((b: any) => !bookingPaymentMethods.has(b.id))
          .slice(0, 20); // limitar para evitar excesivas invocaciones

        if (bookingsNeedingFunction.length > 0) {
          await Promise.all(
            bookingsNeedingFunction.map(async (b: any) => {
              try {
                const { data: fnData, error: fnError } = await (supabase as any).functions.invoke('get-latest-payment-method', {
                  body: { booking_id: b.id }
                });
                if (!fnError && fnData?.payment_method_id) {
                  bookingPaymentMethods.set(b.id, {
                    payment_method_id: fnData.payment_method_id,
                    customer_id: fnData.customer_id || null,
                    status: 'succeeded'
                  });
                }
              } catch (fnErr) {
                console.warn(`Error invoking get-latest-payment-method for booking ${b.id}:`, fnErr);
              }
            })
          );
        }
      }
      
      if (bookingsWithoutPaymentMethod.length > 0) {
        // Agrupar por client_id para evitar queries duplicadas
        const uniqueClientIds = Array.from(
          new Set(bookingsWithoutPaymentMethod.map((b: any) => b.client_id).filter(Boolean))
        );

        // Para cada cliente, buscar su último método de pago guardado
        const clientPaymentMethods = new Map<string, { payment_method_id: string; customer_id: string | null }>();
        
        await Promise.all(
          uniqueClientIds.map(async (clientId: string) => {
            try {
              // Buscar la última reserva del cliente con método de pago guardado
              const { data: lastBooking } = await (supabase as any)
                .from('bookings')
                .select('stripe_payment_method_id, stripe_customer_id, payment_method_status')
                .eq('client_id', clientId)
                .not('stripe_payment_method_id', 'is', null)
                .eq('payment_method_status', 'succeeded')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (lastBooking?.stripe_payment_method_id) {
                clientPaymentMethods.set(clientId, {
                  payment_method_id: lastBooking.stripe_payment_method_id,
                  customer_id: lastBooking.stripe_customer_id || null
                });
              }
            } catch (err) {
              console.warn(`Error fetching payment method for client ${clientId}:`, err);
            }
          })
        );

        // Asignar el método de pago a las reservas que no lo tienen
        const enrichedBookings = bookingsWithNotes.map((booking: any) => {
          // Solo asignar si la reserva NO tiene método de pago (o está vacío/null)
          if (!booking.stripe_payment_method_id || booking.stripe_payment_method_id.trim() === '') {
            const bookingIntent = bookingPaymentMethods.get(booking.id);
            if (bookingIntent && bookingIntent.payment_method_id) {
              return {
                ...booking,
                stripe_payment_method_id: bookingIntent.payment_method_id,
                stripe_customer_id: bookingIntent.customer_id || booking.stripe_customer_id,
                payment_method_status: bookingIntent.status || booking.payment_method_status || 'succeeded'
              };
            }

            if (booking.client_id) {
              const clientPaymentMethod = clientPaymentMethods.get(booking.client_id);
              if (clientPaymentMethod && clientPaymentMethod.payment_method_id) {
                return {
                  ...booking,
                  stripe_payment_method_id: clientPaymentMethod.payment_method_id,
                  stripe_customer_id: clientPaymentMethod.customer_id || booking.stripe_customer_id,
                  payment_method_status: booking.payment_method_status || 'succeeded'
                };
              }
            }
          }
          return booking;
        });

        setBookings(enrichedBookings);
      } else {
        setBookings(bookingsWithNotes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching bookings');
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBookings();

    // Suscribirse a cambios en booking_payment_intents para refrescar métodos de pago guardados
    const channel = supabase
      .channel('booking-payment-intents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_payment_intents'
        },
        () => {
          // Refresco silencioso para actualizar iconos de tarjeta cuando Stripe devuelve el método
          fetchBookings({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createBooking = async (bookingData: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // CRITICAL: Always ensure status is 'pending' for new bookings
      const bookingDataWithPending = {
        ...bookingData,
        status: 'pending' as const, // Force pending status for all new bookings
        payment_status: bookingData.payment_status || 'pending' as const
      };
      
      console.log('Creating booking with data:', bookingDataWithPending);
      
      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingDataWithPending])
        .select()
        .single();

      if (error) {
        console.error('Booking creation error:', error);
        throw error;
      }
      
      console.log('Booking created successfully (no emails sent at creation):', data);
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
    refetch: () => fetchBookings(), 
    // Refresco silencioso (sin spinner) para cambios en tiempo real
    silentRefetch: () => fetchBookings({ silent: true }),
    createBooking, 
    updateBookingStatus,
    // Exponer setBookings para poder hacer actualizaciones optimistas en vistas como el calendario
    setBookings,
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

      const packageList = data || [];
      const packageIds = packageList.map((pkg: any) => pkg.id);
      const serviceAssignments: Record<string, string[]> = {};

      if (packageIds.length) {
        const { data: packageServices, error: packageServicesError } = await (supabase as any)
          .from('package_services')
          .select(`
            package_id,
            service_id,
            services ( name )
          `)
          .in('package_id', packageIds);

        if (packageServicesError) {
          console.error('Error fetching package services:', packageServicesError);
        } else {
          (packageServices || []).forEach((row: any) => {
            const name = row.services?.name;
            if (!serviceAssignments[row.package_id]) {
              serviceAssignments[row.package_id] = [];
            }
            if (name && !serviceAssignments[row.package_id].includes(name)) {
              serviceAssignments[row.package_id].push(name);
            }
          });
        }
      }

      const enriched = packageList.map((pkg: any) => ({
        ...pkg,
        service_names: serviceAssignments[pkg.id]?.length
          ? serviceAssignments[pkg.id]
          : (pkg.services?.name ? [pkg.services.name] : []),
      }));

      setPackages(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching packages');
    } finally {
      setLoading(false);
    }
  };

  return { packages, loading, error, refetch: fetchPackages };
};
