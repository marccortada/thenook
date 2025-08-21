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
import { useCenters, useServices, useEmployees, useLanes, useBookings } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import ServiceSelectorGrouped from "@/components/ServiceSelectorGrouped";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSelector } from "@/components/LanguageSelector";
const ClientReservation = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
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

  const [selection, setSelection] = useState<{ id: string; kind: "service" } | null>(null);

  const { services, loading: servicesLoading } = useServices(formData.center);

  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [showExistingBookings, setShowExistingBookings] = useState(false);

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

        const combinedBookings = bookings || [];

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
        title: t('error'),
        description: !selection ? t('select_service_error') : t('complete_required_fields'),
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

      // Configuración según selección de servicio
      let duration_minutes = 60;
      let price_cents = 0; // No cobramos aquí; se gestiona en el centro
      let service_id: string | null = null;
      let notesText: string | null = formData.notes || null;

      if (selection?.kind === 'service') {
        const s = services.find((x) => x.id === selection.id);
        if (s) {
          duration_minutes = s.duration_minutes;
          service_id = s.id;
          price_cents = s.price_cents;
        }
      }

      // Create the booking datetime
      const bookingDate = new Date(formData.date!);
      const [hours, minutes] = formData.time.split(':');
      bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Asignar lane y employee aleatorio de los disponibles
      const availableLanes = lanes.filter(l => l.center_id === formData.center && l.active);
      const availableEmployees = employees.filter(e => e.center_id === formData.center && e.active);
      
      const randomLane = availableLanes.length > 0 ? availableLanes[Math.floor(Math.random() * availableLanes.length)] : null;
      const randomEmployee = availableEmployees.length > 0 ? availableEmployees[Math.floor(Math.random() * availableEmployees.length)] : null;

      const bookingData = {
        client_id: profileToUse?.id,
        service_id,
        center_id: formData.center,
        lane_id: randomLane?.id || null,
        employee_id: randomEmployee?.id || null,
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
      setSelection(null);
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


  // Loading state
  if (!centers || centers.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Cargando centros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      {/* Simple Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
              ← The Nook Madrid
            </Link>
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        {/* Reservation Form */}
        
        <div className="max-w-4xl mx-auto">
        <Card className="hover-lift glass-effect border-primary/20">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{t('book_appointment')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Client Information */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                  <User className="h-4 w-4" />
                  <span>{t('personal_information')}</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="col-span-full sm:col-span-1">
                    <Label htmlFor="clientName" className="text-sm">Nombre</Label>
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
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-full sm:col-span-1">
                    <Label htmlFor="clientPhone" className="text-sm">{t('phone')}</Label>
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
                        await checkExistingBookings();
                      }}
                      placeholder={t('phone_placeholder')}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                 <div>
                   <Label htmlFor="clientEmail" className="text-sm">{t('email')}</Label>
                   <Input
                     id="clientEmail"
                     type="email"
                     value={formData.clientEmail}
                     onChange={(e) => handleEmailChange(e.target.value)}
                     onBlur={checkExistingBookings}
                     placeholder={t('email_placeholder')}
                     className="mt-1"
                   />
                 </div>
              </div>

              {/* Existing Bookings */}
              {showExistingBookings && existingBookings.length > 0 && (
                 <div className="space-y-3 sm:space-y-4">
                   <div className="flex items-center justify-between">
                     <h3 className="font-medium text-sm sm:text-base">{t('your_bookings_vouchers')}</h3>
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
                               <p className="text-xs sm:text-sm text-muted-foreground">
                                 {format(new Date(booking.booking_datetime), "PPP 'a las' HH:mm", { locale: es })}
                               </p>
                               <p className="text-xs sm:text-sm text-muted-foreground">
                                 {booking.centers?.name}
                               </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                   </div>
                 </div>
               )}

               {/* 📍 CENTER SELECTION FIRST */}
               <div className="space-y-3 sm:space-y-4">
                 <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                   <MapPin className="h-4 w-4" />
                   <span>Selección de Centro</span>
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

               {/* Service Selection - ONLY after center is selected */}
               {formData.center && (
                 <div className="space-y-3 sm:space-y-4">
                   <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                     <CalendarDays className="h-4 w-4" />
                     <span>Selección de Servicio</span>
                   </h3>
                   <div>
                     <Label className="text-sm">Servicio *</Label>
                     {servicesLoading ? (
                       <div className="flex items-center justify-center p-4">
                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                         <span className="ml-2">Cargando opciones...</span>
                       </div>
                     ) : (
                       <ServiceSelectorGrouped
                         mode="individual"
                         services={services}
                         packages={[]}
                         selectedId={selection?.id}
                         onSelect={(id) => setSelection({ id, kind: "service" })}
                       />
                     )}
                   </div>
                 </div>
               )}

              {/* Date & Time */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                  <Clock className="h-4 w-4" />
                  <span>Fecha y Hora</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="date" className="text-sm">Fecha *</Label>
                    <Popover onOpenChange={(open) => {
                      if (open) {
                        // Prevent any scroll when opening
                        document.body.style.overflow = 'hidden';
                      } else {
                        document.body.style.overflow = 'unset';
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !formData.date && "text-muted-foreground"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.date ? format(formData.date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 z-[300] bg-background border shadow-xl" 
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        avoidCollisions={false}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => {
                            console.log('Calendar date selected:', date);
                            setFormData({ ...formData, date });
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                          classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center",
                            caption_label: "text-sm font-medium",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                            day_today: "bg-accent text-accent-foreground",
                            day_outside: "text-muted-foreground opacity-50",
                            day_disabled: "text-muted-foreground opacity-50",
                            day_hidden: "invisible",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label htmlFor="time" className="text-sm">Hora *</Label>
                    <Select value={formData.time} onValueChange={(value) => {
                      console.log('Time selected:', value);
                      setFormData({ ...formData, time: value });
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecciona una hora" />
                      </SelectTrigger>
                       <SelectContent 
                         className="z-[300] bg-background border shadow-xl max-h-60 overflow-y-auto"
                         position="popper"
                         side="bottom"
                         align="start"
                         sideOffset={4}
                         avoidCollisions={false}
                         onCloseAutoFocus={(e) => e.preventDefault()}
                       >
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
                <Label htmlFor="notes" className="text-sm">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Escribe aquí si quieres comentarnos cualquier cosa"
                  className="mt-1 min-h-[80px] resize-none"
                />
              </div>

              {/* Summary - Inline without modal */}
              {formData.center && formData.date && formData.time && (
                <div className="bg-accent/20 border-2 border-primary/20 rounded-xl p-6 space-y-4">
                  <h4 className="font-bold text-lg text-center text-primary">Resumen de la Reserva</h4>
                  <div className="space-y-3 text-sm">
                    {selection && (() => {
                      const selectedService = services.find(s => s.id === selection.id);
                      return selectedService && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Tratamiento:</span>
                          <span className="font-medium">{selectedService.name}</span>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Centro:</span>
                      <span className="font-medium">{selectedCenter?.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Dirección:</span>
                      <span className="font-medium text-right">{selectedCenter?.address}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Fecha:</span>
                      <span className="font-medium">{format(formData.date, "PPP", { locale: es })}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Hora:</span>
                      <span className="font-medium">{formData.time}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setFormData(prev => ({ ...prev, center: "", date: undefined, time: "" }))}
                      className="flex-1"
                    >
                      Editar
                    </Button>
                    <Button type="submit" className="flex-1 font-medium">
                      Confirmar Reserva
                    </Button>
                  </div>
                </div>
              )}

              {/* Submit Button - Only show if summary is not visible */}
              {!(formData.center && formData.date && formData.time) && (
                <Button type="submit" className="w-full h-11 text-sm sm:text-base font-medium">
                  Continuar
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
        </div>
      </main>
      
    </div>
  );
};

export default ClientReservation;
