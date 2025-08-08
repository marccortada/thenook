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
import { CalendarDays, Clock, MapPin, User, CalendarIcon, Edit, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCenters, useServices, useEmployees, useLanes, useBookings, usePackages } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import ServiceSelectorGrouped from "@/components/ServiceSelectorGrouped";
const ClientReservation = () => {
  const { toast } = useToast();
  const { centers } = useCenters();
  const { employees } = useEmployees();
  const { lanes } = useLanes();
  const { createBooking } = useBookings();
  // hooks para servicios y bonos se declaran después de formData
  
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    center: "",
    date: undefined as Date | undefined,
    time: "",
    notes: "",
  });

  const [selection, setSelection] = useState<{ id: string; kind: "service" | "package" } | null>(null);

  const { services, loading: servicesLoading } = useServices(formData.center);
  const { packages, loading: packagesLoading } = usePackages(formData.center);

  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [showExistingBookings, setShowExistingBookings] = useState(false);

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

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
    if (!formData.clientName || !formData.center || !formData.date || !formData.time || !selection) {
      toast({
        title: "Error",
        description: !selection ? "Selecciona un servicio o bono" : "Por favor completa todos los campos obligatorios",
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

      // Configuración según selección (servicio/bono)
      let duration_minutes = 60;
      let price_cents = 0; // No cobramos aquí; se gestiona en el centro
      let service_id: string | null = null;
      let notesText: string | null = formData.notes || null;

      if (selection?.kind === 'service') {
        const s = services.find((x) => x.id === selection.id);
        if (s) {
          duration_minutes = s.duration_minutes;
          service_id = s.id;
        }
      } else if (selection?.kind === 'package') {
        const pkg = packages.find((x) => x.id === selection.id);
        if (pkg) {
          duration_minutes = pkg.services?.duration_minutes || 60;
          service_id = pkg.service_id || null;
          notesText = [notesText || '', `Bono seleccionado: ${pkg.name}`].filter(Boolean).join(' | ');
        }
      }

      // Create the booking datetime
      const bookingDate = new Date(formData.date!);
      const [hours, minutes] = formData.time.split(':');
      bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const bookingData = {
        client_id: profileToUse?.id,
        service_id,
        center_id: formData.center,
        lane_id: null, // Admin asignará
        employee_id: null, // Admin asignará
        booking_datetime: bookingDate.toISOString(),
        duration_minutes,
        total_price_cents: price_cents,
        status: 'pending' as const,
        channel: 'web' as const,
        notes: notesText,
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
        center: "",
        date: undefined,
        time: "",
        notes: "",
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

  const selectedCenter = centers.find(c => c.id === formData.center);

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
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                The Nook Madrid
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs sm:text-sm"
            >
              <Link to="/admin-login">Admin</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        {/* Quick Access Buttons */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="hover-lift glass-effect border-primary/20 cursor-pointer transition-all duration-200 hover:scale-105">
              <Link to="/manage-booking" className="block">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Search className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary">
                        Gestionar mi Reserva
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Ver, modificar o cancelar una reserva existente
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover-lift glass-effect border-primary/20 cursor-pointer transition-all duration-200 hover:scale-105">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">
                      Nueva Reserva
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Reservar una nueva cita
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto">
        <Card className="hover-lift glass-effect border-primary/20">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Reservar Cita</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Client Information */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                  <User className="h-4 w-4" />
                  <span>Información Personal</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="col-span-full sm:col-span-1">
                    <Label htmlFor="clientName" className="text-sm">Nombre Completo *</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="Nombre y apellidos"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-full sm:col-span-1">
                    <Label htmlFor="clientPhone" className="text-sm">Teléfono</Label>
                    <Input
                      id="clientPhone"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      onBlur={checkExistingBookings}
                      placeholder="+34 600 000 000"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                 <div>
                   <Label htmlFor="clientEmail" className="text-sm">Email</Label>
                   <Input
                     id="clientEmail"
                     type="email"
                     value={formData.clientEmail}
                     onChange={(e) => handleEmailChange(e.target.value)}
                     onBlur={checkExistingBookings}
                     placeholder="cliente@email.com"
                     className="mt-1"
                   />
                   <p className="text-xs text-muted-foreground mt-1">
                     Introduce tu email o teléfono para ver tus reservas anteriores y bonos
                   </p>
                 </div>
              </div>

              {/* Existing Bookings */}
              {showExistingBookings && existingBookings.length > 0 && (
                 <div className="space-y-3 sm:space-y-4">
                   <div className="flex items-center justify-between">
                     <h3 className="font-medium text-sm sm:text-base">Tus Reservas y Bonos</h3>
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
                       <Card key={booking.id} className="p-3 sm:p-4">
                         <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                           <div className="flex-1">
                             <p className="font-medium text-sm sm:text-base">{booking.services?.name}</p>
                             {booking.type === 'package' ? (
                               <>
                                 <p className="text-xs sm:text-sm text-muted-foreground">
                                   {booking.remaining_sessions} sesiones restantes
                                 </p>
                                 <p className="text-xs sm:text-sm text-orange-600">
                                   Vence: {format(new Date(booking.booking_datetime), "PPP", { locale: es })}
                                 </p>
                               </>
                             ) : (
                               <>
                                 <p className="text-xs sm:text-sm text-muted-foreground">
                                   {format(new Date(booking.booking_datetime), "PPP 'a las' HH:mm", { locale: es })}
                                 </p>
                                 <p className="text-xs sm:text-sm text-muted-foreground">
                                   {booking.centers?.name}
                                 </p>
                               </>
                             )}
                           </div>
                           {booking.type !== 'package' && booking.status === 'pending' && (
                             <Button
                               type="button"
                               variant="outline"
                               size="sm"
                               onClick={() => cancelBooking(booking.id)}
                               className="text-xs"
                             >
                               Cancelar
                             </Button>
                           )}
                         </div>
                       </Card>
                     ))}
                   </div>
                 </div>
              )}
              {/* Service Selection */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                  <CalendarDays className="h-4 w-4" />
                  <span>Selección de Servicio</span>
                </h3>
                <div>
                  <Label className="text-sm">Servicio o Bono *</Label>
                  {servicesLoading || packagesLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Cargando opciones...</span>
                    </div>
                  ) : (
                    <ServiceSelectorGrouped
                      mode="combined"
                      services={services}
                      packages={packages}
                      selectedId={selection?.id}
                      onSelect={(id, kind) => setSelection({ id, kind })}
                    />
                  )}
                </div>
              </div>

              {/* Center Selection */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                  <MapPin className="h-4 w-4" />
                  <span>Centro</span>
                </h3>
                
                <div>
                  <Label htmlFor="center" className="text-sm">Centro *</Label>
                  <Select value={formData.center} onValueChange={(value) => { setFormData({ ...formData, center: value }); setSelection(null); }}>
                    <SelectTrigger className="mt-1">
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
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                  <Clock className="h-4 w-4" />
                  <span>Fecha y Hora</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="date" className="text-sm">Fecha *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
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
                    <Label htmlFor="time" className="text-sm">Hora *</Label>
                    <Select value={formData.time} onValueChange={(value) => setFormData({ ...formData, time: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecciona una hora" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-background border shadow-lg max-h-60 overflow-y-auto">
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-3 w-3" />
                              <span>{time}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>


              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Cualquier información adicional que consideres importante..."
                  className="mt-1 min-h-[80px] resize-none"
                />
              </div>

              {/* Summary */}
              {formData.center && formData.date && formData.time && (
                <div className="bg-accent/20 rounded-lg p-3 sm:p-4 space-y-2">
                  <h4 className="font-medium text-sm sm:text-base">Resumen de la Reserva</h4>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Centro:</span>
                      <span>{selectedCenter?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha:</span>
                      <span>{format(formData.date, "PPP", { locale: es })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hora:</span>
                      <span>{formData.time}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      El administrador asignará el especialista y tipo de servicio cuando llegues al centro.
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full h-11 text-sm sm:text-base font-medium">
                Confirmar Reserva
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>
      </main>
      
    </div>
  );
};

export default ClientReservation;
