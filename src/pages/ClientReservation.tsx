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
import { CalendarDays, Clock, MapPin, User, CalendarIcon, Edit, X, Search, Users } from "lucide-react";
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
import AdminClientSelector from "@/components/AdminClientSelector";
import { useAuth } from "@/hooks/useAuth";

const ClientReservation = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { centers } = useCenters();
  const { employees } = useEmployees();
  const { lanes } = useLanes();
  const { createBooking } = useBookings();
  const { isAdmin, profile, user, loading } = useAuth();
  
  // Debug logs para verificar autenticación
  console.log('🔍 Auth Debug:', { isAdmin, profile, user, loading });
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showCenterDropdown, setShowCenterDropdown] = useState(false);

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

  // Function to handle client selection from AdminClientSelector
  const handleClientSelect = (client: any) => {
    setFormData(prev => ({
      ...prev,
      clientName: `${client.first_name} ${client.last_name}`,
      clientEmail: client.email,
      clientPhone: client.phone || ''
    }));
    
    // Also trigger existing bookings check
    setTimeout(() => {
      checkExistingBookings();
    }, 100);
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

                 {/* Admin Client Selector - Integrado en la sección de información del cliente */}
                 {(() => {
                   console.log('🔍 Checking admin status for selector:', { isAdmin, profile: profile?.role });
                   return isAdmin;
                 })() && (
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
                    <span>{t('center_selection')}</span>
                  </h3>
                 
                  <div className="relative">
                     <Label htmlFor="center" className="text-sm">{t('center')} *</Label>
                     <div className="relative mt-1">
                       <button
                         type="button"
                         onClick={() => setShowCenterDropdown(!showCenterDropdown)}
                         className={cn(
                           "w-full justify-between text-left font-normal border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md flex items-center min-h-[40px]",
                           !formData.center && "text-muted-foreground"
                         )}
                       >
                         <div className="flex items-center space-x-2">
                           <MapPin className="h-3 w-3" />
                           <span>
                             {formData.center 
                               ? centers.find(c => c.id === formData.center)?.name 
                               : t('select_center')
                             }
                           </span>
                         </div>
                         <svg className="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <polyline points="6,9 12,15 18,9"></polyline>
                         </svg>
                       </button>
                       
                       {showCenterDropdown && (
                         <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto min-w-full">
                           {centers.map((center) => (
                             <button
                               key={center.id}
                               type="button"
                               onClick={() => {
                                 setFormData({ ...formData, center: center.id });
                                 setSelection(null);
                                 setShowCenterDropdown(false);
                               }}
                               className="w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground flex items-center space-x-2 text-sm min-h-[40px] transition-colors"
                             >
                               <MapPin className="h-3 w-3" />
                               <span>{center.name}</span>
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                  </div>
               </div>

               {/* Service Selection - ONLY after center is selected */}
               {formData.center && (
                 <div className="space-y-3 sm:space-y-4">
                    <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                      <CalendarDays className="h-4 w-4" />
                      <span>{t('service_selection')}</span>
                    </h3>
                    <div>
                      <Label className="text-sm">{t('service')} *</Label>
                     {servicesLoading ? (
                       <div className="flex items-center justify-center p-4">
                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                         <span className="ml-2">{t('loading_options')}</span>
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
                 <div className="space-y-3 sm:space-y-4 p-4 rounded-lg border border-primary/20 bg-card">
                    <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                      <Clock className="h-4 w-4" />
                      <span>{t('date_time')}</span>
                    </h3>
                   
                   <div className="grid grid-cols-1 gap-3 sm:gap-4">
                     <div className="relative">
                       <Label htmlFor="date" className="text-sm">{t('date')} *</Label>
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
                             {formData.date ? format(formData.date, "PPP", { locale: es }) : <span>{t('select_date')}</span>}
                           </Button>
                         </PopoverTrigger>
                           <PopoverContent 
                             className="w-auto p-0 z-50 bg-popover border border-border shadow-lg"
                             align="start"
                             side="bottom"
                             sideOffset={4}
                             alignOffset={0}
                             avoidCollisions={true}
                             onInteractOutside={() => setShowCalendar(false)}
                           >
                           <Calendar
                             mode="single"
                             selected={formData.date}
                             onSelect={(date) => {
                               setFormData({ ...formData, date });
                               setShowCalendar(false);
                             }}
                             disabled={(date) => date < new Date()}
                             className={cn("p-3 pointer-events-auto")}
                             initialFocus
                           />
                         </PopoverContent>
                       </Popover>
                     </div>
                    
                       <div className="relative">
                         <Label htmlFor="time" className="text-sm">{t('time')} *</Label>
                         <div className="relative mt-1">
                           <button
                             type="button"
                             onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                             className={cn(
                               "w-full justify-between text-left font-normal border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md flex items-center min-h-[40px]",
                               !formData.time && "text-muted-foreground"
                             )}
                           >
                             <div className="flex items-center space-x-2">
                               <Clock className="h-3 w-3" />
                               <span>{formData.time || t('select_time')}</span>
                             </div>
                             <svg className="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                               <polyline points="6,9 12,15 18,9"></polyline>
                             </svg>
                           </button>
                           
                           {showTimeDropdown && (
                             <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto min-w-full">
                               {timeSlots.map((time) => (
                                 <button
                                   key={time}
                                   type="button"
                                   onClick={() => {
                                     setFormData({ ...formData, time });
                                     setShowTimeDropdown(false);
                                   }}
                                   className="w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground flex items-center space-x-2 text-sm min-h-[40px] transition-colors"
                                 >
                                   <Clock className="h-3 w-3" />
                                   <span>{time}</span>
                                 </button>
                               ))}
                             </div>
                           )}
                         </div>
                       </div>
                   </div>
                 </div>


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

              {/* Summary - Inline without modal */}
              {formData.center && formData.date && formData.time && (
                <div className="bg-accent/20 border-2 border-primary/20 rounded-xl p-6 space-y-4">
                  <h4 className="font-bold text-lg text-center text-primary">{t('booking_summary')}</h4>
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
                      {t('confirm_booking')}
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
          </div>
        </div>
      </footer>
      
    </div>
  );
};

export default ClientReservation;
