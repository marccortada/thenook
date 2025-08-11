import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarDays, Clock, MapPin, User, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCenters, useServices, useEmployees, useLanes, useBookings, usePackages } from "@/hooks/useDatabase";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ServiceSelectorGrouped from "@/components/ServiceSelectorGrouped";

const ReservationSystem = () => {
  const { toast } = useToast();
  const { user, isAuthenticated } = useSimpleAuth();
  const { centers } = useCenters();
  const { employees } = useEmployees();
  const { lanes } = useLanes();
  const { createBooking } = useBookings();
  
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    service: "",
    center: "",
    date: undefined as Date | undefined,
    time: "",
    employee: "",
    lane: "",
    notes: "",
    serviceType: "individual" as "individual" | "voucher",
  });

  const { services, loading: servicesLoading } = useServices(formData.center);
  const { packages, loading: packagesLoading } = usePackages(formData.center);

  // Genera horarios de 10:00 a 22:00 cada 5 min
  const generateTimeSlots = (start: string, end: string, stepMin = 5) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const slots: string[] = [];
    let cur = new Date();
    cur.setHours(sh, sm, 0, 0);
    const endDate = new Date();
    endDate.setHours(eh, em, 0, 0);
    while (cur <= endDate) {
      const hh = String(cur.getHours()).padStart(2, "0");
      const mm = String(cur.getMinutes()).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
      cur.setMinutes(cur.getMinutes() + stepMin);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots("10:00", "22:00", 5);

  // Filter employees and lanes based on selected center
  const availableEmployees = employees.filter(emp => 
    formData.center ? emp.center_id === formData.center && emp.active : emp.active
  );
  
  const availableLanes = lanes.filter(lane => 
    formData.center ? lane.center_id === formData.center && lane.active : lane.active
  );

  // Group services by name to avoid duplicates
  const uniqueServices = services.reduce((acc, service) => {
    const existingService = acc.find(s => s.name === service.name);
    if (!existingService) {
      acc.push(service);
    }
    return acc;
  }, [] as typeof services);

  // Group packages by name to avoid duplicates
  const uniquePackages = packages.reduce((acc, pkg) => {
    const existingPackage = acc.find(p => p.name === pkg.name);
    if (!existingPackage) {
      acc.push(pkg);
    }
    return acc;
  }, [] as typeof packages);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if ((!isAuthenticated && !formData.clientName) || !formData.service || !formData.center || !formData.date || !formData.time) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use authenticated user's email if logged in, otherwise use form email
      let clientEmail;
      let profileToUse;
      
      if (isAuthenticated && user) {
        // User is logged in, use their info
        clientEmail = user.email;
        profileToUse = {
          id: user.id,
          user_id: user.id,
          email: user.email,
          first_name: user.name.split(' ')[0] || '',
          last_name: user.name.split(' ')[1] || '',
          phone: null,
          role: user.role,
          created_at: '',
          updated_at: ''
        };
      } else {
        // User not logged in, check if client already exists by email
        clientEmail = formData.clientEmail || `cliente_${Date.now()}@temp.com`;
        
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', clientEmail)
          .maybeSingle();

        if (existingProfile) {
          // Update existing profile with new information if provided
          const updatedProfile = {
            first_name: formData.clientName.split(' ')[0] || existingProfile.first_name,
            last_name: formData.clientName.split(' ').slice(1).join(' ') || existingProfile.last_name,
            phone: formData.clientPhone || existingProfile.phone,
          };

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updatedProfile)
            .eq('id', existingProfile.id);

          if (updateError) throw updateError;
          profileToUse = { ...existingProfile, ...updatedProfile };
        } else {
          // Create new client profile with role 'client'
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert([{
              email: clientEmail,
              first_name: formData.clientName.split(' ')[0],
              last_name: formData.clientName.split(' ').slice(1).join(' ') || '',
              phone: formData.clientPhone,
              role: 'client'  // Explicitly set role as client
            }])
            .select()
            .single();

          if (profileError) throw profileError;
          profileToUse = newProfile;
        }
      }

      // Get service or package details for pricing
      let selectedItem, duration_minutes, price_cents;
      
      if (formData.serviceType === 'individual') {
        selectedItem = services.find(s => s.id === formData.service);
        if (!selectedItem) throw new Error('Servicio no encontrado');
        duration_minutes = selectedItem.duration_minutes;
        price_cents = selectedItem.price_cents;
      } else {
        selectedItem = packages.find(p => p.id === formData.service);
        if (!selectedItem) throw new Error('Bono no encontrado');
        duration_minutes = selectedItem.services?.duration_minutes || 60;
        price_cents = selectedItem.price_cents;
      }

      // Create the booking datetime
      const bookingDate = new Date(formData.date!);
      const [hours, minutes] = formData.time.split(':');
      bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Check employee availability before creating booking
      if (formData.employee && formData.employee !== "any") {
        const bookingDateTime = bookingDate.toISOString();
        const { data: conflictingBookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('employee_id', formData.employee)
          .eq('booking_datetime', bookingDateTime)
          .neq('status', 'cancelled');

        if (conflictingBookings && conflictingBookings.length > 0) {
          toast({
            title: "Especialista no disponible",
            description: "El especialista seleccionado no está disponible en ese horario. Por favor, selecciona otro especialista o horario.",
            variant: "destructive",
          });
          return;
        }
      }

      const bookingData = {
        client_id: profileToUse?.id,
        service_id: formData.service,
        center_id: formData.center,
        lane_id: formData.lane && formData.lane !== "any" ? formData.lane : availableLanes[0]?.id,
        employee_id: formData.employee && formData.employee !== "any" ? formData.employee : availableEmployees[0]?.id,
        booking_datetime: bookingDate.toISOString(),
        duration_minutes,
        total_price_cents: price_cents,
        status: 'pending' as const,
        channel: 'web' as const,
        notes: formData.notes || null,
        stripe_session_id: null,
        payment_status: 'pending' as const,
      };

      const newBooking = await createBooking(bookingData);
      console.log('Booking successfully created:', newBooking);

      toast({
        title: "✅ Reserva Creada",
        description: `Reserva para ${isAuthenticated && user ? user.name : formData.clientName} confirmada exitosamente. ID: ${newBooking?.id}`,
      });

      // Reset form
      setFormData({
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        service: "",
        center: "",
        date: undefined,
        time: "",
        employee: "",
        lane: "",
        notes: "",
        serviceType: "individual",
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la reserva. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const selectedService = services.find(s => s.id === formData.service);
  const selectedPackage = packages.find(p => p.id === formData.service);
  const selectedCenter = centers.find(c => c.id === formData.center);
  
  const getSelectedItem = () => {
    if (formData.serviceType === "individual") {
      return selectedService;
    } else {
      return selectedPackage;
    }
  };
  
  const selectedItem = getSelectedItem();

  return (
    <div className="max-w-4xl mx-auto px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5" />
            <span>Nueva Reserva</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Information - Only show if user is not authenticated */}
            {!isAuthenticated && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Información del Cliente</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Nombre Completo *</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      onBlur={async () => {
                        const first = formData.clientName.trim().split(" ")[0];
                        if (!formData.clientEmail && first && formData.clientPhone) {
                          try {
                            const { data } = await supabase
                              .from('profiles')
                              .select('email, first_name, last_name, phone')
                              .ilike('first_name', `%${first}%`)
                              .eq('phone', formData.clientPhone)
                              .maybeSingle();
                            if (data?.email) {
                              setFormData((prev) => ({ ...prev, clientEmail: data.email }));
                            }
                          } catch {}
                        }
                      }}
                      placeholder="Nombre y apellidos"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Teléfono</Label>
                    <Input
                      id="clientPhone"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      onBlur={async () => {
                        const first = formData.clientName.trim().split(" ")[0];
                        if (!formData.clientEmail && first && formData.clientPhone) {
                          try {
                            const { data } = await supabase
                              .from('profiles')
                              .select('email, first_name, last_name, phone')
                              .ilike('first_name', `%${first}%`)
                              .eq('phone', formData.clientPhone)
                              .maybeSingle();
                            if (data?.email) {
                              setFormData((prev) => ({ ...prev, clientEmail: data.email }));
                            }
                          } catch {}
                        }
                      }}
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>
            )}

            {/* Show logged in user info */}
            {isAuthenticated && user && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Reserva para:</span>
                </h3>
                <div className="p-4 bg-accent/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {user.name}
                    </span>
                    <span className="text-muted-foreground">({user.email})</span>
                  </div>
                </div>
              </div>
            )}

            {/* Service Selection */}
            <div className="space-y-4">
              <h3 className="font-medium">Selección de Servicio</h3>
              
              {/* Selector combinado (Bonos + Servicios) - se muestran ambos, no hace falta alternar */}

              <div>
                <Label htmlFor="service">Servicio o Bono *</Label>
                {servicesLoading || packagesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2">Cargando servicios...</span>
                  </div>
                ) : (
                  <ServiceSelectorGrouped
                    mode="combined"
                    services={services}
                    packages={packages}
                    selectedId={formData.service}
                    onSelect={(id, kind) => setFormData({ ...formData, service: id, serviceType: kind === 'package' ? 'voucher' : 'individual' })}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="center">Centro *</Label>
                <Select value={formData.center} onValueChange={(value) => setFormData({ ...formData, center: value, service: "", employee: "", lane: "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un centro" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-background border shadow-lg">
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3 w-3" />
                          <span>{center.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Fecha y Hora</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Fecha *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(formData.date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100] bg-background border shadow-lg" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => setFormData({ ...formData, date })}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label htmlFor="time">Hora *</Label>
                  <Select value={formData.time} onValueChange={(value) => setFormData({ ...formData, time: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una hora" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-background border shadow-lg">
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Staff Selection */}
            {formData.center && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Asignación de Personal</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee">Especialista</Label>
                    <Select value={formData.employee} onValueChange={(value) => setFormData({ ...formData, employee: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona especialista" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-background border shadow-lg">
                        <SelectItem value="any">Cualquier especialista disponible</SelectItem>
                        {availableEmployees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.profiles?.first_name} {employee.profiles?.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="lane">Sala/Espacio</Label>
                    <Select value={formData.lane} onValueChange={(value) => setFormData({ ...formData, lane: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona sala" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-background border shadow-lg">
                        <SelectItem value="any">Cualquier sala disponible</SelectItem>
                        {availableLanes.map((lane) => (
                          <SelectItem key={lane.id} value={lane.id}>
                            {lane.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Comentarios especiales, alergias, etc."
                rows={3}
              />
            </div>

            {/* Summary */}
            {selectedItem && (
              <div className="p-4 bg-accent/20 rounded-lg">
                <h4 className="font-medium mb-2">Resumen de la Reserva</h4>
                <div className="text-sm space-y-1">
                  {formData.serviceType === "individual" && selectedService ? (
                    <>
                      <p><strong>Servicio:</strong> {selectedService.name}</p>
                      <p><strong>Duración:</strong> {selectedService.duration_minutes} minutos</p>
                      <p><strong>Precio:</strong> €{(selectedService.price_cents / 100).toFixed(2)}</p>
                    </>
                  ) : selectedPackage && (
                    <>
                      <p><strong>Bono:</strong> {selectedPackage.name}</p>
                      <p><strong>Sesiones:</strong> {selectedPackage.sessions_count} sesiones</p>
                      <p><strong>Servicio:</strong> {selectedPackage.services?.name || 'No especificado'}</p>
                      <p><strong>Duración por sesión:</strong> {selectedPackage.services?.duration_minutes || 60} minutos</p>
                      <p><strong>Precio total:</strong> €{(selectedPackage.price_cents / 100).toFixed(2)}</p>
                      {selectedPackage.discount_percentage && (
                        <p><strong>Descuento:</strong> {selectedPackage.discount_percentage}%</p>
                      )}
                    </>
                  )}
                  {formData.date && formData.time && (
                    <p><strong>Fecha:</strong> {format(formData.date, "PPP", { locale: es })} a las {formData.time}</p>
                  )}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg">
              Crear Reserva
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReservationSystem;