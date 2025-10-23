import { useState, useEffect, useMemo } from "react";
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
import { useTreatmentGroups } from "@/hooks/useTreatmentGroups";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import ServiceSelectorGrouped from "@/components/ServiceSelectorGrouped";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSelector } from "@/components/LanguageSelector";
import { DatePickerModal } from "@/components/DatePickerModal";
import { TimePickerModal } from "@/components/TimePickerModal";

type TimeSlotOption = {
  time: string;
  disabled: boolean;
  reason?: string;
};

const ClientReservation = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { centers } = useCenters();
  const { employees } = useEmployees();
  const { lanes } = useLanes();
  const { createBooking } = useBookings();
  const { treatmentGroups, getTreatmentGroupByService } = useTreatmentGroups();
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

  // Genera horarios de 10:00 a 20:35 cada 5 min
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

  const timeSlots = useMemo(() => generateTimeSlots("10:00", "20:35", 5), []);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlotOption[]>(() =>
    timeSlots.map((time) => ({ time, disabled: true }))
  );

  useEffect(() => {
    let isActive = true;

    const computeAvailability = async () => {
      const baseOptions = timeSlots.map<TimeSlotOption>((time) => ({
        time,
        disabled: true,
      }));

      const selectedCenter = formData.center;
      const selectedDate = formData.date;
      const currentSelection = selection;

      if (!selectedCenter || !selectedDate || !currentSelection) {
        if (isActive) {
          setAvailableTimeSlots(baseOptions);
        }
        return;
      }

      const centerLanes = lanes.filter(
        (lane) => lane.center_id === selectedCenter && lane.active
      );

      if (centerLanes.length === 0) {
        if (isActive) {
          setAvailableTimeSlots(
            baseOptions.map((slot) => ({
              ...slot,
              reason: "Sin carriles disponibles",
            }))
          );
        }
        return;
      }

      // Get selected service duration
      let serviceDuration = 60; // default duration in minutes
      if (currentSelection.kind === "service") {
        const selectedService = services.find((s) => s.id === currentSelection.id);
        if (selectedService?.duration_minutes) {
          serviceDuration = selectedService.duration_minutes;
        }
      }

      let laneIdsToCheck: string[] = [];

      if (currentSelection.kind === "service") {
        const selectedService = services.find((s) => s.id === currentSelection.id);
        if (selectedService?.lane_ids?.length) {
          laneIdsToCheck = selectedService.lane_ids.filter((id) =>
            centerLanes.some((lane) => lane.id === id)
          );
        } else {
          const serviceGroup = getTreatmentGroupByService(currentSelection.id, services);
          const groupLaneIds =
            serviceGroup?.lane_ids?.filter((id) =>
              centerLanes.some((lane) => lane.id === id)
            ) ?? [];

          if (groupLaneIds.length > 0) {
            laneIdsToCheck = groupLaneIds;
          } else if (serviceGroup?.lane_id) {
            laneIdsToCheck = centerLanes
              .filter((lane) => lane.id === serviceGroup.lane_id)
              .map((lane) => lane.id);
          }
        }
      }

      let lanesToUse = centerLanes;
      if (laneIdsToCheck.length > 0) {
        const specificLanes = centerLanes.filter((lane) =>
          laneIdsToCheck.includes(lane.id)
        );
        lanesToUse = specificLanes.length > 0 ? specificLanes : centerLanes;
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const { data, error } = await supabase
        .from("bookings")
        .select("lane_id, booking_datetime, duration_minutes, status")
        .eq("center_id", selectedCenter)
        .gte("booking_datetime", startOfDay.toISOString())
        .lt("booking_datetime", endOfDay.toISOString())
        .neq("status", "cancelled");

      if (error) {
        console.error("Error al cargar disponibilidad de horarios:", error);
        if (isActive) {
          setAvailableTimeSlots(
            timeSlots.map((time) => ({ time, disabled: false }))
          );
        }
        return;
      }

      const bookingsForDay = data || [];
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();

      const options = timeSlots.map<TimeSlotOption>((time) => {
        const slotDate = new Date(selectedDate);
        const [hours, minutes] = time.split(":").map(Number);
        slotDate.setHours(hours, minutes, 0, 0);
        
        // Calculate when this slot would end based on service duration
        const slotEndDate = new Date(slotDate);
        slotEndDate.setMinutes(slotEndDate.getMinutes() + serviceDuration);

        let disabled = false;
        let reason: string | undefined;

        // Check if slot time has already passed (for today) 
        // Add buffer: if service is 60 min and it's 12:00 now, block slots before 13:00
        if (isToday) {
          const bufferTime = new Date(now);
          bufferTime.setMinutes(bufferTime.getMinutes() + 30); // 30 min buffer for preparation
          
          if (slotDate <= bufferTime) {
            disabled = true;
            reason = "Horario pasado";
          }
        }

        if (!disabled) {
          let laneAvailable = false;

          for (const lane of lanesToUse) {
            // Check if lane is blocked
            if (lane.blocked_until) {
              const blockedUntil = new Date(lane.blocked_until);
              if (slotDate < blockedUntil) {
                continue;
              }
            }

            const laneCapacity = lane.capacity || 1;
            
            // Check if there's a conflict with existing bookings
            // A conflict exists if the new booking overlaps with any existing booking
            const conflictingBookings = bookingsForDay.filter((booking) => {
              if (booking.lane_id !== lane.id) return false;
              
              const bookingStart = new Date(booking.booking_datetime);
              const bookingEnd = new Date(bookingStart);
              bookingEnd.setMinutes(bookingEnd.getMinutes() + (booking.duration_minutes || 60));
              
              // Check if there's overlap:
              // New slot starts before existing ends AND new slot ends after existing starts
              const hasOverlap = slotDate < bookingEnd && slotEndDate > bookingStart;
              
              return hasOverlap;
            });

            if (conflictingBookings.length < laneCapacity) {
              laneAvailable = true;
              break;
            }
          }

          if (!laneAvailable) {
            disabled = true;
            reason = "Sin disponibilidad";
          }
        }

        return { time, disabled, reason };
      });

      if (isActive) {
        setAvailableTimeSlots(options);
      }
    };

    computeAvailability();

    return () => {
      isActive = false;
    };
  }, [
    formData.center,
    formData.date,
    selection?.id,
    selection?.kind,
    lanes,
    services,
    timeSlots,
    getTreatmentGroupByService,
  ]);

  useEffect(() => {
    if (!formData.time) return;
    const selectedSlot = availableTimeSlots.find(
      (slot) => slot.time === formData.time
    );
    if (!selectedSlot || selectedSlot.disabled) {
      setFormData((prev) => ({ ...prev, time: "" }));
    }
  }, [availableTimeSlots, formData.time]);

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

      // Asignación inteligente de carril basada en configuración del servicio o grupo
      const availableLanes = lanes.filter(l => l.center_id === formData.center && l.active);
      const availableEmployees = employees.filter(e => e.center_id === formData.center && e.active);
      
      let assignedLaneId = null;
      let noAvailabilityInAssignedLanes = false;
      
      if (service_id && selection?.kind === 'service') {
        // First priority: Check if the service itself has assigned lanes
        const selectedService = services.find(s => s.id === service_id);
        
        if (selectedService?.lane_ids && selectedService.lane_ids.length > 0) {
          console.log(`🎯 Servicio "${selectedService.name}" tiene carriles asignados:`, selectedService.lane_ids);

          const laneIdsInThisCenter = selectedService.lane_ids.filter(id => availableLanes.some(l => l.id === id));

          // Check availability only among lanes that belong to the selected center
          for (const laneId of laneIdsInThisCenter) {
            const lane = availableLanes.find(l => l.id === laneId);
            if (!lane) continue;

            const { data: existingBookings } = await supabase
              .from('bookings')
              .select('*')
              .eq('lane_id', laneId)
              .eq('booking_datetime', bookingDate.toISOString())
              .neq('status', 'cancelled');

            const laneCapacity = lane.capacity || 1;
            if (!existingBookings || existingBookings.length < laneCapacity) {
              assignedLaneId = laneId;
              console.log(`✅ Servicio asignado al carril específico: ${lane.name}`);
              break;
            } else {
              console.log(`❌ Carril específico ocupado: ${lane?.name}`);
            }
          }

          // Only mark as no availability if there were specific lanes in this center and none were available
          if (!assignedLaneId && laneIdsInThisCenter.length > 0) {
            noAvailabilityInAssignedLanes = true;
            console.log(`❌ Sin disponibilidad en carriles específicos del servicio en este centro`);
          }
        } else {
          // Second priority: Check treatment group configuration
          const serviceGroup = getTreatmentGroupByService(service_id, services);
          if (serviceGroup?.lane_ids && serviceGroup.lane_ids.length > 0) {
            console.log(`🎭 Grupo "${serviceGroup.name}" tiene carriles asignados:`, serviceGroup.lane_ids);
            
            const groupLaneIdsInThisCenter = serviceGroup.lane_ids.filter(id => availableLanes.some(l => l.id === id));

            for (const laneId of groupLaneIdsInThisCenter) {
              const lane = availableLanes.find(l => l.id === laneId);
              if (!lane) continue;

              const { data: existingBookings } = await supabase
                .from('bookings')
                .select('*')
                .eq('lane_id', laneId)
                .eq('booking_datetime', bookingDate.toISOString())
                .neq('status', 'cancelled');

              const laneCapacity = lane.capacity || 1;
              if (!existingBookings || existingBookings.length < laneCapacity) {
                assignedLaneId = laneId;
                console.log(`✅ Servicio asignado al carril del grupo "${serviceGroup.name}": ${lane.name}`);
                break;
              } else {
                console.log(`❌ Carril del grupo ocupado: ${lane?.name}`);
              }
            }

            if (!assignedLaneId && groupLaneIdsInThisCenter.length > 0) {
              noAvailabilityInAssignedLanes = true;
              console.log(`❌ Sin disponibilidad en carriles del grupo en este centro`);
            }
          }
        }
      }
      
      // If specific lanes are assigned but none are available, show error
      if (noAvailabilityInAssignedLanes) {
        toast({
          title: "Sin disponibilidad",
          description: "No hay carriles disponibles para este servicio en el horario seleccionado. Por favor, elige otra hora.",
          variant: "destructive",
        });
        return;
      }
      
      // Fallback only if no specific lanes were configured
      if (!assignedLaneId) {
        const randomLane = availableLanes.length > 0 ? availableLanes[Math.floor(Math.random() * availableLanes.length)] : null;
        assignedLaneId = randomLane?.id || null;
        console.log('🎲 Asignación aleatoria de carril (no hay configuración específica)');
      }
      
      const randomEmployee = availableEmployees.length > 0 ? availableEmployees[Math.floor(Math.random() * availableEmployees.length)] : null;

      const bookingData = {
        client_id: profileToUse?.id,
        service_id,
        center_id: formData.center,
        lane_id: assignedLaneId,
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
      {/* Eliminado overlay manual: AppModal gestiona overlay y cierre */}
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
                                  {center.address && (
                                    <p className="text-xs text-muted-foreground">{center.address}</p>
                                  )}
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
                    useDropdown={false}
                  />
                </div>
              )}

              {/* Date and Time Selection */}
              {formData.center && selection && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-medium flex items-center space-x-2 text-sm sm:text-base">
                    <Clock className="h-4 w-4" />
                    <span>{t('date')} / {t('time')}</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                     {/* Date picker */}
                     <div>
                       <Label className="text-sm">{t('date')} *</Label>
                       <DatePickerModal
                         open={showCalendar}
                         onOpenChange={setShowCalendar}
                         selected={formData.date}
                         onSelect={(date) => setFormData({ ...formData, date })}
                         disabled={(date) => date < new Date()}
                         placeholder={t('select_date')}
                       />
                     </div>

                     {/* Time picker */}
                     <div>
                       <Label className="text-sm">{t('time')} *</Label>
                       <TimePickerModal
                         open={showTimeDropdown}
                         onOpenChange={setShowTimeDropdown}
                         selected={formData.time}
                         onSelect={(time) => setFormData({ ...formData, time })}
                         timeSlots={availableTimeSlots}
                         placeholder={t('select_time')}
                       />
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
