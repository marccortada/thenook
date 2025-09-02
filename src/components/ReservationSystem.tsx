import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarDays, Clock, MapPin, User, CalendarIcon, Users, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCenters, useServices, useEmployees, useLanes, useBookings, usePackages } from "@/hooks/useDatabase";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ServiceSelectorGrouped from "@/components/ServiceSelectorGrouped";
import AdminClientSelector from "@/components/AdminClientSelector";
import { useNavigate } from "react-router-dom";

const ReservationSystem = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, isEmployee } = useSimpleAuth();
  const { centers } = useCenters();
  const { employees } = useEmployees();
  const { lanes } = useLanes();
  const { createBooking } = useBookings();

  // Real-time subscription to show global booking notifications
  useEffect(() => {
    const channel = supabase
      .channel('global-bookings-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('🆕 Nueva reserva detectada en tiempo real:', payload);
          // Show a brief notification that a new booking was created somewhere
          toast({
            title: "🔄 Sistema Conectado",
            description: "Nueva reserva detectada - Todas las vistas se actualizan automáticamente",
            duration: 3000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);
  
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
    redeemCode: "",
    redeemAmountEUR: undefined as number | undefined,
    redeemNotes: "",
    redeemNow: false,
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
    console.log('🚀 handleSubmit started');
    e.preventDefault();
    
    // Basic validation
    console.log('📋 Validando campos:', { 
      isAuthenticated, 
      isAdmin, 
      isEmployee, 
      clientName: formData.clientName, 
      service: formData.service, 
      center: formData.center, 
      date: formData.date, 
      time: formData.time 
    });
    
    const isStaff = isAdmin || isEmployee;
    if ((!isAuthenticated && !formData.clientName) || (isStaff && !formData.clientName) || !formData.service || !formData.center || !formData.date || !formData.time) {
      console.log('❌ Validación fallida');
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Validación exitosa, continuando...');

    try {
      // Use authenticated user's email if logged in and NOT staff, otherwise use form email for staff
      let clientEmail;
      let profileToUse;
      
      if (isAuthenticated && user && !isAdmin && !isEmployee) {
        // Regular user is logged in, use their info
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
        // Admin/Employee or guest user - use form data for client
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
        description: `Reserva creada. Redirigiendo para asegurarla con tarjeta...`,
      });

      // Usar window.location para forzar la redirección
      console.log('🔀 Redirigiendo a asegurar reserva:', newBooking.id);
      window.location.href = `/asegurar-reserva?booking_id=${newBooking.id}`;
      return;


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
        redeemCode: "",
        redeemAmountEUR: undefined,
        redeemNotes: "",
        redeemNow: false,
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

  // Function to handle client selection from AdminClientSelector
  const handleClientSelect = (client: any) => {
    console.log('🔍 Cliente seleccionado:', client);
    setFormData(prev => ({
      ...prev,
      clientName: `${client.first_name} ${client.last_name}`,
      clientEmail: client.email,
      clientPhone: client.phone || ''
    }));
    
    toast({
      title: "Cliente seleccionado",
      description: `${client.first_name} ${client.last_name} seleccionado para la reserva`
    });
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
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
      <Card className="w-full border-0 sm:border sm:shadow-sm">
        <CardHeader className="px-3 py-4 sm:px-6 sm:py-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg lg:text-xl">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Nueva Reserva</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-6 sm:pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Client Information - Only show if user is not authenticated */}
            {!isAuthenticated && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center space-x-2 text-base sm:text-lg">
                  <User className="h-4 w-4" />
                  <span>Información del Cliente</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName" className="text-sm font-medium">Nombre Completo *</Label>
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

            {/* Client Information for Admin/Employee */}
            {isAuthenticated && (isAdmin || isEmployee) && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Información del Cliente</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Nombre *</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName || ''}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Teléfono</Label>
                    <Input
                      id="clientPhone"
                      value={formData.clientPhone || ''}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      placeholder="Número de teléfono"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail || ''}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    placeholder="Email"
                  />
                </div>

                {/* Admin Client Selector - integrado en la sección de información del cliente */}
                {isAdmin && (
                  <div className="pt-4 border-t border-primary/20">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-primary">
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-medium">Seleccionar Cliente Existente</span>
                      </div>
                      <AdminClientSelector onClientSelect={handleClientSelect} />
                      <p className="text-xs text-muted-foreground italic">
                        💡 Como administrador, puedes buscar y seleccionar un cliente existente
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Show user info for non-admin users */}
            {isAuthenticated && !isAdmin && !isEmployee && user && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Reserva para:</span>
                </h3>
                <div className="p-4 bg-accent/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{user.name}</span>
                    <span className="text-muted-foreground hidden sm:inline">({user.email})</span>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ CENTER SELECTION FIRST */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>📍 Selección de Centro</span>
              </h3>
              
              <div>
                <Label htmlFor="center">Centro *</Label>
                <Select value={formData.center} onValueChange={(value) => setFormData({ ...formData, center: value, service: "", employee: "", lane: "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un centro" />
                  </SelectTrigger>
                   <SelectContent 
                     position="popper"
                     side="bottom"
                     align="start"
                     sideOffset={4}
                     avoidCollisions={true}
                     collisionPadding={20}
                   >
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

            {/* Service Selection - ONLY after center is selected */}
            {formData.center && (
              <div className="space-y-4">
                <h3 className="font-medium">Selección de Servicio</h3>
                
                <div>
                  <Label htmlFor="service">Servicio *</Label>
                  {servicesLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Cargando servicios...</span>
                    </div>
                  ) : (
                    <ServiceSelectorGrouped
                      mode="individual"
                      services={services}
                      packages={[]}
                      selectedId={formData.service}
                      onSelect={(id, kind) => setFormData({ ...formData, service: id, serviceType: 'individual' })}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Date & Time */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Fecha y Hora</span>
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium">Fecha *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10 sm:h-11 text-sm sm:text-base",
                          !formData.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 truncate">
                          {formData.date ? format(formData.date, "PPP", { locale: es }) : "Selecciona una fecha"}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                     <PopoverContent 
                       className="w-auto p-0" 
                       align="start"
                       side="bottom"
                       sideOffset={4}
                       avoidCollisions={true}
                       collisionPadding={20}
                     >
                       <Calendar
                         mode="single"
                         selected={formData.date}
                         onSelect={(date) => {
                           console.log('Fecha seleccionada:', date);
                           setFormData({ ...formData, date });
                         }}
                         disabled={(date) => date < new Date()}
                         initialFocus
                         className="p-2 sm:p-3 touch-manipulation"
                         classNames={{
                           months: "flex flex-col space-y-4",
                           month: "space-y-4",
                           caption: "flex justify-center pt-1 relative items-center px-8",
                           caption_label: "text-sm font-medium",
                           nav: "space-x-1 flex items-center",
                           nav_button: "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 touch-manipulation border border-input hover:bg-accent hover:text-accent-foreground",
                           nav_button_previous: "absolute left-0",
                           nav_button_next: "absolute right-0",
                           table: "w-full border-collapse space-y-1",
                           head_row: "flex w-full",
                           head_cell: "text-muted-foreground rounded-md w-8 sm:w-9 font-normal text-xs sm:text-sm flex items-center justify-center",
                           row: "flex w-full mt-2",
                           cell: "text-center text-sm p-0 relative touch-manipulation",
                           day: "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal text-xs sm:text-sm touch-manipulation cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors",
                           day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                           day_today: "bg-accent text-accent-foreground font-semibold",
                           day_outside: "text-muted-foreground opacity-50",
                           day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
                           day_hidden: "invisible",
                         }}
                       />
                     </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm font-medium">Hora *</Label>
                  <Select 
                    value={formData.time} 
                    onValueChange={(value) => {
                      console.log('Hora seleccionada:', value);
                      setFormData({ ...formData, time: value });
                    }}
                  >
                    <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                      <SelectValue placeholder="Selecciona una hora" />
                    </SelectTrigger>
                     <SelectContent 
                       className="max-h-48 sm:max-h-60 overflow-y-auto z-[70] touch-manipulation"
                       position="popper"
                       side="bottom"
                       align="start"
                       sideOffset={8}
                       alignOffset={0}
                       avoidCollisions={true}
                       collisionPadding={16}
                     >
                       {timeSlots.map((time) => (
                         <SelectItem 
                           key={time} 
                           value={time} 
                           className="touch-manipulation cursor-pointer h-10 sm:h-auto text-sm sm:text-base"
                         >
                           {time}
                         </SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

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

            {/* Summary - with smooth appearance */}
            {selectedItem && (
              <div className="p-4 bg-accent/20 rounded-lg transition-all duration-300 ease-in-out">
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

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              onClick={() => console.log('🔘 Botón clickeado')}
            >
              Crear Reserva
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReservationSystem;