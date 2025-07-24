import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, User, Phone, Mail, RefreshCw, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookingWithDetails {
  id: string;
  booking_datetime: string;
  duration_minutes: number;
  status: string;
  total_price_cents: number;
  notes?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  services?: {
    name: string;
  };
  employees?: {
    profile_id: string;
    profiles?: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

interface EmployeeWithBookings {
  id: string;
  profile_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  bookings: BookingWithDetails[];
}

const SpecialistClients = () => {
  const [employeesWithBookings, setEmployeesWithBookings] = useState<EmployeeWithBookings[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmployeesWithBookings = async () => {
    try {
      setLoading(true);
      
      // Primero obtenemos todos los empleados con sus perfiles
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id,
          profile_id,
          profiles:profile_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('active', true);

      if (employeesError) {
        throw employeesError;
      }

      // Para cada empleado, obtenemos sus reservas con detalles del cliente
      const employeesWithBookings = await Promise.all(
        employees.map(async (employee) => {
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              id,
              booking_datetime,
              duration_minutes,
              status,
              total_price_cents,
              notes,
              profiles:client_id (
                first_name,
                last_name,
                email,
                phone
              ),
              services:service_id (
                name
              )
            `)
            .eq('employee_id', employee.id)
            .gte('booking_datetime', new Date().toISOString())
            .order('booking_datetime', { ascending: true });

          if (bookingsError) {
            console.error('Error fetching bookings for employee:', employee.id, bookingsError);
            return { ...employee, bookings: [] };
          }

          return { ...employee, bookings: bookings || [] };
        })
      );

      setEmployeesWithBookings(employeesWithBookings);
    } catch (error) {
      console.error('Error fetching employees with bookings:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de especialistas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesWithBookings();

    // Set up real-time subscription for bookings changes
    const channel = supabase
      .channel('specialist-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          fetchEmployeesWithBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      case 'no_show': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      case 'no_show': return 'No Show';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clientes por Especialista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando especialistas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Clientes por Especialista</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchEmployeesWithBookings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        {employeesWithBookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay especialistas registrados</p>
          </div>
        ) : (
          <div className="space-y-6">
            {employeesWithBookings.map((employee) => (
              <div key={employee.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {employee.profiles?.first_name} {employee.profiles?.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {employee.profiles?.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {employee.bookings.length} {employee.bookings.length === 1 ? 'cliente' : 'clientes'}
                  </Badge>
                </div>

                {employee.bookings.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-gray-50 rounded">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Sin clientes asignados próximamente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employee.bookings.map((booking) => (
                      <div 
                        key={booking.id} 
                        className="bg-gray-50 p-3 rounded border-l-4 border-l-primary/20"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(booking.status)}>
                                {getStatusText(booking.status)}
                              </Badge>
                              <Badge variant="outline">
                                €{(booking.total_price_cents / 100).toFixed(2)}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {format(new Date(booking.booking_datetime), "PPP", { locale: es })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {format(new Date(booking.booking_datetime), "HH:mm")} ({booking.duration_minutes} min)
                                </span>
                              </div>
                            </div>

                            {booking.services?.name && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Servicio: </span>
                                <span className="font-medium">{booking.services.name}</span>
                              </div>
                            )}
                            
                            {booking.profiles && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-2 p-2 bg-white rounded border">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {booking.profiles.first_name} {booking.profiles.last_name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span>{booking.profiles.email}</span>
                                </div>
                                {booking.profiles.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{booking.profiles.phone}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {booking.notes && (
                              <div className="text-sm text-muted-foreground bg-white p-2 rounded border">
                                <strong>Notas:</strong> {booking.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpecialistClients;