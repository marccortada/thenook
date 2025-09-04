import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CalendarDays, Clock, MapPin, User, CalendarIcon, Edit, X, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
  
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

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
      console.log('Booking successfully created:', newBooking);

      // Redirigir INMEDIATAMENTE para asegurar la reserva con Stripe
      console.log('🔀 Redirigiendo a asegurar reserva:', newBooking.id);
      window.location.href = `/asegurar-reserva?booking_id=${newBooking.id}`;
      return;

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
    } catch (error: any) {
      console.error('Error creating booking:', error);
      
      // Check if it's a capacity error
      const errorMessage = error?.message || '';
      if (errorMessage.includes('Capacidad máxima alcanzada')) {
        toast({
          title: "Capacidad Completa",
          description: "Esta franja horaria ya tiene el máximo de 4 reservas. Por favor, elige otro horario.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo crear la reserva. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
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
          <p className="text-lg text-muted-foreground">{t('loading_centers')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      {/* Overlay para cerrar dropdowns al hacer clic fuera */}
      {(showCalendar || showTimeDropdown) && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => {
            setShowCalendar(false);
            setShowTimeDropdown(false);
          }}
        />
      )}
      {/* Simple Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="inline-flex items-center hover:opacity-80 transition-opacity">
                <img
                  src="/lovable-uploads/475dc4d6-6d6b-4357-a8b5-4611869beb43.png"
                  alt="The Nook Madrid"
                  className="h-8 w-auto md:h-10"
                  loading="lazy"
                  width={160}
                  height={40}
                />
              </Link>
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              >
                ← {t('back')}
              </Link>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        {/* Reservation Form */}
        
        <div className="max-w-4xl mx-auto">
        <Card className="glass-effect border-primary/20">
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
                    <Label htmlFor="clientName" className="text-sm">{t('name_label')}</Label>
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
                <div className="space-y-3 p-4 bg-accent/20 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm flex items-center space-x-2">
                      <Search className="h-4 w-4" />
                      <span>Reservas Existentes</span>
                    </h4>
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

              {/* Center Selection - Accordion */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="center">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>📍 {t('center_selection')}</span>
                      {formData.center && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({centers.find(c => c.id === formData.center)?.name})
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label htmlFor="center" className="text-sm">{t('center')} *</Label>
                        <div className="space-y-2 mt-2">
                          {centers.map((center) => {
                            // Add comprehensive debugging
                            console.log('Processing center:', {
                              id: center.id,
                              name: center.name,
                              idType: typeof center.id,
                              isEmpty: center.id === '',
                              isNull: center.id === null,
                              isUndefined: center.id === undefined
                            });
                            
                            // Skip invalid centers
                            if (!center.id || center.id === '' || center.id === null || center.id === undefined) {
                              console.warn('Skipping invalid center:', center);
                              return null;
                            }
                            
                            const isSelected = formData.center === center.id;
                            
                            return (
                              <div
                                key={center.id}
                                onClick={() => setFormData({ ...formData, center: center.id })}
                                className={cn(
                                  "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                                  isSelected 
                                    ? "bg-primary/10 border-primary text-primary" 
                                    : "bg-background border-border hover:bg-accent/50"
                                )}
                              >
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{center.name}</p>
                                </div>
                                {isSelected && (
                                  <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                    <div className="h-2 w-2 rounded-full bg-white"></div>
                                   </div>
                                 )}
                               </div>
                             );
                          }).filter(Boolean)}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Service Selection */}
              {formData.center && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                    <CalendarDays className="h-4 w-4" />
                    <span>{t('service_selection')}</span>
                  </h3>
                  <ServiceSelectorGrouped
                    services={services}
                    packages={[]}
                    selectedId={selection?.id}
                    onSelect={(id, kind) => setSelection({ id, kind })}
                  />
                </div>
              )}

              {/* Date and Time Selection */}
              {formData.center && selection && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                    <Clock className="h-4 w-4" />
                    <span>Fecha y Hora</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                     {/* Date picker */}
                     <div>
                       <Label className="text-sm">Fecha *</Label>
                       {isMobile ? (
                         <Drawer open={showCalendar} onOpenChange={setShowCalendar}>
                           <DrawerTrigger asChild>
                             <Button
                               variant="outline"
                               className={cn(
                                 "w-full justify-start text-left font-normal mt-1",
                                 !formData.date && "text-muted-foreground"
                               )}
                             >
                               <CalendarIcon className="mr-2 h-4 w-4" />
                               {formData.date ? format(formData.date, "PPP", { locale: es }) : t('select_date')}
                             </Button>
                           </DrawerTrigger>
                           <DrawerContent className="max-h-[85vh]">
                             <DrawerHeader className="text-center">
                               <DrawerTitle className="text-lg font-semibold">Seleccionar Fecha</DrawerTitle>
                             </DrawerHeader>
                             <div className="px-4 pb-6 overflow-y-auto flex-1">
                               <div className="flex justify-center">
                                 <Calendar
                                 mode="single"
                                 selected={formData.date}
                                 onSelect={(date) => {
                                   setFormData({ ...formData, date });
                                   setShowCalendar(false);
                                 }}
                                   disabled={(date) => date < new Date()}
                                   locale={es}
                                   className="w-full max-w-sm mx-auto"
                                   classNames={{
                                     months: "flex flex-col space-y-4 w-full",
                                     month: "space-y-4 w-full",
                                     caption: "flex justify-center pt-1 relative items-center w-full",
                                     caption_label: "text-base font-semibold text-foreground",
                                     nav: "space-x-1 flex items-center",
                                     nav_button: "h-9 w-9 bg-transparent p-0 opacity-70 hover:opacity-100 border border-input hover:bg-accent hover:text-accent-foreground rounded-md",
                                     nav_button_previous: "absolute left-4",
                                     nav_button_next: "absolute right-4",
                                     table: "w-full border-collapse space-y-1",
                                     head_row: "flex w-full",
                                     head_cell: "text-muted-foreground rounded-md w-10 font-normal text-sm flex items-center justify-center py-2",
                                     row: "flex w-full mt-2",
                                     cell: "text-center text-sm p-0 relative w-10 h-10 flex items-center justify-center",
                                     day: "h-9 w-9 p-0 font-normal text-sm cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors flex items-center justify-center",
                                     day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                     day_today: "bg-accent text-accent-foreground font-semibold",
                                     day_outside: "text-muted-foreground opacity-50",
                                     day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
                                     day_hidden: "invisible",
                                   }}
                                 />
                               </div>
                             </div>
                           </DrawerContent>
                         </Drawer>
                       ) : (
                         <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                           <PopoverTrigger asChild>
                             <Button
                               variant="outline"
                               className={cn(
                                 "w-full justify-start text-left font-normal mt-1",
                                 !formData.date && "text-muted-foreground"
                               )}
                             >
                               <CalendarIcon className="mr-2 h-4 w-4" />
                               {formData.date ? format(formData.date, "PPP", { locale: es }) : t('select_date')}
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent 
                             className="w-auto p-0 z-[60] bg-popover border border-border shadow-lg max-h-[80vh] overflow-y-auto"
                             align="start"
                             side="bottom"
                             sideOffset={4}
                             alignOffset={0}
                             avoidCollisions={true}
                             collisionPadding={16}
                           >
                             <Calendar
                               mode="single"
                               selected={formData.date}
                               onSelect={(date) => {
                                 setFormData({ ...formData, date });
                                 setShowCalendar(false);
                               }}
                               disabled={(date) => date < new Date()}
                               initialFocus
                               locale={es}
                             />
                           </PopoverContent>
                         </Popover>
                       )}
                     </div>

                     {/* Time picker */}
                     <div>
                       <Label className="text-sm">Hora *</Label>
                       {isMobile ? (
                         <Drawer open={showTimeDropdown} onOpenChange={setShowTimeDropdown}>
                           <DrawerTrigger asChild>
                             <Button
                               variant="outline"
                               className={cn(
                                 "w-full justify-start text-left font-normal mt-1",
                                 !formData.time && "text-muted-foreground"
                               )}
                             >
                               <Clock className="mr-2 h-4 w-4" />
                               {formData.time || t('select_time')}
                             </Button>
                           </DrawerTrigger>
                           <DrawerContent className="max-h-[85vh]">
                             <DrawerHeader className="text-center">
                               <DrawerTitle className="text-lg font-semibold">Seleccionar Hora</DrawerTitle>
                             </DrawerHeader>
                             <div className="px-4 pb-6 overflow-y-auto flex-1">
                               <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                                 {timeSlots.map((time) => (
                                   <Button
                                     key={time}
                                     variant={formData.time === time ? "default" : "outline"}
                                     size="sm"
                                     onClick={() => {
                                       setFormData({ ...formData, time });
                                       setShowTimeDropdown(false);
                                     }}
                                     className="h-14 text-sm font-medium min-w-0 flex items-center justify-center"
                                   >
                                     {time}
                                   </Button>
                                 ))}
                               </div>
                             </div>
                           </DrawerContent>
                         </Drawer>
                       ) : (
                         <Popover open={showTimeDropdown} onOpenChange={setShowTimeDropdown}>
                           <PopoverTrigger asChild>
                             <Button
                               variant="outline"
                               className={cn(
                                 "w-full justify-start text-left font-normal mt-1",
                                 !formData.time && "text-muted-foreground"
                               )}
                             >
                               <Clock className="mr-2 h-4 w-4" />
                               {formData.time || t('select_time')}
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent 
                             className="w-full p-0 z-[60] bg-popover border border-border shadow-lg max-h-60 overflow-y-auto"
                             align="start"
                             side="bottom"
                             sideOffset={4}
                             alignOffset={0}
                             avoidCollisions={true}
                             collisionPadding={16}
                             onInteractOutside={() => setShowTimeDropdown(false)}
                           >
                             <div className="p-1">
                               {timeSlots.map((time) => (
                                 <button
                                   key={time}
                                   onClick={() => {
                                     setFormData({ ...formData, time });
                                     setShowTimeDropdown(false);
                                   }}
                                   className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center space-x-2 rounded-md transition-colors"
                                 >
                                   <Clock className="h-3 w-3" />
                                   <span>{time}</span>
                                 </button>
                               ))}
                             </div>
                           </PopoverContent>
                         </Popover>
                       )}
                     </div>
                   </div>
                 </div>
              )}


              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm">{t('additional_notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('notes_placeholder_form')}
                  className="mt-1 min-h-[80px] resize-none"
                />
              </div>

              {/* Booking Summary */}
              {formData.center && formData.date && formData.time && selection && (
                <div className="p-4 bg-accent/20 border border-primary/20 rounded-lg space-y-3">
                  <h4 className="font-medium text-sm sm:text-base">{t('booking_summary')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t('center')}:</span>
                      <span className="font-medium">{selectedCenter?.name}</span>
                    </div>
                    {selection.kind === 'service' && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('service')}:</span>
                        <span className="font-medium">{services.find(s => s.id === selection.id)?.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t('date')}:</span>
                      <span className="font-medium">{format(formData.date, "PPP", { locale: es })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t('time')}:</span>
                      <span className="font-medium">{formData.time}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full h-11 text-sm sm:text-base font-medium">
                Continuar
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>
      </main>
      
      {/* Footer with contact information */}
      <footer className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t mt-8">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground">
              <a href="tel:911481474" className="flex items-center gap-1 hover:text-primary transition-colors">
                <span>📞</span>
                <span>911 481 474</span>
              </a>
              <a href="https://wa.me/+34622360922" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                <span>💬</span>
                <span>WhatsApp</span>
              </a>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              © GnerAI 2025 · Todos los derechos reservados
            </p>
          </div>
        </div>
      </footer>
      
    </div>
  );
};

export default ClientReservation;
