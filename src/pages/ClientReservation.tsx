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
import { CalendarDays, Clock, MapPin, User, CalendarIcon, Edit, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCenters, useServices, useEmployees, useLanes, useBookings, usePackages } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ChatBot from "@/components/ChatBot";
const ClientReservation = () => {
  const { toast } = useToast();
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

  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [showExistingBookings, setShowExistingBookings] = useState(false);

  const { services, loading: servicesLoading } = useServices(formData.center);
  const { packages, loading: packagesLoading } = usePackages(formData.center);

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

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

  // Check for existing bookings and packages when email/phone changes
  const checkExistingBookings = async () => {
    if (!formData.clientEmail && !formData.clientPhone) return;

    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${formData.clientEmail},phone.eq.${formData.clientPhone}`)
        .maybeSingle();

      if (existingProfile) {
        // Get future bookings
        const { data: bookings } = await supabase
          .from('bookings')
          .select(`
            *,
            services(name),
            centers(name),
            employees(profiles(first_name, last_name))
          `)
          .eq('client_id', existingProfile.id)
          .gte('booking_datetime', new Date().toISOString())
          .order('booking_datetime', { ascending: true });

        // Get active packages/vouchers
        const { data: clientPackages } = await supabase
          .from('client_packages')
          .select(`
            *,
            packages(name, services(name))
          `)
          .eq('client_id', existingProfile.id)
          .eq('status', 'active')
          .gt('expiry_date', new Date().toISOString())
          .order('expiry_date', { ascending: true });

        const combinedBookings = [
          ...(bookings || []),
          ...(clientPackages || []).map(pkg => ({
            ...pkg,
            type: 'package',
            booking_datetime: pkg.expiry_date,
            services: { name: `Bono: ${pkg.packages?.name}` },
            centers: { name: 'Válido en todos los centros' },
            remaining_sessions: pkg.total_sessions - pkg.used_sessions
          }))
        ];

        if (combinedBookings.length > 0) {
          setExistingBookings(combinedBookings);
          setShowExistingBookings(true);
        }
      }
    } catch (error) {
      console.error('Error checking existing bookings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.clientName || !formData.service || !formData.center || !formData.date || !formData.time) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      let profileToUse;
      const clientEmail = formData.clientEmail || `cliente_${Date.now()}@temp.com`;
      
      // Check if client already exists by email or phone
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${clientEmail},phone.eq.${formData.clientPhone}`)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile with any new information
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.clientName.split(' ')[0],
            last_name: formData.clientName.split(' ').slice(1).join(' ') || '',
            phone: formData.clientPhone || existingProfile.phone,
            email: clientEmail
          })
          .eq('id', existingProfile.id)
          .select()
          .single();

        if (updateError) throw updateError;
        profileToUse = updatedProfile;
      } else {
        // Create new client profile
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert([{
            email: clientEmail,
            first_name: formData.clientName.split(' ')[0],
            last_name: formData.clientName.split(' ').slice(1).join(' ') || '',
            phone: formData.clientPhone,
            role: 'client'
          }])
          .select()
          .single();

        if (profileError) throw profileError;
        profileToUse = newProfile;
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

      toast({
        title: "✅ Reserva Creada",
        description: `Reserva para ${formData.clientName} confirmada exitosamente. ID: ${newBooking?.id}`,
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
      setShowExistingBookings(false);
      setExistingBookings([]);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la reserva. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Reserva Cancelada",
        description: "La reserva ha sido cancelada exitosamente.",
      });

      // Refresh existing bookings
      checkExistingBookings();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cancelar la reserva.",
        variant: "destructive",
      });
    }
  };

  const handleEmailChange = async (email: string) => {
    setFormData(prev => ({ ...prev, clientEmail: email }));
    
    if (email && email.includes('@')) {
      try {
        // Buscar cliente existente por email
        const { data: existingClient } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email.toLowerCase())
          .single();
          
        if (existingClient) {
          setFormData(prev => ({
            ...prev,
            clientName: `${existingClient.first_name || ''} ${existingClient.last_name || ''}`.trim() || prev.clientName,
            clientPhone: existingClient.phone || prev.clientPhone
          }));
          
          toast({
            title: "Cliente encontrado",
            description: "Datos del cliente cargados automáticamente",
          });
        }
      } catch (error) {
        // Cliente no encontrado, continuar normal
        console.log('Cliente no encontrado, continuar con nuevo cliente');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-foreground">
                The Nook Madrid
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/admin-login'}
              className="text-xs"
            >
              Admin
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Mensaje informativo sobre gestión de reservas */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="glass-effect rounded-xl p-6 mb-6 border border-primary/20">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  ¿Ya tienes una reserva?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Si deseas gestionar, cambiar o cancelar una reserva existente, utiliza nuestro asistente virtual en la esquina inferior derecha. 
                  Solo proporciona tu email y podrás acceder a todas tus reservas y bonos.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4">
        <Card className="hover-lift glass-effect border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5" />
              <span>Reservar Cita</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client Information */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Información Personal</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Nombre Completo *</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="Nombre y apellidos"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Teléfono</Label>
                    <Input
                      id="clientPhone"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      onBlur={checkExistingBookings}
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
                     onChange={(e) => handleEmailChange(e.target.value)}
                     onBlur={checkExistingBookings}
                     placeholder="cliente@email.com"
                   />
                   <p className="text-xs text-muted-foreground mt-1">
                     Introduce tu email o teléfono para ver tus reservas anteriores y bonos
                   </p>
                 </div>
              </div>

              {/* Existing Bookings */}
              {showExistingBookings && existingBookings.length > 0 && (
                 <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <h3 className="font-medium">Tus Reservas y Bonos</h3>
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       onClick={() => setShowExistingBookings(false)}
                     >
                       <X className="h-4 w-4" />
                     </Button>
                   </div>
                   <div className="space-y-2">
                     {existingBookings.map((booking) => (
                       <Card key={booking.id} className="p-4">
                         <div className="flex justify-between items-start">
                           <div>
                             <p className="font-medium">{booking.services?.name}</p>
                             {booking.type === 'package' ? (
                               <>
                                 <p className="text-sm text-muted-foreground">
                                   {booking.remaining_sessions} sesiones restantes
                                 </p>
                                 <p className="text-sm text-orange-600">
                                   Caduca: {format(new Date(booking.expiry_date), "PPP", { locale: es })}
                                 </p>
                               </>
                             ) : (
                               <>
                                 <p className="text-sm text-muted-foreground">
                                   {format(new Date(booking.booking_datetime), "PPP 'a las' HH:mm", { locale: es })}
                                 </p>
                                 <p className="text-sm text-muted-foreground">{booking.centers?.name}</p>
                               </>
                             )}
                           </div>
                           <div className="flex gap-2">
                             {booking.type !== 'package' && (
                               <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 onClick={() => cancelBooking(booking.id)}
                               >
                                 Cancelar
                               </Button>
                             )}
                           </div>
                         </div>
                       </Card>
                     ))}
                   </div>
                 </div>
              )}

              {/* Service Selection */}
              <div className="space-y-4">
                <h3 className="font-medium">Selección de Servicio</h3>
                
                <div>
                  <Label>Tipo de Servicio</Label>
                  <RadioGroup
                    value={formData.serviceType}
                    onValueChange={(value) => setFormData({ ...formData, serviceType: value as "individual" | "voucher", service: "" })}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual">Sesión Individual</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="voucher" id="voucher" />
                      <Label htmlFor="voucher">Bono/Paquete</Label>
                    </div>
                  </RadioGroup>
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

                <div>
                  <Label htmlFor="service">
                    {formData.serviceType === "individual" ? "Servicio" : "Bono/Paquete"} *
                  </Label>
                  {servicesLoading || packagesLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Cargando servicios...</span>
                    </div>
                  ) : (
                    <Select value={formData.service} onValueChange={(value) => setFormData({ ...formData, service: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={formData.serviceType === "individual" ? "Selecciona un servicio" : "Selecciona un bono"} />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-background border shadow-lg">
                        {formData.serviceType === "individual" ? (
                          uniqueServices.length > 0 ? uniqueServices.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} - {service.duration_minutes}min - €{(service.price_cents / 100).toFixed(2)}
                            </SelectItem>
                          )) : (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              {formData.center ? "No hay servicios disponibles" : "Selecciona primero un centro"}
                            </div>
                          )
                        ) : (
                          uniquePackages.length > 0 ? uniquePackages.map((packageItem) => (
                          <SelectItem key={packageItem.id} value={packageItem.id}>
                            <div className="flex flex-col">
                              <span>{packageItem.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {packageItem.sessions_count} sesiones - €{(packageItem.price_cents / 100).toFixed(2)}
                                {packageItem.discount_percentage && (
                                  <span className="text-green-600 ml-1">
                                    ({packageItem.discount_percentage}% descuento)
                                  </span>
                                )}
                              </span>
                            </div>
                          </SelectItem>
                          )) : (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              {formData.center ? "No hay bonos disponibles" : "Selecciona primero un centro"}
                            </div>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}
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

              {/* Specialist Selection */}
              <div className="space-y-4">
                <h3 className="font-medium">Preferencias de Especialista</h3>
                
                <div>
                  <Label htmlFor="employee">Especialista</Label>
                  <Select value={formData.employee} onValueChange={(value) => setFormData({ ...formData, employee: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un especialista" />
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
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Alguna preferencia especial o información adicional..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" size="lg">
                <CalendarDays className="mr-2 h-5 w-5" />
                Confirmar Reserva
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>
      </main>
      
      {/* ChatBot para Clientes */}
      <ChatBot />
    </div>
  );
};

export default ClientReservation;
