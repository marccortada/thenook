import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileCalendarView from '@/components/MobileCalendarView';
import { Button } from '@/components/ui/button';
import AppModal from '@/components/ui/app-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Save,
  X,
  Check,
  CheckCircle2,
  Ban,
  Trash2,
  Move,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, startOfDay, addMinutes, isSameDay, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

import { useBookings, useCenters, useLanes, useServices } from '@/hooks/useDatabase';
import type { Center } from '@/hooks/useDatabase';
import { useTreatmentGroups } from '@/hooks/useTreatmentGroups';
import { useClients } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import { useTranslation, translateServiceName } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import RepeatClientSelector from './RepeatClientSelector';
import { useLaneBlocks, type LaneBlock } from '@/hooks/useLaneBlocks';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { useInternalCodes } from '@/hooks/useInternalCodes';
import ServiceSelectorGrouped from "@/components/ServiceSelectorGrouped";

interface TimeSlot {
  time: Date;
  hour: string;
}

interface BookingFormData {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  centerId: string;
  laneId: string;
  serviceId: string;
  date: Date;
  timeSlot: Date;
  notes: string;
  isWalkIn?: boolean;
  saveAsClient?: boolean;
}

interface Booking {
  id: string;
  booking_datetime: string;
  duration_minutes: number;
  total_price_cents: number;
  status: string;
  payment_status: string;
  notes?: string;
  booking_codes?: string[];
  client_id?: string;
  service_id?: string;
  center_id?: string;
  lane_id?: string;
  services?: { name: string };
  centers?: { name: string };
  profiles?: { 
    id: string;
    first_name: string; 
    last_name: string; 
    email: string; 
    phone: string;
  };
}

type PreparedBooking = Booking & { _start: Date; _end: Date };

const BLOCK_SLOT_MINUTES = 5;
const BLOCK_SLOT_MS = BLOCK_SLOT_MINUTES * 60 * 1000;
const SLOT_PIXEL_HEIGHT = 24; // Matches Tailwind h-6 used for each slot cell

const isSameSlotStart = (slotTime: Date, blockStart: Date) =>
  Math.abs(slotTime.getTime() - blockStart.getTime()) < BLOCK_SLOT_MS / 2;

const getBlockSlotSpan = (block: LaneBlock): number => {
  const start = new Date(block.start_datetime);
  const end = new Date(block.end_datetime);
  const durationMs = Math.max(BLOCK_SLOT_MS, end.getTime() - start.getTime());
  return Math.max(1, Math.ceil(durationMs / BLOCK_SLOT_MS));
};

const computeFriendlyLabel = (center: Center): string => {
  const name = center.name?.toLowerCase() || '';
  const address = center.address?.toLowerCase() || '';
  const combined = `${name} ${address}`;

  if (
    combined.includes('zurbar') ||
    combined.includes('28010')
  ) {
    return 'Zurbarán';
  }

  if (
    combined.includes('concha') ||
    combined.includes('espina') ||
    combined.includes('principe de vergara') ||
    combined.includes('príncipe de vergara') ||
    combined.includes('vergara') ||
    combined.includes('28002')
  ) {
    return 'Concha Espina';
  }

  return center.name?.split('-').pop()?.trim() || center.name || center.address || 'Centro';
};

const normalizeLabel = (label?: string) =>
  (label ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const AdvancedCalendarView = () => {
  // Removed console.log for performance
  const { toast } = useToast();
  const { isAdmin, isEmployee } = useSimpleAuth();
  const isMobile = useIsMobile();
  const { language, t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ centerId: string; laneId: string; timeSlot: Date } | null>(null);
  
  // Lane blocking / move state
  const [blockingMode, setBlockingMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [blockStartSlot, setBlockStartSlot] = useState<{ laneId: string; timeSlot: Date } | null>(null);
  const [blockEndSlot, setBlockEndSlot] = useState<{ laneId: string; timeSlot: Date } | null>(null);
  
  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ centerId: string; laneId: string; timeSlot: Date } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ centerId: string; laneId: string; timeSlot: Date } | null>(null);
  const [dragMode, setDragMode] = useState<'booking' | 'block'>('booking'); // Modo de arrastre
  const isDraggingRef = useRef(false); // Para detectar si hubo arrastre y evitar onClick

  const [createClientId, setCreateClientId] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund'>('pending');
  const [editBookingStatus, setEditBookingStatus] = useState<'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'requested' | 'new' | 'online'>('pending');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editServiceId, setEditServiceId] = useState<string>('');
  const [editDuration, setEditDuration] = useState<number>(60);
  const [editTime, setEditTime] = useState<Date>(new Date());
  const [editBookingCodes, setEditBookingCodes] = useState<string[]>([]);
  // Control de edición manual del estado de pago (deshabilitado por defecto)
  const [paymentEditUnlocked, setPaymentEditUnlocked] = useState(false);
  const [showPaymentConfirm1, setShowPaymentConfirm1] = useState(false);
  const [showPaymentConfirm2, setShowPaymentConfirm2] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [captureAmountInput, setCaptureAmountInput] = useState<string>('');
  const [penaltyPercentage, setPenaltyPercentage] = useState<number>(100);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [restoringPaymentMethod, setRestoringPaymentMethod] = useState(false);
  
  // Form state
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    centerId: '',
    laneId: '',
    serviceId: '',
    date: new Date(),
    timeSlot: new Date(),
    notes: ''
  });

  // Canje en flujo de reserva
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemAmountEUR, setRedeemAmountEUR] = useState<number | undefined>(undefined);
  const [redeemNotes, setRedeemNotes] = useState('');
  const [redeemOnCreate, setRedeemOnCreate] = useState(false);

  const { bookings, loading: bookingsLoading, refetch: refetchBookings, silentRefetch, setBookings } = useBookings();
  
  // Removed debug console.logs for performance
  const { centers } = useCenters();
  const { lanes, refetch: refetchLanes } = useLanes();
  const { services } = useServices();
  const { updateClient } = useClients();
  const { laneBlocks, createLaneBlock, deleteLaneBlock, updateLaneBlock, isLaneBlocked } = useLaneBlocks();
  const { treatmentGroups, updateTreatmentGroup, fetchTreatmentGroups } = useTreatmentGroups();
  const { codes, assignments, getAssignmentsByEntity } = useInternalCodes();
  const centerLaneMap = useMemo(() => {
    const map = new Map<string, any[]>();
    lanes
      .filter((lane) => lane.active)
      .forEach((lane) => {
        const list = map.get(lane.center_id) || [];
        list.push(lane);
        map.set(lane.center_id, list);
      });
    map.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
    return map;
  }, [lanes]);
  const bookingsByCenterDate = useMemo(() => {
    const map = new Map<string, PreparedBooking[]>();
    bookings.forEach((booking) => {
      if (!booking.booking_datetime || !booking.center_id) return;
      try {
        const start = parseISO(booking.booking_datetime);
        const end = addMinutes(start, booking.duration_minutes || 60);
        const key = `${booking.center_id}|${format(start, 'yyyy-MM-dd')}`;
        const list = map.get(key) || [];
        list.push({ ...booking, _start: start, _end: end });
        map.set(key, list);
      } catch (error) {
        console.error('Error parsing booking for cache', booking.id, error);
      }
    });
    map.forEach((list) => list.sort((a, b) => a._start.getTime() - b._start.getTime()));
    return map;
  }, [bookings]);

  const friendlyCenterNames = React.useMemo(() => {
    const entries = centers.map((center) => ({
      id: center.id,
      label: computeFriendlyLabel(center),
    }));

    if (entries.length === 2) {
      const [first, second] = entries;
      if (normalizeLabel(first.label) === normalizeLabel(second.label)) {
        first.label = 'Zurbarán';
        second.label = 'Concha Espina';
      }
    }

    const map = new Map<string, string>();
    entries.forEach(({ id, label }) => map.set(id, label));
    return map;
  }, [centers]);

  const getFriendlyCenterName = React.useCallback(
    (center?: Center | null) => {
      if (!center) return 'Centro';
      return friendlyCenterNames.get(center.id) ?? computeFriendlyLabel(center);
    },
    [friendlyCenterNames]
  );


  // Function to get color for a lane based on its assigned treatment group (DEPRECATED - USE getServiceLaneColor instead)
  const getLaneColor = (laneId: string, centerId: string) => {
    // This function should no longer be used - use getServiceLaneColor with actual service data
    return '#3B82F6'; // Default blue
  };

  // Si la reserva seleccionada no tiene tarjeta, intenta restaurar una guardada del cliente
  useEffect(() => {
    const restorePaymentMethod = async () => {
      if (!editingBooking || editingBooking.stripe_payment_method_id) return;
      if (!editingBooking.client_id) return;
      setRestoringPaymentMethod(true);
      try {
        // Prefer RPC (SQL func); fallback to Edge if RPC not present
        let paymentMethodId: string | null | undefined;
        let customerId: string | null | undefined;

        try {
          const { data, error } = await supabase.rpc('get_latest_payment_method', {
            p_booking_id: editingBooking.id,
          });
          if (error) throw error;
          paymentMethodId = (data as any)?.payment_method_id as string | null | undefined;
          customerId = (data as any)?.customer_id as string | null | undefined;
        } catch (rpcErr) {
          console.warn('RPC get_latest_payment_method falló, probando Edge', rpcErr);
          const { data, error } = await supabase.functions.invoke('get-latest-payment-method', {
            body: { booking_id: editingBooking.id },
          });
          if (error) throw error;
          paymentMethodId = (data as any)?.payment_method_id as string | null | undefined;
          customerId = (data as any)?.customer_id as string | null | undefined;
        }

        if (paymentMethodId) {
          setEditingBooking((prev) =>
            prev
              ? {
                  ...prev,
                  stripe_payment_method_id: paymentMethodId,
                  stripe_customer_id: customerId || prev.stripe_customer_id,
                  payment_method_status: 'succeeded',
                }
              : prev
          );
          setBookings((prev) =>
            prev.map((b) =>
              b.id === editingBooking.id
                ? {
                    ...b,
                    stripe_payment_method_id: paymentMethodId,
                    stripe_customer_id: customerId || b.stripe_customer_id,
                    payment_method_status: 'succeeded',
                  }
                : b
            )
          );
        }
      } catch (restoreErr) {
        console.warn('No se pudo restaurar la tarjeta de la reserva', restoreErr);
      } finally {
        setRestoringPaymentMethod(false);
      }
    };
    restorePaymentMethod();
  }, [editingBooking, setBookings]);

  // Iconos por carril: colores según especificación del cliente
  // Carriles 1 y 2: verde
  // Carril 3: dos colores (teal y rojo)
  // Carril 4: dos colores (morado y rosa)
  const getLaneIconColors = (laneIndex: number): string[] => {
    switch (laneIndex) {
      case 0:
      case 1:
        return ['#22C55E']; // verde
      case 2:
        return ['#14B8A6', '#EF4444']; // teal y rojo
      case 3:
        return ['#6366F1', '#EC4899']; // morado y rosa
      default:
        return ['#64748B'];
    }
  };

  const LaneIcons = ({ index }: { index: number }) => {
    const colors = getLaneIconColors(index);
    return (
      <span className="inline-flex items-center gap-1">
        {colors.map((c, i) => (
          <span
            key={i}
            aria-hidden
            style={{ backgroundColor: c, boxShadow: '0 0 0 2px #fff' }}
            className="inline-block h-3.5 w-3.5 rounded-full border border-gray-200"
          />
        ))}
      </span>
    );
  };

  // Function to get lane assignment based on service treatment group
  const getLaneForService = (serviceId: string, centerId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service || !service.group_id) return null;

    const centerLanes = lanes.filter(l => l.center_id === centerId && l.active);
    const serviceGroup = treatmentGroups.find(tg => tg.id === service.group_id);
    
    if (!serviceGroup) return centerLanes[0] || null;

    // Map service groups to lane positions
    let laneIndex = 0;
    if (serviceGroup.name?.includes('Masajes') && !serviceGroup.name?.includes('Cuatro Manos')) {
      laneIndex = 0; // Carril 1 - Masajes (Azul)
    } else if (serviceGroup.name?.includes('Tratamientos')) {
      laneIndex = 1; // Carril 2 - Tratamientos (Verde)
    } else if (serviceGroup.name?.includes('Rituales')) {
      laneIndex = 2; // Carril 3 - Rituales (Lila)
    } else if (serviceGroup.name?.includes('Cuatro Manos')) {
      laneIndex = 3; // Carril 4 - Masajes a Cuatro Manos (Amarillo)
    }
    
    return centerLanes[laneIndex] || centerLanes[0];
  };

  const toggleLaneAllowedGroup = async (laneId: string, groupId: string, checked: boolean) => {
    const lane = lanes.find(l => l.id === laneId);
    if (!lane) {
      console.error('Lane not found:', laneId);
      return;
    }

    try {
      // 1. Actualizar allowed_group_ids del carril
      const currentLaneGroups: string[] = ((lane as any).allowed_group_ids || []) as string[];
      const updatedLaneGroups = checked 
        ? Array.from(new Set([...currentLaneGroups, groupId])) 
        : currentLaneGroups.filter(id => id !== groupId);
      
      console.log('Updating lane allowed_group_ids:', { laneId, updatedLaneGroups });
      // Asegurarse de que el array esté en el formato correcto para PostgreSQL UUID[]
      // Si está vacío, usar array vacío explícito, si no, enviar el array de UUIDs
      const updatePayload: any = {
        allowed_group_ids: updatedLaneGroups.length > 0 ? updatedLaneGroups : []
      };
      
      const { error: laneError } = await (supabase as any)
        .from('lanes')
        .update(updatePayload)
        .eq('id', laneId);
      
      if (laneError) {
        console.error('Error updating lane:', laneError);
        console.error('Lane update data:', { laneId, updatedLaneGroups });
        // Mostrar el error completo al usuario
        toast({
          title: 'Error al actualizar carril',
          description: laneError.message || 'No se pudo actualizar la configuración del carril. Verifica los permisos.',
          variant: 'destructive'
        });
        throw laneError;
      }

      // 2. Actualizar lane_ids del grupo de tratamiento (sincronización bidireccional)
      const group = treatmentGroups.find((g: any) => g.id === groupId);
      if (group && updateTreatmentGroup) {
        const currentGroupLanes: string[] = (group.lane_ids || []) as string[];
        const updatedGroupLanes = checked
          ? Array.from(new Set([...currentGroupLanes, laneId]))
          : currentGroupLanes.filter(id => id !== laneId);
        
        console.log('Updating group lane_ids:', { groupId, updatedGroupLanes });
        await updateTreatmentGroup(groupId, {
          lane_ids: updatedGroupLanes,
          name: group.name,
          color: group.color,
          center_id: group.center_id
        });
      } else {
        console.warn('Group not found or updateTreatmentGroup not available:', { groupId, group, updateTreatmentGroup });
      }

      // 3. Refrescar datos
      if (refetchLanes) {
        await refetchLanes();
      }
      if (fetchTreatmentGroups) {
        await fetchTreatmentGroups();
      }

      toast({
        title: '✅ Actualizado',
        description: checked 
          ? 'Grupo asignado al carril correctamente' 
          : 'Grupo desasignado del carril',
      });
    } catch (error) {
      console.error('Error actualizando grupos permitidos del carril:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración',
        variant: 'destructive'
      });
    }
  };

  // Function to get lane color for a specific service (based on its treatment group)
  const getServiceLaneColor = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service || !service.group_id) {
      return '#3B82F6'; // Default blue if no service or group
    }

    const serviceGroup = treatmentGroups.find(tg => tg.id === service.group_id);
    if (!serviceGroup) {
      return '#3B82F6'; // Default blue if no group found
    }

    return serviceGroup.color || '#3B82F6'; // Use group color or default
  };

  // Real-time subscription for bookings
  useEffect(() => {
    const channel = supabase
      .channel('calendar-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Calendar: Booking change detected:', payload);
          // Refresco silencioso para evitar parpadeos de loading en el calendario
          silentRefetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [silentRefetch]);

  // Set initial center when centers load
  useEffect(() => {
    if (centers.length > 0 && !selectedCenter) {
      const firstCenter = centers[0].id;
      setSelectedCenter(firstCenter);
      console.log('🏢 Setting initial center:', firstCenter, centers[0].name);
    }
  }, [centers, selectedCenter]);

  // Sincronizar automáticamente allowed_group_ids de carriles con lane_ids de grupos
  useEffect(() => {
    if (!treatmentGroups.length || !lanes.length) return;

    const syncLaneGroups = async () => {
      const PREDEFINED_GROUP_NAMES = [
        'Masaje Individual',
        'Masaje para Dos',
        'Masaje a Cuatro Manos',
        'Rituales',
        'Rituales para Dos'
      ];

      // Filtrar solo grupos predefinidos válidos
      const validGroups = treatmentGroups.filter((g: any) => 
        PREDEFINED_GROUP_NAMES.includes(g.name)
      );

      // Crear un mapa de qué grupos deberían estar en cada carril
      const laneGroupMap: Record<string, Set<string>> = {};
      
      // Inicializar el mapa para todos los carriles
      lanes.forEach(lane => {
        laneGroupMap[lane.id] = new Set();
      });

      // Para cada grupo, agregar su ID a los carriles asignados
      for (const group of validGroups) {
        const groupId = group.id;
        const assignedLaneIds = (group.lane_ids || []) as string[];

        // Si el grupo tiene carriles asignados, agregar el grupo a esos carriles
        if (assignedLaneIds.length > 0) {
          for (const laneId of assignedLaneIds) {
            if (laneGroupMap[laneId]) {
              laneGroupMap[laneId].add(groupId);
            }
          }
        }
      }

      // Actualizar cada carril con los grupos que debería tener
      for (const lane of lanes) {
        const expectedGroups = Array.from(laneGroupMap[lane.id] || []);
        const currentAllowedGroups: string[] = ((lane as any).allowed_group_ids || []) as string[];
        
        // Solo actualizar si hay diferencias
        const currentSet = new Set(currentAllowedGroups);
        const expectedSet = new Set(expectedGroups);
        
        const needsUpdate = 
          expectedGroups.length !== currentAllowedGroups.length ||
          expectedGroups.some(id => !currentSet.has(id)) ||
          currentAllowedGroups.some(id => !expectedSet.has(id) && validGroups.some(g => g.id === id));

        if (needsUpdate) {
          try {
            // Mantener solo los grupos válidos predefinidos que están asignados
            const finalGroups = expectedGroups.length > 0 
              ? expectedGroups 
              : []; // Si no hay grupos asignados, dejar vacío (acepta todos)
            
            await (supabase as any)
              .from('lanes')
              .update({ allowed_group_ids: finalGroups })
              .eq('id', lane.id);
            
            console.log(`✅ Sincronizado: Carril ${lane.name} ahora permite grupos:`, finalGroups.map((id: string) => {
              const g = validGroups.find((gr: any) => gr.id === id);
              return g?.name || id;
            }).join(', ') || 'Todos (ninguno marcado)');
          } catch (error) {
            console.error(`Error sincronizando carril ${lane.name}:`, error);
          }
        }
      }
    };

    syncLaneGroups();
  }, [treatmentGroups, lanes]);

  // Reset drag state when dragging stops globally
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  // Check if a slot is in the drag selection
  const isSlotInDragSelection = (laneId: string, timeSlot: Date) => {
    if (!isDragging || !dragStart || !dragEnd || dragStart.laneId !== laneId) return false;
    
    const startTime = dragStart.timeSlot < dragEnd.timeSlot ? dragStart.timeSlot : dragEnd.timeSlot;
    const endTime = dragStart.timeSlot < dragEnd.timeSlot ? dragEnd.timeSlot : dragStart.timeSlot;
    
    return timeSlot >= startTime && timeSlot <= endTime;
  };

  // Generate time slots from 10:00 to 22:00 every 5 minutes
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const base = startOfDay(selectedDate);
    for (let hour = 10; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        if (hour === 22 && minute > 0) break; // Stop at 22:00 exactly
        const time = new Date(base);
        time.setHours(hour, minute, 0, 0);
        slots.push({
          time,
          hour: format(time, 'HH:mm')
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Time options for selects: every 5 minutes from 10:00 to 22:00
  const timeOptions5m = React.useMemo(() => {
    const opts: string[] = [];
    const base = startOfDay(selectedDate);
    const start = new Date(base); start.setHours(10, 0, 0, 0);
    const end = new Date(base); end.setHours(22, 0, 0, 0);
    const cur = new Date(start);
    while (cur <= end) {
      opts.push(format(cur, 'HH:mm'));
      cur.setMinutes(cur.getMinutes() + 5);
    }
    return opts;
  }, [selectedDate]);

  // Get dates for week view
  const getWeekDates = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Start on Monday
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  // Get lanes for selected center (show all active lanes for better view)
  const getCenterLanes = (centerId: string) => {
    return centerLaneMap.get(centerId) || [];
  };

  const getDayBookings = (centerId: string, date: Date) => {
    if (!centerId) return [];
    const key = `${centerId}|${format(date, 'yyyy-MM-dd')}`;
    return bookingsByCenterDate.get(key) || [];
  };

  // Check if a lane is at full capacity for a given slot (con +5 min de margen)
  const isLaneAtTimeFull = (centerId: string, laneId: string, timeSlot: Date) => {
    if (!centerId) return false;
    const lane = lanes.find(l => l.id === laneId);
    const capacity = (lane as any)?.capacity ?? 1;
    const dayBookings = getDayBookings(centerId, timeSlot);
    const count = dayBookings.filter(b => {
      if (b.lane_id !== laneId) return false;
      const end = addMinutes(b._end, 5);
      return timeSlot >= b._start && timeSlot < end; // overlaps that 5-min slot
    }).length;
    return count >= capacity;
  };

  // No permitir seleccionar horas pasadas del día actual
  const isPastSlot = (date: Date, slot: Date) => {
    const now = new Date();
    // Normalizar las fechas a medianoche para comparar solo el día
    const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Si la fecha es anterior a hoy, no es pasado (es una fecha pasada, pero no del día actual)
    if (dateMidnight < nowMidnight) return false;
    
    // Si la fecha es posterior a hoy, no es pasado
    if (dateMidnight > nowMidnight) return false;
    
    // Si es el mismo día, comparar la hora del slot con la hora actual
    return slot.getTime() < now.getTime();
  };

  // Get booking for specific slot - now with strict filtering by center
  const getBookingForSlot = (centerId: string, laneId: string, date: Date, timeSlot: Date) => {
    if (!centerId) return undefined;
    const dayBookings = getDayBookings(centerId, date);
    if (!dayBookings.length) return undefined;

    const centerLanes = getCenterLanes(centerId);

    return dayBookings.find((booking) => {
      if (timeSlot < booking._start || timeSlot >= booking._end) return false;

      if (booking.lane_id) {
        return booking.lane_id === laneId;
      }

      const service = services.find(s => s.id === booking.service_id);
      const serviceGroup = service?.group_id ? treatmentGroups.find(tg => tg.id === service.group_id) : null;
      let expectedLaneIndex = 0;
      if (serviceGroup?.name) {
        if (serviceGroup.name.includes('Masajes') && !serviceGroup.name.includes('Cuatro Manos')) {
          expectedLaneIndex = 0;
        } else if (serviceGroup.name.includes('Tratamientos')) {
          expectedLaneIndex = 1;
        } else if (serviceGroup.name.includes('Rituales')) {
          expectedLaneIndex = 2;
        } else if (serviceGroup.name.includes('Cuatro Manos')) {
          expectedLaneIndex = 3;
        }
      }

      const currentLaneIndex = centerLanes.findIndex(l => l.id === laneId);
      return currentLaneIndex === expectedLaneIndex;
    });
  };

  // Calculate availability for a time slot considering both bookings and blocks
  const getSlotAvailability = (centerId: string, date: Date, timeSlot: Date) => {
    const centerLanes = getCenterLanes(centerId);
    const totalLanes = centerLanes.length;
    
    // Count booked lanes for this time slot
    const bookedLanes = centerLanes.filter(lane => 
      getBookingForSlot(centerId, lane.id, date, timeSlot)
    ).length;
    
    // Count blocked lanes for this time slot
    const blockedLanes = centerLanes.filter(lane => 
      isLaneBlocked(lane.id, timeSlot)
    ).length;
    
    const availableLanes = totalLanes - bookedLanes - blockedLanes;
    
    return {
      total: totalLanes,
      booked: bookedLanes,
      blocked: blockedLanes,
      available: Math.max(0, availableLanes),
      isFullyBooked: availableLanes <= 0
    };
  };

  // Handle mouse down for drag start
  const handleSlotMouseDown = (centerId: string, laneId: string, date: Date, timeSlot: Date, event: React.MouseEvent) => {
    if (moveMode) {
      return;
    }

    event.preventDefault();
    
    const wantsBlockAction = blockingMode || event.shiftKey;
    const existingBooking = getBookingForSlot(centerId, laneId, date, timeSlot);

    if (wantsBlockAction) {
      if (existingBooking) {
        toast({
          title: 'No se puede bloquear',
          description: 'Esta franja ya tiene una reserva activa. Mueve o cancela la cita antes de bloquear.',
          variant: 'destructive'
        });
        return;
      }

      // Iniciar arrastre para bloqueo
      setIsDragging(true);
      isDraggingRef.current = false; // Resetear, se establecerá a true si hay movimiento
      setDragStart({ centerId, laneId, timeSlot });
      setDragEnd({ centerId, laneId, timeSlot });
      setDragMode('block');
      return;
    }

    if (existingBooking) {
      // Abrir modal de edición
      handleSlotClick(centerId, laneId, date, timeSlot);
      return;
    }

    // Iniciar drag selection para reservas
    setIsDragging(true);
    isDraggingRef.current = false; // Resetear, se establecerá a true si hay movimiento
    setDragStart({ centerId, laneId, timeSlot });
    setDragEnd({ centerId, laneId, timeSlot });
    setDragMode('booking');
  };

  // Handle mouse enter for drag
  const handleSlotMouseEnter = (centerId: string, laneId: string, date: Date, timeSlot: Date) => {
    if (moveMode) return;
    if (isDragging && dragStart && dragStart.laneId === laneId) {
      // Si el mouse se mueve a otra celda, es un arrastre
      if (dragStart.timeSlot.getTime() !== timeSlot.getTime()) {
        isDraggingRef.current = true;
      }
      setDragEnd({ centerId, laneId, timeSlot });
    }
  };

  // Handle mouse up for drag end
  const handleSlotMouseUp = (centerId: string, laneId: string, date: Date, timeSlot: Date) => {
    if (moveMode) return;
    if (!isDragging || !dragStart) return;
    
    const hadDragMovement = isDraggingRef.current;
    setIsDragging(false);
    
    // Si solo se hizo click sin arrastrar (mismo slot y sin movimiento)
    if (dragStart.timeSlot.getTime() === timeSlot.getTime() && !hadDragMovement) {
      if (dragMode === 'block') {
        // Click directo en modo bloqueo: crear bloqueo de 30 minutos automáticamente
        const blockEndTime = new Date(timeSlot);
        blockEndTime.setMinutes(blockEndTime.getMinutes() + 30);
        createLaneBlock(selectedCenter, laneId, timeSlot, blockEndTime, 'Bloqueo manual');
        setBlockStartSlot(null);
        setBlockEndSlot(null);
        if (blockingMode) {
          setBlockingMode(false);
        }
      } else {
        // Permitir que onClick maneje el clic simple para reservas
        // No llamamos handleSlotClick aquí para evitar doble ejecución
      }
      setDragStart(null);
      setDragEnd(null);
      isDraggingRef.current = false;
      return;
    }

    // Hubo arrastre - determinar rango de tiempo
    const startTime = dragStart.timeSlot < timeSlot ? dragStart.timeSlot : timeSlot;
    const endTime = dragStart.timeSlot < timeSlot ? timeSlot : dragStart.timeSlot;
    
    if (dragMode === 'block') {
      // Crear bloqueo por arrastre
      const blockEndTime = new Date(endTime);
      blockEndTime.setMinutes(blockEndTime.getMinutes() + 5); // Añadir 5 min para que sea un rango
      createLaneBlock(selectedCenter, laneId, startTime, blockEndTime, 'Bloqueo por arrastre');
      setBlockStartSlot(null);
      setBlockEndSlot(null);
      if (blockingMode) {
        setBlockingMode(false);
      }
    } else {
      // Crear reserva con duración calculada
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60) + 5; // +5 para incluir el slot final
      
      // Configurar formulario de reserva
      setSelectedSlot({ centerId, laneId, timeSlot: startTime });
      setBookingForm({
        ...bookingForm,
        centerId,
        laneId,
        date,
        timeSlot: startTime,
      });
      
      // Preseleccionar duración basada en el arrastre
      const suggestedService = services.find(s => 
        Math.abs((s.duration_minutes || 60) - durationMinutes) <= 10
      );
      if (suggestedService) {
        setBookingForm(prev => ({ ...prev, serviceId: suggestedService.id }));
      }
      
      setShowBookingModal(true);
    }
    
    setDragStart(null);
    setDragEnd(null);
    setDragMode('booking');
    isDraggingRef.current = false;
  };

  // Handle slot click
  const handleSlotClick = (centerId: string, laneId: string, date: Date, timeSlot: Date) => {
    // Si estamos en modo bloqueo
    if (blockingMode) {
      handleBlockingSlotClick(laneId, timeSlot);
      return;
    }

    if (moveMode) {
      return;
    }

    const existingBooking = getBookingForSlot(centerId, laneId, date, timeSlot);
    
    if (existingBooking) {
      setEditingBooking(existingBooking);
      setEditClientId(existingBooking.client_id || null);
      setEditNotes(existingBooking.notes || '');
      const safePaymentStatus = ['paid','failed','refunded','partial_refund'].includes((existingBooking.payment_status || '').toLowerCase())
        ? (existingBooking.payment_status as any)
        : 'pending';
      const safeBookingStatus = ['confirmed','cancelled','completed','requested','new','online','no_show'].includes((existingBooking.status || '').toLowerCase())
        ? existingBooking.status
        : 'pending';
      setEditPaymentStatus(safePaymentStatus);
      setEditBookingStatus(safeBookingStatus);
      setEditServiceId(existingBooking.service_id || '');
      setEditDuration(existingBooking.duration_minutes || 60);
      const dt = parseISO(existingBooking.booking_datetime);
      setEditTime(dt);
      setEditName(`${existingBooking.profiles?.first_name || ''} ${existingBooking.profiles?.last_name || ''}`.trim());
      setEditEmail(existingBooking.profiles?.email || '');
      setEditPhone(existingBooking.profiles?.phone || '');
      setEditBookingCodes(existingBooking.booking_codes || []);
      setPaymentEditUnlocked(false); // bloquear edición manual al abrir
      setShowEditModal(true);
      return;
    }

    // Open new booking modal
    setSelectedSlot({ centerId, laneId, timeSlot });
    setBookingForm({
      ...bookingForm,
      centerId,
      laneId,
      date,
      timeSlot,
    });
    setShowBookingModal(true);
  };

  // Handle blocking mode slot clicks
  const handleBlockingSlotClick = (laneId: string, timeSlot: Date) => {
    if (!blockStartSlot) {
      setBlockStartSlot({ laneId, timeSlot });
    } else if (blockStartSlot.laneId === laneId) {
      // Same lane, set end slot and create block
      const startTime = blockStartSlot.timeSlot < timeSlot ? blockStartSlot.timeSlot : timeSlot;
      const endTime = blockStartSlot.timeSlot < timeSlot ? timeSlot : blockStartSlot.timeSlot;
      
      // Add 30 minutes to end time to make it a proper time range
      const blockEndTime = new Date(endTime);
      blockEndTime.setMinutes(blockEndTime.getMinutes() + 30);
      
      createLaneBlock(selectedCenter, laneId, startTime, blockEndTime, 'Bloqueo manual');
      
      // Reset blocking mode
      setBlockingMode(false);
      setBlockStartSlot(null);
      setBlockEndSlot(null);
    } else {
      // Different lane, reset and start new selection
      setBlockStartSlot({ laneId, timeSlot });
    }
  };

  // Create booking
  const createBooking = async () => {
    try {
      if (!bookingForm.serviceId) {
        toast({ title: 'Error', description: 'Selecciona un servicio', variant: 'destructive' });
        return;
      }
      if (!bookingForm.isWalkIn && !createClientId && !bookingForm.clientEmail) {
        toast({ title: 'Error', description: 'Selecciona un cliente o introduce email', variant: 'destructive' });
        return;
      }
      // CRITICAL: Ensure center_id matches selected center
      if (!bookingForm.centerId || bookingForm.centerId !== selectedCenter) {
        console.error('❌ Center ID mismatch:', { 
          bookingFormCenterId: bookingForm.centerId, 
          selectedCenter 
        });
        toast({ 
          title: 'Error de centro', 
          description: 'El centro seleccionado no coincide. Por favor, intenta de nuevo.', 
          variant: 'destructive' 
        });
        return;
      }
      // If WALK IN without a name, use a sensible default so it can be saved
      const walkInName = bookingForm.isWalkIn ? (bookingForm.clientName?.trim() || 'Walk-in') : bookingForm.clientName;

      // Check availability before creating booking
      const availability = getSlotAvailability(bookingForm.centerId, bookingForm.date, bookingForm.timeSlot);
      if (availability.isFullyBooked) {
        toast({ 
          title: 'No disponible', 
          description: 'No hay carriles disponibles en esta hora. Selecciona otra hora.', 
          variant: 'destructive' 
        });
        return;
      }

      // Determine client profile
      let clientIdToUse: string | null = createClientId;
      
      // For walk-in bookings, decide if we need to create a client profile
      if (bookingForm.isWalkIn) {
        if (bookingForm.saveAsClient) {
          console.log('🏃‍♂️ Creando perfil de cliente para WALK IN:', {
            name: bookingForm.clientName,
            phone: bookingForm.clientPhone,
            email: bookingForm.clientEmail
          });
          
          // Create a new client profile for the walk-in
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .upsert([{
              first_name: bookingForm.clientName.split(' ')[0],
              last_name: bookingForm.clientName.split(' ').slice(1).join(' ') || '',
              phone: bookingForm.clientPhone || null,
              email: bookingForm.clientEmail || null,
              role: 'client'
            }], {
              onConflict: 'email'
            })
            .select('id')
            .single();
          
          if (profileError) {
            console.error('❌ Error al crear cliente WALK IN:', profileError);
            throw profileError;
          }
          
          console.log('✅ Cliente WALK IN creado exitosamente:', newProfile);
          clientIdToUse = (newProfile as any).id as string;
        } else {
          console.log('🚶‍♂️ WALK IN sin guardar como cliente:', bookingForm.clientName);
          // Walk-in without saving as client - no client profile needed
          clientIdToUse = null;
        }
      } else {
        // Regular booking logic - create/find client profile
        if (!clientIdToUse && bookingForm.clientEmail) {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', bookingForm.clientEmail)
            .maybeSingle();
          if (existingProfile) {
            clientIdToUse = existingProfile.id as string;
            await updateClient(existingProfile.id as string, {
              first_name: bookingForm.clientName.split(' ')[0],
              last_name: bookingForm.clientName.split(' ').slice(1).join(' '),
              phone: bookingForm.clientPhone,
              email: bookingForm.clientEmail,
            });
          } else {
            const { data: newProfile, error: profileError } = await supabase
              .from('profiles')
              .insert([{
                email: bookingForm.clientEmail,
                first_name: bookingForm.clientName.split(' ')[0],
                last_name: bookingForm.clientName.split(' ').slice(1).join(' '),
                phone: bookingForm.clientPhone,
                role: 'client'
              }])
              .select('id')
              .single();
            if (profileError) throw profileError;
            clientIdToUse = (newProfile as any).id as string;
          }
        }
      }

      // Get service details
      const selectedService = services.find(s => s.id === bookingForm.serviceId);
      if (!selectedService) throw new Error('Servicio no encontrado');

      // Use the specific lane and time slot that the user clicked on
      let assignedLaneId = bookingForm.laneId;
      
      // Only auto-assign lane if no specific lane was selected (shouldn't happen with slot clicks)
      if (!assignedLaneId) {
        const recommendedLane = getLaneForService(bookingForm.serviceId, bookingForm.centerId);
        if (recommendedLane) {
          assignedLaneId = recommendedLane.id;
          console.log('Auto-assigned lane for service (no specific slot):', { serviceId: bookingForm.serviceId, laneId: assignedLaneId, laneName: recommendedLane.name });
        }
      } else {
        console.log('Using user-selected lane from slot click:', { laneId: assignedLaneId, timeSlot: bookingForm.timeSlot });
      }

      // Create booking datetime
      const bookingDateTime = new Date(bookingForm.date);
      const timeSlotHours = bookingForm.timeSlot.getHours();
      const timeSlotMinutes = bookingForm.timeSlot.getMinutes();
      bookingDateTime.setHours(timeSlotHours, timeSlotMinutes, 0, 0);

      // 1) Validación de compatibilidad servicio ↔ carril
      const clickedLane = lanes.find(l => l.id === assignedLaneId);
      const laneAllowedGroups: string[] = ((clickedLane as any)?.allowed_group_ids || []) as string[];
      const isLaneExplicitlyConfigured = laneAllowedGroups && laneAllowedGroups.length > 0;
      if (selectedService.group_id && isLaneExplicitlyConfigured && !laneAllowedGroups.includes(selectedService.group_id)) {
        console.warn('⚠️ Servicio asignado a un carril fuera de la configuración permitida. Se respetará la elección manual.', {
          service: selectedService.name,
          lane: clickedLane?.name,
          allowedGroups: laneAllowedGroups
        });
      }

      // 2) Validación de capacidad/ocupación del carril en el rango
      const durationMinutes = selectedService.duration_minutes || 60;
      const bookingEndTime = addMinutes(bookingDateTime, durationMinutes + 5);
      const laneCapacity = (clickedLane as any)?.capacity ?? 1;
      const overlappingOnLane = bookings.filter(b =>
        b.center_id === bookingForm.centerId &&
        b.lane_id === assignedLaneId &&
        b.booking_datetime &&
        // solape temporal
        ((parseISO(b.booking_datetime) < bookingEndTime) && (addMinutes(parseISO(b.booking_datetime), b.duration_minutes || 60) > bookingDateTime))
      ).length;
      if (overlappingOnLane >= laneCapacity) {
        toast({ title: 'Carril ocupado', description: 'Este carril ya está reservado en ese horario.', variant: 'destructive' });
        return;
      }

      // 3) Evitar doble reserva del mismo cliente en el mismo rango
      if (createClientId) {
        const overlappingForClient = bookings.some(b =>
          b.client_id === createClientId &&
          b.booking_datetime &&
          ((parseISO(b.booking_datetime) < bookingEndTime) && (addMinutes(parseISO(b.booking_datetime), b.duration_minutes || 60) > bookingDateTime))
        );
        if (overlappingForClient) {
          toast({ title: 'Cliente ya tiene cita', description: 'El cliente ya tiene una reserva que solapa en ese horario.', variant: 'destructive' });
          return;
        }
      }

      // Reutilizar la última tarjeta guardada del cliente (evita pedirla en cada reserva)
      let inheritedPaymentMethod: string | null = null;
      let inheritedCustomerId: string | null = null;
      if (clientIdToUse) {
        try {
          const { data: lastPm } = await supabase
            .from('bookings')
            .select('stripe_payment_method_id, stripe_customer_id, payment_method_status, updated_at, created_at')
            .eq('client_id', clientIdToUse)
            .not('stripe_payment_method_id', 'is', null)
            .order('updated_at', { ascending: false, nullsLast: true })
            .order('created_at', { ascending: false, nullsLast: true })
            .limit(1)
            .maybeSingle();
          if (lastPm?.stripe_payment_method_id && (lastPm as any).payment_method_status === 'succeeded') {
            inheritedPaymentMethod = lastPm.stripe_payment_method_id as string;
            inheritedCustomerId = (lastPm as any).stripe_customer_id || null;
          }
        } catch (pmErr) {
          console.warn('No se pudo recuperar la tarjeta guardada del cliente', pmErr);
        }
      }

      const bookingPayload: any = {
        client_id: clientIdToUse,
        service_id: bookingForm.serviceId,
        center_id: bookingForm.centerId,
        lane_id: assignedLaneId,
        booking_datetime: bookingDateTime.toISOString(),
        duration_minutes: selectedService.duration_minutes,
        total_price_cents: selectedService.price_cents,
        status: 'pending' as const,
        channel: 'web' as const,
        notes: bookingForm.notes || null,
        payment_status: 'pending' as const,
      };
      if (inheritedPaymentMethod) {
        bookingPayload.stripe_payment_method_id = inheritedPaymentMethod;
        bookingPayload.payment_method_status = 'succeeded';
      }
      if (inheritedCustomerId) {
        bookingPayload.stripe_customer_id = inheritedCustomerId;
      }

      const { data: created, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingPayload)
        .select('id')
        .single();

      if (bookingError) throw bookingError;

      // Canjear código si procede
      if (redeemOnCreate && redeemCode) {
        try {
          const amountCents = redeemAmountEUR && redeemAmountEUR > 0 ? Math.round(redeemAmountEUR * 100) : null;
          const { data: redeemData, error: redeemError } = await (supabase as any).rpc('redeem_voucher_code', {
            p_code: redeemCode.trim(),
            p_booking_id: created?.id || null,
            p_amount_cents: amountCents,
            p_notes: redeemNotes || null,
          });
          if (redeemError) throw redeemError;
          toast({ title: '🎫 Canje aplicado', description: 'Se aplicó el bono/tarjeta a la reserva.' });

          if (redeemData?.kind === 'package' && redeemData?.client_package_id) {
            try {
              await supabase.functions.invoke('send-voucher-remaining', {
                body: { client_package_id: redeemData.client_package_id },
              });
            } catch (notifyErr) {
              console.warn('No se pudo enviar email de saldo del bono:', notifyErr);
            }
          }
        } catch (e: any) {
          toast({ title: 'Canje no aplicado', description: e.message || 'Revisa el código o el importe', variant: 'destructive' });
        }
      }

      const successMessage = bookingForm.isWalkIn 
        ? (bookingForm.saveAsClient 
            ? `✅ Reserva WALK IN creada y cliente ${walkInName} guardado para futuras visitas`
            : `✅ Reserva WALK IN creada${walkInName ? ` para ${walkInName}` : ''}`)
        : '✅ Reserva Creada';
      
      toast({ title: successMessage, description: 'Reserva creada correctamente.' });

      setShowBookingModal(false);
      setSelectedSlot(null);
      setCreateClientId(null);
      setRedeemCode('');
      setRedeemAmountEUR(undefined);
      setRedeemNotes('');
      setRedeemOnCreate(false);
      setBookingForm({
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        centerId: '',
        laneId: '',
        serviceId: '',
        date: new Date(),
        timeSlot: new Date(),
        notes: ''
      });

      await refetchBookings();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({ title: 'Error', description: 'No se pudo crear la reserva.', variant: 'destructive' });
    }
  };

  // Move booking to new slot
  const moveBooking = async (bookingId: string, newCenterId: string, newLaneId: string, newDate: Date, newTime: Date) => {
    try {
      // Create the exact datetime for the new position
      const newDateTime = new Date(newDate);
      newDateTime.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);

      console.log('📍 Moving booking:', {
        bookingId,
        from: bookings.find(b => b.id === bookingId)?.booking_datetime,
        to: newDateTime.toISOString(),
        lane: newLaneId
      });

      // Validar capacidad antes de mover
      const lane = lanes.find(l => l.id === newLaneId);
      const laneCapacity = (lane as any)?.capacity ?? 1;
      const newEnd = addMinutes(newDateTime, bookings.find(b=>b.id===bookingId)?.duration_minutes || 60);
      const overlappingOnLane = bookings.filter(b =>
        b.id !== bookingId && b.center_id === newCenterId && b.lane_id === newLaneId && b.booking_datetime &&
        (parseISO(b.booking_datetime) < newEnd) && (addMinutes(parseISO(b.booking_datetime), b.duration_minutes || 60) > newDateTime)
      ).length;
      if (overlappingOnLane >= laneCapacity) {
        toast({ title: 'Carril ocupado', description: 'No se puede mover: el carril está lleno en ese horario.', variant: 'destructive' });
        return;
      }

      // Actualización optimista en memoria: movemos la reserva en el estado local
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                center_id: newCenterId,
                lane_id: newLaneId,
                booking_datetime: newDateTime.toISOString(),
              }
            : b
        )
      );

      const { error } = await supabase
        .from('bookings')
        .update({
          center_id: newCenterId,
          lane_id: newLaneId,
          booking_datetime: newDateTime.toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({ title: 'Reserva movida', description: 'La reserva se ha movido correctamente.' });
    } catch (error) {
      console.error('Error moving booking:', error);
      // Si algo falla, recargamos desde servidor para no dejar el estado inconsistente
      await refetchBookings();
      toast({ title: 'Error', description: 'No se pudo mover la reserva.', variant: 'destructive' });
    }
  };

  // Move block to new slot
  const moveBlock = async (blockId: string, newCenterId: string, newLaneId: string, newDate: Date, newTime: Date) => {
    try {
      const block = laneBlocks.find(b => b.id === blockId);
      if (!block) {
        toast({ title: 'Error', description: 'Bloqueo no encontrado.', variant: 'destructive' });
        return;
      }

      // Calculate the duration of the original block
      const originalStart = parseISO(block.start_datetime);
      const originalEnd = parseISO(block.end_datetime);
      const durationMs = originalEnd.getTime() - originalStart.getTime();

      // Create the new start datetime
      const newStartDateTime = new Date(newDate);
      newStartDateTime.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);

      // Calculate the new end datetime maintaining the same duration
      const newEndDateTime = new Date(newStartDateTime.getTime() + durationMs);

      console.log('📍 Moving block:', {
        blockId,
        from: { start: block.start_datetime, end: block.end_datetime },
        to: { start: newStartDateTime.toISOString(), end: newEndDateTime.toISOString() },
        lane: newLaneId
      });

      await updateLaneBlock(blockId, newCenterId, newLaneId, newStartDateTime, newEndDateTime);
    } catch (error) {
      console.error('Error moving block:', error);
      toast({ title: 'Error', description: 'No se pudo mover el bloqueo.', variant: 'destructive' });
    }
  };


  // Edit existing booking
  const saveBookingEdits = async (
    overrides?: { paymentStatus?: typeof editPaymentStatus; bookingStatus?: typeof editBookingStatus },
    options?: { successMessage?: string; successDescription?: string }
  ) => {
    try {
      if (!editingBooking) return;

      // Update client profile if requested
      if (editClientId) {
        const [first, ...rest] = editName.trim().split(' ');
        await updateClient(editClientId, {
          first_name: first || undefined,
          last_name: rest.join(' ') || undefined,
          phone: editPhone || undefined,
          email: editEmail || undefined,
        });
      }

      // Build booking updates
      const baseDate = parseISO(editingBooking.booking_datetime);
      const newDateTime = new Date(baseDate);
      newDateTime.setHours(editTime.getHours(), editTime.getMinutes(), 0, 0);

      const paymentStatusToSave = overrides?.paymentStatus ?? editPaymentStatus;
      let bookingStatusToSave = overrides?.bookingStatus ?? editBookingStatus;

      // CRITICAL: Si el pago está marcado como 'paid', el estado NO puede ser 'pending'
      // Automáticamente cambiar a 'confirmed' (excepto si es 'no_show')
      if (paymentStatusToSave === 'paid' && bookingStatusToSave === 'pending') {
        // Si es no_show, mantener no_show. Si no, cambiar a confirmed
        if (editBookingStatus !== 'no_show' && editingBooking.status !== 'no_show') {
          bookingStatusToSave = 'confirmed';
          setEditBookingStatus('confirmed');
        }
      }

      // Validación: No permitir estados inconsistentes
      if (paymentStatusToSave === 'paid' && bookingStatusToSave === 'pending') {
        toast({ 
          title: 'Estado inconsistente', 
          description: 'No se puede tener una reserva pagada con estado pendiente. Se cambiará automáticamente a confirmada.', 
          variant: 'destructive' 
        });
        bookingStatusToSave = editBookingStatus === 'no_show' ? 'no_show' : 'confirmed';
        setEditBookingStatus(bookingStatusToSave);
      }

      if (editingBooking.payment_status === 'paid' && paymentStatusToSave === 'paid') {
        toast({ title: 'Pago ya registrado', description: 'Esta reserva ya fue marcada como cobrada.', variant: 'destructive' });
        return;
      }

      // No permitir confirmar si no hay tarjeta guardada
      const hasCard =
        !!editingBooking.stripe_payment_method_id ||
        paymentStatusToSave === 'paid'; // al cobrar con éxito, habrá tarjeta
      if (bookingStatusToSave === 'confirmed' && !hasCard) {
        if (restoringPaymentMethod) {
          toast({
            title: 'Esperando tarjeta',
            description: 'Estamos recuperando la tarjeta del cliente. Intenta confirmar de nuevo en unos segundos.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Falta tarjeta',
            description: 'No puedes confirmar la reserva sin una tarjeta guardada o un cobro realizado.',
            variant: 'destructive'
          });
        }
        return;
      }

      const updates: any = {
        notes: editNotes || null,
        status: bookingStatusToSave,
        service_id: editServiceId || editingBooking.service_id,
        duration_minutes: editDuration || editingBooking.duration_minutes,
        booking_datetime: newDateTime.toISOString(),
        booking_codes: editBookingCodes,
      };
      // Solo permitir cambiar el estado de pago si se ha desbloqueado manualmente
      // o si viene como override (por ejemplo, al pulsar "Cobrar").
      const allowPaymentUpdate = paymentEditUnlocked || overrides?.paymentStatus !== undefined;
      if (allowPaymentUpdate) {
        updates.payment_status = paymentStatusToSave;
        // Si se marca como pagado, automáticamente actualizar el estado de reserva
        if (paymentStatusToSave === 'paid' && bookingStatusToSave === 'pending') {
          updates.status = editBookingStatus === 'no_show' ? 'no_show' : 'confirmed';
        }
      }
      if (editClientId) updates.client_id = editClientId;

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', editingBooking.id);
      if (error) throw error;

      if (overrides?.paymentStatus) setEditPaymentStatus(overrides.paymentStatus);
      if (overrides?.bookingStatus) setEditBookingStatus(overrides.bookingStatus);

      toast({
        title: options?.successMessage ?? 'Reserva actualizada',
        description: options?.successDescription ?? 'Los cambios se han guardado correctamente.'
      });
      setShowEditModal(false);
      setEditingBooking(null);
      setPaymentEditUnlocked(false);
      await refetchBookings();
    } catch (err) {
      console.error('Error updating booking', err);
      toast({ title: 'Error', description: 'No se pudo actualizar la reserva.', variant: 'destructive' });
    }
  };

  const attemptChargeBooking = async (): Promise<boolean> => {
    if (!editingBooking) return false;
    if (!editingBooking.stripe_payment_method_id) {
      toast({
        title: 'Sin tarjeta guardada',
        description: 'Genera un enlace de pago o registra el cobro manualmente.',
        variant: 'destructive'
      });
        return false;
    }

    const amountCents = editingBooking.total_price_cents || 0;
    if (!amountCents || amountCents <= 0) {
      toast({
        title: 'Importe no válido',
        description: 'La reserva no tiene un importe válido para cobrar.',
        variant: 'destructive'
      });
      return false;
    }

    try {
      setPaymentLoading(true);
      // Skip email if this is a no_show booking
      const skipEmail = editBookingStatus === 'no_show' || editingBooking.status === 'no_show';
      const { data, error } = await (supabase as any).functions.invoke('charge-booking', {
        body: { 
          booking_id: editingBooking.id, 
          amount_cents: amountCents,
          skip_email: skipEmail
        }
      });

      const functionError = error?.message || data?.error;
      if (functionError || !data?.ok) {
        toast({
          title: 'Cobro no realizado',
          description: functionError || 'No se pudo procesar el cobro con la tarjeta guardada.',
          variant: 'destructive'
        });
        return false;
      }

      await saveBookingEdits(
        { paymentStatus: 'paid', bookingStatus: 'confirmed' },
        {
          successMessage: 'Pago registrado',
          successDescription: 'El cobro se ha capturado y la reserva se ha confirmado.'
        }
      );
      // Emails se envían desde backend con cobro exitoso; no disparar desde frontend
      return true;
    } catch (err) {
      console.error('Error charging booking:', err);
      toast({
        title: 'Cobro no realizado',
        description: err instanceof Error ? err.message : 'Error desconocido al procesar el cobro.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setPaymentLoading(false);
    }
  };

  const sendPaymentLinkFallback = async (amountOverrideCents?: number) => {
    if (!editingBooking) return;

    try {
      setPaymentLoading(true);
      const baseCents = typeof amountOverrideCents === 'number' && amountOverrideCents > 0
        ? Math.round(amountOverrideCents)
        : (editingBooking.total_price_cents || 0);
      const minCents = Math.max(50, baseCents);

      const { data, error } = await (supabase as any).functions.invoke('create-checkout', {
        body: { intent: 'booking_payment', booking_payment: { booking_id: editingBooking.id, amount_cents: minCents }, currency: 'eur' }
      });

      const checkoutUrl: string | null = data?.url || (data?.client_secret ? `https://checkout.stripe.com/c/pay/${data.client_secret}` : null);
      if (error || !checkoutUrl) throw new Error(error?.message || 'No se pudo generar el enlace de pago');

      const to = editingBooking.profiles?.email;
      if (to) {
        const message = `Hola,\n\nHemos generado un enlace de pago para tu cita en The Nook Madrid.\nImporte: ${(minCents / 100).toFixed(2)}€.\n\nPor favor completa el pago aquí: ${checkoutUrl}\n\nGracias.`;
        try {
          await (supabase as any).functions.invoke('send-email', {
            body: { to, subject: 'Enlace de pago de tu cita - The Nook Madrid', message }
          });
        } catch (mailErr) {
          console.warn('No se pudo enviar el email con el link de pago:', mailErr);
        }
      }

      // Only copy to clipboard if user explicitly requested it (for online payment method)
      // Don't copy automatically to avoid browser permission pop-ups
      // The link is sent via email, which is sufficient
      
      toast({
        title: 'Link de pago generado',
        description: to ? `Enlace de pago enviado a ${to}.` : 'Enlace de pago generado. Puedes enviarlo manualmente al cliente.'
      });

      setShowPaymentModal(false);
    } catch (err) {
      console.error('Error generating payment link', err);
      toast({
        title: 'No se pudo generar el link',
        description: err instanceof Error ? err.message : 'Error desconocido al generar el enlace de pago.',
        variant: 'destructive'
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Helper function to get desired charge amount (similar to BookingCardWithModal)
  const getDesiredChargeAmountCents = (overrideAmountCents?: number) => {
    if (typeof overrideAmountCents === 'number' && !Number.isNaN(overrideAmountCents)) {
      return Math.max(0, Math.round(overrideAmountCents));
    }
    
    // If no_show, use percentage if set
    if (editBookingStatus === 'no_show' && editingBooking?.total_price_cents) {
      const totalCents = editingBooking.total_price_cents;
      const percentageAmount = Math.round((totalCents * penaltyPercentage) / 100);
      if (percentageAmount > 0) {
        return percentageAmount;
      }
    }
    
    const input = captureAmountInput?.trim();
    if (input) {
      const parsed = parseFloat(input.replace(',', '.'));
      if (!Number.isNaN(parsed)) {
        return Math.max(0, Math.round(parsed * 100));
      }
    }
    // Use paymentAmount if set, otherwise use booking total
    if (paymentAmount > 0) {
      return Math.round(paymentAmount * 100);
    }
    return Math.max(0, editingBooking?.total_price_cents || 0);
  };

  const processManualPayment = async () => {
    setPaymentLoading(true);
    try {
      if (!editingBooking) {
        toast({ title: 'Error', description: 'No hay reserva seleccionada.', variant: 'destructive' });
        return;
      }
      
      if (!paymentMethod) {
        toast({ title: 'Selecciona forma de pago', description: 'Elige cómo se cobró la reserva.', variant: 'destructive' });
        return;
      }

      const desiredAmountCents = getDesiredChargeAmountCents();
      
      if (desiredAmountCents < 50) {
        toast({ title: 'Importe inválido', description: 'El mínimo es 0,50€', variant: 'destructive' });
        return;
      }

      // Don't allow online payment for no_show bookings
      if (paymentMethod === 'online') {
        if (editBookingStatus === 'no_show') {
          toast({ 
            title: 'Método no permitido', 
            description: 'Para reservas con No Show solo se permite cobro en efectivo o con tarjeta.', 
            variant: 'destructive' 
          });
          return;
        }
        await sendPaymentLinkFallback(desiredAmountCents);
        return;
      }

      // If staff selects tarjeta, try to charge saved card directly
      if (paymentMethod === 'tarjeta') {
        // Check if booking has reserva_id (for capture-payment) or use charge-booking
        if ((editingBooking as any).reserva_id) {
          // Use capture-payment for bookings with reserva_id (allows partial capture)
          const { data, error: fnErr } = await (supabase as any).functions.invoke('capture-payment', {
            body: { reserva_id: (editingBooking as any).reserva_id, amount_to_capture: desiredAmountCents }
          });
          if (fnErr || !data?.ok) {
            const reason = (fnErr as any)?.message || data?.error || 'No se pudo procesar el cobro con la tarjeta guardada.';
            toast({ 
              title: 'Cobro no realizado', 
              description: reason, 
              variant: 'destructive' 
            });
            return;
          }
        } else {
          // Use charge-booking for regular bookings
          // Skip email if this is a no_show booking
          const skipEmail = editBookingStatus === 'no_show';
          const { data, error: fnErr } = await (supabase as any).functions.invoke('charge-booking', {
            body: { 
              booking_id: editingBooking.id, 
              amount_cents: desiredAmountCents,
              skip_email: skipEmail
            }
          });
          if (fnErr || !data?.ok) {
            const reason = (fnErr as any)?.message || data?.error || 'No se pudo procesar el cobro con la tarjeta guardada.';
            toast({ 
              title: 'Cobro no realizado', 
              description: reason, 
              variant: 'destructive' 
            });
            return;
          }
        }
        // Mark as paid by card
        const updateData: any = { 
          payment_status: 'paid', 
          payment_method: 'tarjeta', 
          payment_notes: paymentNotes || 'Cobro automático Stripe' 
        };
        // CRITICAL: Si es no_show, mantener no_show. Si no, cambiar automáticamente a confirmed
        if (editBookingStatus === 'no_show' || editingBooking.status === 'no_show') {
          updateData.status = 'no_show';
        } else {
          // Si estaba pendiente, cambiar a confirmed cuando se marca como pagado
          updateData.status = editingBooking.status === 'pending' ? 'confirmed' : editingBooking.status;
        }
        const { error } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', editingBooking.id);
        if (error) throw error;
      } else {
        // Manual methods: efectivo/bizum/transferencia
        const updateData: any = {
          payment_status: 'paid',
          payment_method: paymentMethod,
          payment_notes: paymentNotes || null
        };
        // CRITICAL: Si es no_show, mantener no_show. Si no, cambiar automáticamente a confirmed
        // Nunca dejar como 'pending' si está pagado
        if (editBookingStatus === 'no_show' || editingBooking.status === 'no_show') {
          updateData.status = 'no_show';
        } else {
          // Si estaba pendiente o cualquier otro estado, cambiar a confirmed cuando se marca como pagado
          updateData.status = 'confirmed';
        }
        const { error } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', editingBooking.id);

        if (error) throw error;
      }

      toast({
        title: 'Pago registrado',
        description: `Se registró el cobro (${paymentMethod}).`
      });

      setShowPaymentModal(false);
      setShowEditModal(false);
      setEditingBooking(null);
      setPaymentMethod('');
      setPaymentNotes('');
      setPaymentAmount(0);
      setCaptureAmountInput('');
      setPenaltyPercentage(100);
      await refetchBookings();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo procesar el pago.',
        variant: 'destructive'
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const startPaymentFlow = async () => {
    if (!editingBooking) return;

    const defaultAmount = Number(((editingBooking.total_price_cents || 0) / 100).toFixed(2));
    setPaymentAmount(defaultAmount);
    setPaymentMethod('');
    setPaymentNotes('');

    const success = await attemptChargeBooking();
    if (!success) {
      setShowPaymentModal(true);
    }
  };

  // Delete booking completely
  const deleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);
      if (error) throw error;
      toast({ title: '✅ Reserva borrada', description: 'Se eliminó la reserva.' });
      setShowEditModal(false);
      setEditingBooking(null);
      await refetchBookings();
    } catch (err) {
      console.error('Error deleting booking', err);
      toast({ title: 'Error', description: 'No se pudo borrar la reserva.', variant: 'destructive' });
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 border-l-green-500 text-green-700';
      case 'pending': return 'bg-yellow-500/20 border-l-yellow-500 text-yellow-700';
      case 'cancelled': return 'bg-red-500/20 border-l-red-500 text-red-700';
      case 'completed': return 'bg-blue-500/20 border-l-blue-500 text-blue-700';
      default: return 'bg-gray-500/20 border-l-gray-500 text-gray-700';
    }
  };

  // Hex color by status (para inline styles)
  const getStatusHex = (status?: string) => {
    switch (status) {
      case 'confirmed': return '#10B981'; // green-500
      case 'pending': return '#F59E0B';   // amber-500
      case 'cancelled': return '#EF4444'; // red-500
      case 'completed': return '#3B82F6'; // blue-500
      case 'requested': return '#8B5CF6'; // violet-500
      case 'new': return '#06B6D4';      // cyan-500
      case 'online': return '#14B8A6';   // teal-500
      case 'no_show': return '#9CA3AF';  // gray-400
      default: return undefined;
    }
  };

  // Accent color for status borders (falls back to lane/service color)
  const getStatusAccent = (booking: Booking) =>
    getStatusHex(booking.status) || getServiceLaneColor(booking.service_id);

  // Navigation functions
  const goToPrevious = () => {
    if (viewMode === 'day') {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(subDays(selectedDate, 7));
    }
  };

  const goToNext = () => {
    if (viewMode === 'day') {
      setSelectedDate(addDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 7));
    }
  };

  const goToToday = () => setSelectedDate(new Date());

  // Handle unblock lane
  const handleUnblockLane = async (blockId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await deleteLaneBlock(blockId);
  };

  // Render day view
  const renderDayView = () => {
    if (!selectedCenter) return null;

    const centerLanes = getCenterLanes(selectedCenter);
    const centerName = getFriendlyCenterName(centers.find(c => c.id === selectedCenter));

    return (
      <Card className="w-full rounded-none border-0 sm:rounded-md sm:border">
        <CardHeader className="p-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-sm">{centerName}</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {format(selectedDate, "d MMM", { locale: es })}
              </Badge>
            </div>
            {(isAdmin || isEmployee) && (
              <div className="flex items-center gap-2">
                <Button
                  variant={blockingMode ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => {
                    const next = !blockingMode;
                    setBlockingMode(next);
                    if (next) {
                      setMoveMode(false);
                    }
                    setBlockStartSlot(null);
                    setBlockEndSlot(null);
                  }}
                >
                  <Ban className="w-3 h-3 mr-1" />
                  {blockingMode ? 'Cancelar' : 'Bloquear'}
                </Button>
                <Button
                  variant={moveMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const next = !moveMode;
                    setMoveMode(next);
                    if (next) {
                      setBlockingMode(false);
                      setIsDragging(false);
                      setDragStart(null);
                      setDragEnd(null);
                    }
                  }}
                >
                  <Move className="w-3 h-3 mr-1" />
                  {moveMode ? 'Mover (on)' : 'Mover'}
                </Button>
              </div>
            )}
          </CardTitle>
          {(blockingMode || moveMode) && (
            <div className="text-xs text-muted-foreground">
              {blockingMode
                ? 'Haz clic o arrastra dentro de un carril para definir el rango a bloquear.'
                : 'Modo mover activo: arrastra una reserva y suéltala en otro carril u horario.'}
            </div>
          )}
          {!blockingMode && !moveMode && (
            <div className="text-xs text-muted-foreground">
              💡 <strong>Click y arrastra</strong> para crear reservas. Activa el modo Bloquear o mantén <strong>Shift</strong> para arrastrar y crear bloqueos.
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[85vh]">
            {/* Responsive grid based on number of lanes */}
            <div
              className={cn(
                "grid gap-x-2 gap-y-0 min-w-fit",
                isDragging && "cursor-grabbing",
              )}
              style={{ gridTemplateColumns: `60px repeat(${Math.min(4, centerLanes.length || 1)}, 1fr)` }}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-background border-b">
                <div className="p-2 text-center font-medium border-r bg-muted/50 text-sm">
                  Hora
                </div>
              </div>
              {centerLanes.slice(0, 4).map((lane, laneIdx) => {
                // Calcular el color del grupo asignado al carril (solo desde lane_ids de grupos)
                const PREDEFINED_GROUP_NAMES = [
                  'Masaje Individual',
                  'Masaje para Dos',
                  'Masaje a Cuatro Manos',
                  'Rituales',
                  'Rituales para Dos'
                ];
                const validGroups = (treatmentGroups || []).filter((g: any) => 
                  PREDEFINED_GROUP_NAMES.includes(g.name)
                );
                // Solo grupos que tienen este carril en su lane_ids (desde "Grupos de Tratamientos")
                const groupsWithThisLane = validGroups.filter((g: any) => 
                  (g.lane_ids || []).includes(lane.id)
                );
                const primaryGroup = groupsWithThisLane.length > 0 
                  ? groupsWithThisLane[0]
                  : null;
                const laneColor = primaryGroup?.color || '#6b7280';
                
                return (
                <div key={lane.id} className="sticky top-0 z-10 bg-background border-b">
                  <div 
                    className="p-2 text-center font-medium border-r"
                    style={{ backgroundColor: `${laneColor}15`, borderLeft: `4px solid ${laneColor}` }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="font-semibold text-sm">{(lane.name || '').replace(/ra[ií]l/gi, 'Carril')}</div>
                      <LaneIcons index={laneIdx} />
                    </div>
                    <div className="text-xs text-muted-foreground">Cap: {lane.capacity}</div>
                    {/* Mostrar grupos asignados desde "Grupos de Tratamientos" (solo lane_ids) */}
                    <div className="mt-1 flex flex-wrap justify-center gap-1">
                      {(() => {
                        const PREDEFINED_GROUP_NAMES = [
                          'Masaje Individual',
                          'Masaje para Dos',
                          'Masaje a Cuatro Manos',
                          'Rituales',
                          'Rituales para Dos'
                        ];
                        
                        const validGroups = (treatmentGroups || []).filter((g: any) => 
                          PREDEFINED_GROUP_NAMES.includes(g.name)
                        );
                        
                        // Solo mostrar grupos que tienen este carril en su lane_ids (desde "Grupos de Tratamientos")
                        const groupsWithThisLane = validGroups.filter((g: any) => 
                          (g.lane_ids || []).includes(lane.id)
                        );
                        
                        // Mostrar badges solo si hay grupos asignados
                        if (groupsWithThisLane.length === 0) {
                          return null;
                        }
                        
                        return groupsWithThisLane.map((g: any) => (
                          <Badge key={g.id} className="text-[10px]" variant="secondary">{g.name}</Badge>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              );
              })}

              {/* Time slots */}
              {timeSlots.map((timeSlot, timeIndex) => (
                <div key={timeIndex} className="contents">
                  {/* Time label */}
                  <div className="p-1 text-center text-xs border-r border-b bg-muted/30 font-medium h-6 flex items-center justify-center">
                    {timeSlot.hour}
                  </div>

                   {/* Lane slots */}
                   {centerLanes.slice(0, 4).map((lane) => {
                     const slotTime = timeSlot.time;
                     let booking = getBookingForSlot(selectedCenter, lane.id, selectedDate, slotTime);
                     // Fallback only for bookings without lane_id, but STRICT center_id check
                     if (!booking && lane.id === centerLanes[0].id) {
                        const fallback = bookings.find(b => {
                          // STRICT: Must match center_id exactly and have no lane_id
                          if (!b.booking_datetime || !b.center_id || b.center_id !== selectedCenter || b.lane_id) return false;
                          const start = parseISO(b.booking_datetime);
                          const end = addMinutes(start, b.duration_minutes || 60);
                          const sameDay = isSameDay(start, selectedDate);
                          return sameDay && slotTime >= start && slotTime < end;
                        });
                       if (fallback) booking = fallback;
                     }
                     const block = isLaneBlocked(lane.id, slotTime);
                     const isBlocked = !!block;
                     const isFull = isLaneAtTimeFull(selectedCenter, lane.id, slotTime);
                     const isFirstSlotOfBooking = booking &&
                      format(slotTime, 'HH:mm') === format(parseISO(booking.booking_datetime), 'HH:mm');
                     const isPast = isPastSlot(selectedDate, slotTime);

                       const blockStart = block ? new Date(block.start_datetime) : null;
                       const blockEnd = block ? new Date(block.end_datetime) : null;
                       const isBlockStart = Boolean(blockStart && isSameSlotStart(slotTime, blockStart));
                       const blockSpanSlots = block ? getBlockSlotSpan(block) : 0;
                       const blockReasonRaw = block?.reason?.trim() ?? '';
                       const blockReason = blockReasonRaw && !/^bloqueo/i.test(blockReasonRaw) ? blockReasonRaw : null;
                       const isInDragSelection = isSlotInDragSelection(lane.id, slotTime);
                       
                       // Determinar si la celda está dentro de un bloqueo pero no es el inicio
                       const isInBlockButNotStart = block && !isBlockStart && !booking;
                       
                       // Lógica simplificada: por defecto todas las celdas pueden interactuar
                       // EXCEPTO si:
                       // 1. Está dentro de un bloqueo (pero no el inicio) - usar pointer-events-none
                       // 2. Está bloqueada en el inicio Y no tiene booking
                       // 3. Está llena Y no tiene booking
                       // NOTA: Temporalmente NO bloqueamos por isPast para permitir interacción
                       const cannotInteract = isInBlockButNotStart || (!booking && (isBlockStart || isFull));
                       const canInteract = !cannotInteract;
                       
                       return (
                          <div
                            key={lane.id}
                            className={cn(
                              "relative h-6 border-r border-b transition-colors",
                              // Cursor pointer para celdas que pueden interactuar
                              canInteract && "cursor-pointer hover:bg-muted/20",
                              // Estilos de bloqueo para celdas que NO pueden interactuar
                              cannotInteract && !isInBlockButNotStart && "bg-muted/40 opacity-60 cursor-not-allowed",
                              // Las celdas dentro del bloqueo pero no el inicio no deben recibir eventos ni mostrar bordes
                              isInBlockButNotStart && "pointer-events-none border-0",
                              isInDragSelection && dragMode === 'booking' && "bg-blue-200/50 border-blue-400",
                              isInDragSelection && dragMode === 'block' && "bg-red-200/50 border-red-400"
                            )}
                            onClick={(e) => {
                              // Si está dentro de un bloqueo pero no es el inicio, no hacer nada
                              if (isInBlockButNotStart) return;
                              
                              // Don't handle click if it was a drag operation
                              if ((e.target as HTMLElement).closest('[draggable="true"]')) return;
                              
                              // No ejecutar onClick si hubo un arrastre
                              if (isDraggingRef.current) {
                                isDraggingRef.current = false; // Resetear para el próximo clic
                                return;
                              }
                              
                              // Solo bloquear si está bloqueada en el inicio o está llena
                              if (!booking && (isBlockStart || isFull)) return;
                              
                              e.stopPropagation();
                              e.preventDefault();
                              
                              // Si hay booking, abrir modal de edición
                              if (booking) {
                                handleSlotClick(selectedCenter, lane.id, selectedDate, slotTime);
                                return;
                              }
                              
                              // Si no hay booking, crear reserva
                              handleSlotClick(selectedCenter, lane.id, selectedDate, slotTime);
                            }}
                            onMouseDown={(e) => {
                              if (cannotInteract) return;
                              // Don't interfere with drag operations
                              if ((e.target as HTMLElement).closest('[draggable="true"]')) return;
                              e.stopPropagation();
                              handleSlotMouseDown(selectedCenter, lane.id, selectedDate, slotTime, e);
                            }}
                            onMouseEnter={() => {
                              if (cannotInteract) return;
                              handleSlotMouseEnter(selectedCenter, lane.id, selectedDate, slotTime);
                            }}
                            onMouseUp={(e) => {
                              if (cannotInteract) return;
                              e.stopPropagation();
                              handleSlotMouseUp(selectedCenter, lane.id, selectedDate, slotTime);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (isBlocked || isFull) return;
                              
                              // Check if it's a block being dragged
                              const blockData = e.dataTransfer.getData('block');
                              if (blockData) {
                                const draggedBlock = JSON.parse(blockData);
                                const laneCenterId = lane.center_id || draggedBlock.center_id || selectedCenter;
                                const dropDate = new Date(selectedDate);
                                dropDate.setHours(slotTime.getHours(), slotTime.getMinutes(), 0, 0);
                                console.log('🖱️ Block drop detected (day view):', {
                                  blockId: draggedBlock.id,
                                  targetLane: lane.id,
                                  targetCenter: laneCenterId,
                                  dropDate: dropDate.toISOString()
                                });
                                moveBlock(
                                  draggedBlock.id,
                                  laneCenterId,
                                  lane.id,
                                  dropDate,
                                  slotTime
                                );
                                return;
                              }
                              
                              // Check if it's a booking being dragged
                              const bookingData = e.dataTransfer.getData('booking');
                              if (bookingData) {
                                const draggedBooking = JSON.parse(bookingData);
                                const laneCenterId = lane.center_id || draggedBooking.center_id || selectedCenter;
                                const dropDate = new Date(selectedDate);
                                dropDate.setHours(slotTime.getHours(), slotTime.getMinutes(), 0, 0);
                                console.log('🖱️ Drop detected (day view):', {
                                  bookingId: draggedBooking.id,
                                  targetLane: lane.id,
                                  targetCenter: laneCenterId,
                                  dropDate: dropDate.toISOString()
                                });
                                moveBooking(
                                  draggedBooking.id,
                                  laneCenterId,
                                  lane.id,
                                  dropDate,
                                  slotTime
                                );
                              }
                            }}
                          >
                          {booking && isFirstSlotOfBooking && (
                             <div
                                className={cn(
                                  "absolute top-1 left-1 right-1 rounded border-l-4 p-2 transition-all hover:shadow-md",
                                  "cursor-move",
                                  // Pequeño realce visual mientras se arrastra para dar más sensación de fluidez
                                  isDraggingRef.current && "shadow-lg scale-[1.01] bg-background/80"
                                )}
                                 style={{ 
                                   backgroundColor: `${getServiceLaneColor(booking.service_id)}20`,
                                   borderColor: getStatusAccent(booking),
                                   borderLeftColor: getStatusAccent(booking),
                                   borderStyle: 'solid',
                                   borderWidth: '2px',
                                   borderLeftWidth: '6px',
                                   color: getServiceLaneColor(booking.service_id),
                                   height: `${((booking.duration_minutes || 60) / 5) * 24}px`,
                                   zIndex: 2
                                 }}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.stopPropagation(); // Prevent parent handlers from interfering
                                  // Marcar que estamos en un arrastre real para que los clics posteriores no abran modales por error
                                  isDraggingRef.current = true;
                                  // Store both booking data and the original time slot for reference
                                  const dragData = {
                                    ...booking,
                                    originalTimeSlot: timeSlot.time.toISOString()
                                  };
                                  e.dataTransfer.setData('booking', JSON.stringify(dragData));
                                  e.dataTransfer.setData('text/plain', booking.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  // Usar como imagen de arrastre la propia tarjeta, anclada al punto donde el usuario hizo clic
                                  const target = e.currentTarget as HTMLElement;
                                  const rect = target.getBoundingClientRect();
                                  const offsetX = e.clientX - rect.left;
                                  // Siempre anclar verticalmente a la parte superior del bloque para que la referencia visual
                                  // sea el inicio del bloqueo/cita, no el punto medio donde se hizo clic.
                                  const offsetY = 4;
                                  e.dataTransfer.setDragImage(target, offsetX, offsetY);
                                }}
                                onDragEnd={() => {
                                  // Pequeño retraso para que el navegador complete el drop antes de resetear
                                  setTimeout(() => {
                                    isDraggingRef.current = false;
                                  }, 0);
                                }}
                                onClick={(e) => {
                                  // Solo abrir el modal si NO venimos de un drag
                                  if (isDraggingRef.current) {
                                    isDraggingRef.current = false;
                                    return;
                                  }
                                  e.stopPropagation();
                                  handleSlotClick(selectedCenter, lane.id, selectedDate, slotTime);
                                }}
                             >
                               <div className="flex items-start">
                                 <div className="flex-1">
                                   <div className="text-sm font-semibold truncate">{booking.profiles?.first_name} {booking.profiles?.last_name}</div>
                                   <div className="text-xs text-muted-foreground truncate">
                                     {booking.services?.name ? translateServiceName(booking.services.name, language, t) : ''}
                                   </div>
                                   <div className="text-xs font-medium">
                                     €{((booking.total_price_cents || 0) / 100).toFixed(0)} - {format(parseISO(booking.booking_datetime), 'HH:mm')}
                                   </div>
                                   {booking.notes && (
                                     <div className="text-xs text-muted-foreground truncate italic mt-1">
                                       "📝 {booking.notes}"
                                     </div>
                                   )}
                                   {booking.client_notes && booking.client_notes.length > 0 && (
                                     <div className="text-xs text-orange-600 truncate italic mt-1">
                                       "🔔 {booking.client_notes[0].content}"
                                     </div>
                                   )}
                                 </div>
                                 {booking.payment_status === 'paid' && (
                                   <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                          </div>
                        )}
                          {block && isBlockStart && !booking && blockStart && blockEnd && (
                            <div
                              className="absolute left-0 right-0 top-0 z-10 overflow-hidden border border-red-500 bg-red-100/90 text-red-700 shadow-sm cursor-move group"
                              style={{ height: `${blockSpanSlots * SLOT_PIXEL_HEIGHT}px` }}
                              title={blockReason ? `Bloqueado: ${blockReason}` : 'Bloqueado'}
                              draggable={true}
                              onDragStart={(e) => {
                                e.stopPropagation(); // Prevent parent handlers from interfering
                                isDraggingRef.current = true;
                                const dragData = {
                                  id: block.id,
                                  lane_id: block.lane_id,
                                  center_id: block.center_id,
                                  start_datetime: block.start_datetime,
                                  end_datetime: block.end_datetime,
                                  originalTimeSlot: timeSlot.time.toISOString()
                                };
                                e.dataTransfer.setData('block', JSON.stringify(dragData));
                                e.dataTransfer.setData('text/plain', block.id);
                                e.dataTransfer.effectAllowed = 'move';
                                const target = e.currentTarget as HTMLElement;
                                const rect = target.getBoundingClientRect();
                                const offsetX = e.clientX - rect.left;
                                const offsetY = 4;
                                e.dataTransfer.setDragImage(target, offsetX, offsetY);
                              }}
                              onDragEnd={() => {
                                setTimeout(() => {
                                  isDraggingRef.current = false;
                                }, 0);
                              }}
                              onMouseDown={(e) => {
                                // Only stop propagation if not starting a drag
                                if (!(e.target as HTMLElement).closest('button')) {
                                  e.stopPropagation();
                                }
                              }}
                              onMouseUp={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                // Don't handle click if it was a drag
                                if (e.defaultPrevented) return;
                                e.stopPropagation();
                              }}
                            >
                              <div className="flex h-full items-start justify-between px-2 py-1 gap-2">
                                <div className="flex flex-col gap-1 pr-1">
                                  <span className="text-[11px] font-semibold uppercase tracking-wide leading-none flex items-center gap-1">
                                    <Ban className="h-3 w-3" />
                                    Bloqueado
                                  </span>
                                  <span className="text-[10px] leading-none">
                                    {format(blockStart, 'HH:mm')} - {format(blockEnd, 'HH:mm')}
                                  </span>
                                  {blockReason && (
                                    <span className="text-[10px] text-red-600/90 leading-snug max-w-[160px] line-clamp-2">
                                      {blockReason}
                                    </span>
                                  )}
                                </div>
                                {(isAdmin || isEmployee) && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="ml-1 h-6 w-6 p-0 opacity-80 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteLaneBlock(block.id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                         {blockingMode && !booking && !isBlocked && (
                           <div className={cn(
                             "absolute top-1 left-1 right-1 bottom-1 rounded border-2 border-dashed transition-all",
                             blockStartSlot?.laneId === lane.id && blockStartSlot?.timeSlot.getTime() === timeSlot.time.getTime() 
                               ? "border-blue-500 bg-blue-500/10" 
                               : "border-blue-300 hover:border-blue-500 hover:bg-blue-500/5"
                           )}>
                             <div className="absolute inset-0 flex items-center justify-center">
                               <Ban className="h-4 w-4 text-blue-600" />
                             </div>
                           </div>
                         )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  // Render week view - now with full functionality like day view
  const renderWeekView = () => {
    if (!selectedCenter) return null;

    const weekDates = getWeekDates();
    const centerLanes = getCenterLanes(selectedCenter);
    const centerName = getFriendlyCenterName(centers.find(c => c.id === selectedCenter));

    return (
      <Card className="w-full rounded-none border-0 sm:rounded-md sm:border">
        <CardHeader className="p-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-sm">Vista Semanal - {centerName}</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {format(weekDates[0], "d MMM", { locale: es })} - {format(weekDates[6], "d MMM", { locale: es })}
              </Badge>
            </div>
            {(isAdmin || isEmployee) && (
              <Button
                variant={blockingMode ? "destructive" : "outline"}
                size="sm"
                onClick={() => {
                  setBlockingMode(!blockingMode);
                  setBlockStartSlot(null);
                  setBlockEndSlot(null);
                }}
              >
                <Ban className="w-3 h-3 mr-1" />
                {blockingMode ? 'Cancelar' : 'Bloquear'}
              </Button>
            )}
          </CardTitle>
          {blockingMode && (
            <div className="text-xs text-muted-foreground">
              Haz clic o arrastra dentro de un carril para definir el rango a bloquear.
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[85vh]">
            <div
              className="grid gap-x-2 gap-y-0 min-w-[1200px]"
              style={{ gridTemplateColumns: `50px repeat(${7 * Math.min(4, centerLanes.length || 1)}, 1fr)` }}
            >
              {/* Week header */}
              <div className="sticky top-0 z-10 bg-background border-b">
                <div className="p-1 text-center font-medium border-r bg-muted/50 text-xs">Hora</div>
              </div>
              {weekDates.map((date) => 
                centerLanes.map((lane, laneIdx) => (
                  <div key={`${date.toISOString()}-${lane.id}`} className="sticky top-0 z-10 bg-background border-b">
                    <div 
                      className="p-1 text-center font-medium border-r"
                      style={{ backgroundColor: `#f1f5f920`, borderLeft: `3px solid #6b7280` }}
                    >
                      <div className="font-semibold text-[9px] flex items-center justify-center gap-1">
                        <span>{format(date, "EEE", { locale: es })} - {(lane.name || '').replace(/ra[ií]l/gi, 'C')}</span>
                        <LaneIcons index={laneIdx} />
                      </div>
                      <div className="text-[8px] text-muted-foreground">
                        {format(date, "d/M", { locale: es })}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Time slots for week view */}
              {timeSlots.map((timeSlot, timeIndex) => (
                <div key={timeIndex} className="contents">
                  {/* Time label */}
                  <div className="p-0.5 text-center text-[10px] border-r border-b bg-muted/30 font-medium h-6 flex items-center justify-center">
                    {timeSlot.hour}
                  </div>

                   {/* Week day-lane slots */}
                   {weekDates.map((date) => 
                     centerLanes.map((lane, laneIdx) => {
                       // Create the correct datetime for this specific day and time slot
                       const slotDateTime = new Date(date);
                       slotDateTime.setHours(timeSlot.time.getHours(), timeSlot.time.getMinutes(), 0, 0);
                       
                       const booking = getBookingForSlot(selectedCenter, lane.id, date, slotDateTime);
                       const block = isLaneBlocked(lane.id, slotDateTime);
                       const isBlocked = !!block;
                       const isFull = isLaneAtTimeFull(selectedCenter, lane.id, slotDateTime);
                       const isFirstSlotOfBooking = booking &&
                         format(slotDateTime, 'HH:mm') === format(parseISO(booking.booking_datetime), 'HH:mm');
                       const blockStart = block ? new Date(block.start_datetime) : null;
                       const blockEnd = block ? new Date(block.end_datetime) : null;
                      const isBlockStart = Boolean(blockStart && isSameSlotStart(slotDateTime, blockStart));
                       const blockSpanSlots = block ? getBlockSlotSpan(block) : 0;
                       const blockReasonRaw = block?.reason?.trim() ?? '';
                       const blockReason = blockReasonRaw && !/^bloqueo/i.test(blockReasonRaw) ? blockReasonRaw : null;
                       const isInDragSelection = isSlotInDragSelection(lane.id, slotDateTime);
                       const isPast = isPastSlot(date, slotDateTime);
                       
                       // Determinar si la celda está dentro de un bloqueo pero no es el inicio
                       const isInBlockButNotStart = block && !isBlockStart && !booking;
                       
                       // Lógica simplificada: por defecto todas las celdas pueden interactuar
                       // EXCEPTO si:
                       // 1. Está dentro de un bloqueo (pero no el inicio) - usar pointer-events-none
                       // 2. Está bloqueada en el inicio Y no tiene booking
                       // 3. Está llena Y no tiene booking
                       // NOTA: Temporalmente NO bloqueamos por isPast para permitir interacción
                       const cannotInteract = isInBlockButNotStart || (!booking && (isBlockStart || isFull));
                       const canInteract = !cannotInteract;

                      const isFirstLaneOfDay = laneIdx === 0; // dibujar separador grueso al inicio de cada día
                      return (
                         <div
                           key={`${date.toISOString()}-${lane.id}`}
                           className={cn(
                             "relative h-6 border-r border-b transition-colors",
                             // Cursor pointer para celdas que pueden interactuar
                             canInteract && "cursor-pointer hover:bg-muted/30",
                             // Estilos de bloqueo para celdas que NO pueden interactuar
                             cannotInteract && !isInBlockButNotStart && "bg-muted/40 opacity-60 cursor-not-allowed",
                             // Las celdas dentro del bloqueo pero no el inicio no deben recibir eventos ni mostrar bordes
                             isInBlockButNotStart && "pointer-events-none border-0",
                             isInDragSelection && dragMode === 'booking' && "bg-blue-200/50 border-blue-400",
                             isInDragSelection && dragMode === 'block' && "bg-red-200/50 border-red-400"
                           )}
                           style={isFirstLaneOfDay && !isInBlockButNotStart ? { borderLeft: '3px solid #6b7280' } : undefined}
                           onMouseDown={(e) => {
                             if (cannotInteract) return;
                             // Don't interfere with drag operations on draggable elements
                             if ((e.target as HTMLElement).closest('[draggable="true"]')) return;
                             e.stopPropagation();
                             handleSlotMouseDown(selectedCenter, lane.id, date, slotDateTime, e);
                           }}
                           onMouseEnter={() => {
                             if (cannotInteract) return;
                             handleSlotMouseEnter(selectedCenter, lane.id, date, slotDateTime);
                           }}
                           onMouseUp={(e) => {
                             if (cannotInteract) return;
                             e.stopPropagation();
                             handleSlotMouseUp(selectedCenter, lane.id, date, slotDateTime);
                           }}
                           onDragOver={(e) => {
                             e.preventDefault();
                             e.dataTransfer.dropEffect = 'move';
                           }}
                           onDrop={(e) => {
                             e.preventDefault();
                             if (isBlocked || isFull) return;
                             
                             // Check if it's a block being dragged
                             const blockData = e.dataTransfer.getData('block');
                             if (blockData) {
                               const draggedBlock = JSON.parse(blockData);
                               const laneCenterId = lane.center_id || draggedBlock.center_id || selectedCenter;
                               console.log('🖱️ Block drop detected (week view):', {
                                 blockId: draggedBlock.id,
                                 targetLane: lane.id,
                                 targetCenter: laneCenterId,
                                 date: date.toISOString(),
                                 time: slotDateTime.toISOString()
                               });
                               moveBlock(
                                 draggedBlock.id,
                                 laneCenterId,
                                 lane.id,
                                 date,
                                 slotDateTime
                               );
                               return;
                             }
                             
                             // Check if it's a booking being dragged
                             const bookingData = e.dataTransfer.getData('booking');
                             if (bookingData) {
                               const droppedBooking = JSON.parse(bookingData);
                               const laneCenterId = lane.center_id || droppedBooking.center_id || selectedCenter;
                               console.log('🖱️ Drop detected (week view):', {
                                 bookingId: droppedBooking.id,
                                 targetLane: lane.id,
                                 targetCenter: laneCenterId,
                                 date: date.toISOString(),
                                 time: slotDateTime.toISOString()
                               });
                               moveBooking(
                                 droppedBooking.id,
                                 laneCenterId,
                                 lane.id,
                                 date,
                                 slotDateTime
                               );
                             }
                           }}
                         >
                           {booking && isFirstSlotOfBooking && (
                              <div
                                className={cn(
                                  "absolute inset-0 rounded-sm text-[8px] p-0.5 border-l-2 truncate z-10",
                                  "cursor-move"
                                )}
                                 style={{ 
                                   backgroundColor: `${getServiceLaneColor(booking.service_id)}20`,
                                   borderColor: getStatusAccent(booking),
                                   borderLeftColor: getStatusAccent(booking),
                                   borderStyle: 'solid',
                                   borderWidth: '2px',
                                   borderLeftWidth: '6px',
                                   color: getServiceLaneColor(booking.service_id),
                                   height: `${(booking.duration_minutes || 60) / 5 * 24}px`,
                                   minHeight: '24px'
                                 }}
                               draggable={true}
                               onDragStart={(e) => {
                                 e.stopPropagation(); // Prevent parent handlers from interfering
                                 e.dataTransfer.setData('booking', JSON.stringify(booking));
                                 e.dataTransfer.setData('text/plain', booking.id);
                                 e.dataTransfer.effectAllowed = 'move';
                               }}
                               onClick={(e) => {
                                 // Only open edit modal if it wasn't a drag
                                 if (e.defaultPrevented) return;
                                 e.stopPropagation();
                                 handleSlotClick(selectedCenter, lane.id, date, slotDateTime);
                               }}
                             >
                               <div className="flex justify-between items-start h-full">
                                 <div className="flex-1">
                                   <div className="font-medium truncate">
                                     {booking.profiles?.first_name?.[0]}{booking.profiles?.last_name?.[0]}
                                   </div>
                                 </div>
                                 <div className="flex items-center">
                                   {booking.payment_status === 'paid' && (
                                     <CheckCircle2 className="h-2 w-2 text-green-600" />
                                   )}
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-3 w-3 p-0 hover:bg-red-500 hover:text-white ml-1"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       deleteBooking(booking.id);
                                     }}
                                   >
                                     <X className="h-2 w-2" />
                                   </Button>
                                 </div>
                               </div>
                             </div>
                           )}
                          
                          {block && isBlockStart && !booking && blockStart && blockEnd && (
                            <div
                              className={cn(
                                "absolute left-0 right-0 top-0 z-10 overflow-hidden border border-red-500 bg-red-100/90 text-red-700 shadow-sm group",
                                "cursor-move"
                              )}
                              style={{ height: `${blockSpanSlots * SLOT_PIXEL_HEIGHT}px` }}
                              title={blockReason ? `Bloqueado: ${blockReason}` : 'Bloqueado'}
                              draggable={true}
                              onDragStart={(e) => {
                                e.stopPropagation(); // Prevent parent handlers from interfering
                                const dragData = {
                                  id: block.id,
                                  lane_id: block.lane_id,
                                  center_id: block.center_id,
                                  start_datetime: block.start_datetime,
                                  end_datetime: block.end_datetime,
                                  originalTimeSlot: slotDateTime.toISOString()
                                };
                                e.dataTransfer.setData('block', JSON.stringify(dragData));
                                e.dataTransfer.setData('text/plain', block.id);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 10, 10);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              onMouseUp={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex h-full items-start justify-between px-2 py-1 gap-2">
                                <div className="flex flex-col gap-1 pr-1">
                                  <span className="text-[11px] font-semibold uppercase tracking-wide leading-none flex items-center gap-1">
                                    <Ban className="h-3 w-3" />
                                    Bloqueado
                                  </span>
                                  <span className="text-[10px] leading-none">
                                    {format(blockStart, 'HH:mm')} - {format(blockEnd, 'HH:mm')}
                                  </span>
                                  {blockReason && (
                                    <span className="text-[10px] text-red-600/90 leading-snug max-w-[160px] line-clamp-2">
                                      {blockReason}
                                    </span>
                                  )}
                                </div>
                                {(isAdmin || isEmployee) && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="ml-1 h-6 w-6 p-0 opacity-80 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteLaneBlock(block.id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  // Debug info
  console.log('📅 Calendar render - Mobile:', isMobile, 'Selected center:', selectedCenter, 'Centers:', centers.length);

  // Build main view depending on viewport so mobile reuses shared modals
  const mainView = isMobile ? (
    <MobileCalendarView
      selectedDate={selectedDate}
      selectedCenter={selectedCenter}
      onCenterChange={setSelectedCenter}
      onSlotSelect={handleSlotClick}
    />
  ) : (
    <div className="space-y-4">
      {/* Header Controls - Mobile Optimized */}
      <div className="space-y-3">
        {/* Date Navigation and Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
          </div>

          <div className="text-lg sm:text-xl font-semibold text-center sm:text-left">
            {viewMode === 'day'
              ? format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
              : `${format(getWeekDates()[0], "d MMM", { locale: es })} - ${format(getWeekDates()[6], "d MMM yyyy", { locale: es })}`
            }
          </div>
        </div>

        {/* Filters and Controls - Mobile Stack */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Center Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Centro</label>
            <div className="space-y-2">
              {centers.map((center) => {
                const isSelected = selectedCenter === center.id;
                return (
                  <div
                    key={center.id}
                    onClick={() => {
                      console.log('🏢 Center changed:', center.id);
                      setSelectedCenter(center.id);
                    }}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                      isSelected
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border hover:bg-accent/50"
                    )}
                  >
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{getFriendlyCenterName(center)}</p>
                    </div>
                    {isSelected && (
                      <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* View Mode Toggle - Better Mobile Layout */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Vista</label>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setViewMode('day')}
              >
                Día
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
            </div>
          </div>
        </div>

        {/* Blocking Mode Info */}
        {blockingMode && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              📍 Modo bloqueo activo: Clic y arrastra por un carril para bloquear, o selecciona inicio y fin con clics separados.
            </p>
          </div>
        )}
      </div>

      {/* Calendar View */}
      {viewMode === 'day' ? renderDayView() : renderWeekView()}
    </div>
  );


  const bookingModal = showBookingModal ? (
    <>
      <AppModal open={true} onClose={() => setShowBookingModal(false)} maxWidth={520} mobileMaxWidth={360} maxHeight={720}>
        <div className="bg-background rounded-xl shadow-2xl border border-border/60 overflow-hidden flex flex-col w-full max-h-full">
          <div className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-background relative">
            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <h3 className="text-xl font-semibold">Nueva Reserva</h3>
            <p className="text-sm text-gray-600">
              Crear una nueva reserva para el {selectedSlot && format(selectedSlot.timeSlot, 'HH:mm')} del {selectedSlot && format(bookingForm.date, "d 'de' MMMM", { locale: es })}
            </p>
            {createClientId && (
              <p className="text-sm text-primary font-medium mt-2">
                Cliente seleccionado: {bookingForm.clientName}
              </p>
            )}
          </div>

          <div className="px-6 py-6 overflow-y-auto flex-1 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="walkIn"
                  checked={bookingForm.isWalkIn || false}
                  onChange={(e) => {
                    const isWalkIn = e.target.checked;
                    setBookingForm((prev) => ({
                      ...prev,
                      isWalkIn,
                      clientName: isWalkIn ? '' : prev.clientName,
                      clientPhone: isWalkIn ? '' : prev.clientPhone,
                      clientEmail: isWalkIn ? '' : prev.clientEmail,
                    }));
                    if (isWalkIn) {
                      setCreateClientId(null);
                    }
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="walkIn" className="text-sm font-medium">
                  WALK IN (cliente sin datos previos)
                </Label>
              </div>
              
              {bookingForm.isWalkIn && (
                <div className="flex items-center space-x-2 pl-6">
                  <input
                    type="checkbox"
                    id="saveAsClient"
                    checked={bookingForm.saveAsClient || false}
                    onChange={(e) => setBookingForm((prev) => ({
                      ...prev,
                      saveAsClient: e.target.checked
                    }))}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="saveAsClient" className="text-sm text-muted-foreground">
                    Guardar como cliente futuro
                  </Label>
                </div>
              )}
            </div>

            {!bookingForm.isWalkIn && (
              <>
                <div className="space-y-2">
                  <RepeatClientSelector
                    label="Cliente habitual (opcional)"
                    placeholder="Buscar cliente que haya venido más de una vez..."
                    onSelect={(c) => {
                      setCreateClientId(c.id);
                      setBookingForm((prev) => ({
                        ...prev,
                        clientName: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
                        clientPhone: c.phone || '',
                        clientEmail: c.email || '',
                      }));
                    }}
                  />
                </div>

              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-sm font-medium">
                  {bookingForm.isWalkIn ? 'Nombre Walk-In' : 'Nombre del cliente'} {!bookingForm.isWalkIn && '*'}
                </Label>
                <Input
                  id="clientName"
                  value={bookingForm.clientName}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                  placeholder={bookingForm.isWalkIn ? "Nombre del cliente walk-in" : "Nombre y apellidos"}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone" className="text-sm font-medium">Teléfono</Label>
                <Input
                  id="clientPhone"
                  value={bookingForm.clientPhone}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                  placeholder="+34 600 000 000"
                  className="h-11"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientEmail" className="text-sm font-medium">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={bookingForm.clientEmail}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                  placeholder="cliente@example.com"
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Servicio *</Label>
              <Accordion type="single" collapsible defaultValue="service" className="w-full">
                <AccordionItem value="service">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center justify-between w-full">
                      <span>Selección de Servicio</span>
                      {bookingForm.serviceId && (
                        <span className="text-sm text-muted-foreground">
                          ({services.find(s => s.id === bookingForm.serviceId)?.name})
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2">
                      <ServiceSelectorGrouped
                        mode="individual"
                        services={services.filter(s => s.center_id === bookingForm.centerId || !s.center_id)}
                        packages={[]}
                        selectedId={bookingForm.serviceId}
                        onSelect={(id) => setBookingForm({ ...bookingForm, serviceId: id })}
                        useDropdown={false}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas internas</Label>
              <Textarea
                id="notes"
                value={bookingForm.notes || ''}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                rows={3}
                placeholder="Añade notas internas..."
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-background flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowBookingModal(false)}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                onClick={createBooking}
                className="flex-1"
                disabled={!bookingForm.serviceId || (!bookingForm.isWalkIn && !bookingForm.clientName.trim())}
              >
                <Check className="h-4 w-4 mr-2" />
                Crear Reserva
              </Button>
            </div>
          </div>
        </div>
      </AppModal>
    </>
  ) : null;

  const paymentModal = showPaymentModal && editingBooking ? (
    <AppModal
      open={true}
      onClose={() => { if (!paymentLoading) setShowPaymentModal(false); }}
      maxWidth={420}
      mobileMaxWidth={360}
      maxHeight={600}
    >
      <div className="flex flex-col h-full">
        <div className="px-6 pt-6 pb-4 border-b bg-background">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Registrar pago
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Reserva del {format(parseISO(editingBooking.booking_datetime), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
          </p>
          {!editingBooking.stripe_payment_method_id && !restoringPaymentMethod && (
            <p className="text-xs text-amber-600 mt-2">
              No hay tarjeta guardada para esta reserva. Genera un enlace o registra el cobro manualmente.
            </p>
          )}
          {restoringPaymentMethod && (
            <p className="text-xs text-muted-foreground mt-2">
              Buscando la tarjeta guardada del cliente...
            </p>
          )}
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Show penalty field if status is no_show */}
          {editBookingStatus === 'no_show' && editPaymentStatus !== 'paid' && (
            <div className="space-y-2 border border-amber-200 bg-amber-50 rounded-lg p-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-amber-900">Penalización por No Show</Label>
                <Label className="text-xs text-amber-700">
                  Selecciona el porcentaje del precio que deseas cobrar.
                </Label>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-amber-900">Porcentaje a cobrar</Label>
                <Select 
                  value={String(penaltyPercentage)} 
                  onValueChange={(v) => {
                    const percentage = parseInt(v, 10);
                    setPenaltyPercentage(percentage);
                    // Auto-calculate amount from percentage
                    if (editingBooking?.total_price_cents) {
                      const amount = (editingBooking.total_price_cents * percentage) / 100 / 100;
                      setCaptureAmountInput(amount.toFixed(2));
                    }
                  }}
                  disabled={paymentLoading}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% - No cobrar</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                    <SelectItem value="100">100% - Cobro total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingBooking?.total_price_cents && (
                <div className="space-y-1">
                  <Label className="text-xs text-amber-700">Importe calculado:</Label>
                  <p className="text-sm font-semibold text-amber-900">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
                      ((editingBooking.total_price_cents || 0) * penaltyPercentage) / 100 / 100
                    )}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs text-amber-700">O ingresa un importe manual (opcional):</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={captureAmountInput}
                  onChange={(e) => {
                    setCaptureAmountInput(e.target.value);
                    // Update percentage if manual amount is entered
                    if (editingBooking?.total_price_cents && e.target.value) {
                      const parsed = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(parsed)) {
                        const originalPrice = (editingBooking.total_price_cents || 0) / 100;
                        const calculatedPercentage = Math.round((parsed / originalPrice) * 100);
                        setPenaltyPercentage(calculatedPercentage);
                      }
                    }
                  }}
                  placeholder={editingBooking?.total_price_cents 
                    ? ((editingBooking.total_price_cents || 0) / 100).toFixed(2) 
                    : '0.00'}
                  className="bg-white"
                  disabled={paymentLoading}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Importe a cobrar (€)</Label>
            <Input
              id="paymentAmount"
              type="number"
              min={0}
              step={0.01}
              value={paymentAmount || (editingBooking ? (editingBooking.total_price_cents || 0) / 100 : 0)}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setPaymentAmount(Number.isFinite(value) ? value : 0);
              }}
              disabled={paymentLoading || (editBookingStatus === 'no_show' && captureAmountInput.trim() !== '')}
            />
            {editBookingStatus === 'no_show' && (
              <p className="text-xs text-muted-foreground">
                {captureAmountInput.trim() !== '' 
                  ? 'El importe de penalización se usará para el cobro.' 
                  : 'Usa el campo de penalización arriba o este campo para definir el importe.'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Forma de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={paymentLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar forma de cobro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">💰 Efectivo</SelectItem>
                <SelectItem value="tarjeta">💳 Terminal tarjeta</SelectItem>
                {editBookingStatus !== 'no_show' && (
                  <>
                    <SelectItem value="bizum">📱 Bizum</SelectItem>
                    <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                    <SelectItem value="online">🌐 Enviar link de pago</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {paymentMethod === 'online' && editBookingStatus !== 'no_show' && (
              <p className="text-xs text-muted-foreground">
                Se generará un enlace de pago con Stripe y se enviará por email si hay correo disponible.
              </p>
            )}
            {editBookingStatus === 'no_show' && (
              <p className="text-xs text-amber-600">
                Para reservas con No Show solo se permite cobro en efectivo o con tarjeta.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentNotes">Notas del cobro</Label>
            <Textarea
              id="paymentNotes"
              rows={3}
              placeholder="Detalle adicional (opcional)"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              disabled={paymentLoading}
            />
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 border-t flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowPaymentModal(false)}
            disabled={paymentLoading}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={processManualPayment}
            disabled={paymentLoading}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            {paymentLoading ? 'Procesando...' : 'Registrar pago'}
          </Button>
        </div>
      </div>
    </AppModal>
  ) : null;

  const editBookingModal = showEditModal && editingBooking ? (
    <>
      <AppModal open={true} onClose={() => { setShowEditModal(false); setEditingBooking(null); }} maxWidth={520} mobileMaxWidth={360} maxHeight={720}>
        <div className="flex flex-col h-full max-h-[95vh]">
          <div className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-background">
            <h3 className="text-xl font-semibold">Editar Reserva</h3>
            <p className="text-sm text-gray-600">
              Editar reserva de {editName} para el {format(editTime, 'HH:mm')} del {format(editTime, "d 'de' MMMM", { locale: es })}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 pb-28 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceId" className="text-sm font-medium">Servicio *</Label>
              <Select value={editServiceId || undefined} onValueChange={(value) => {
                setEditServiceId(value);
                // Actualizar duración automáticamente cuando se cambia el servicio
                const selectedService = services.find(s => s.id === value);
                if (selectedService) {
                  setEditDuration(selectedService.duration_minutes || 60);
                }
              }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent 
                  position="popper"
                  side="bottom"
                  align="center"
                  sideOffset={2}
                  avoidCollisions={true}
                  collisionPadding={8}
                  sticky="always"
                >
                  {services.filter(s => s.center_id === (editingBooking?.center_id || bookingForm.centerId) || !s.center_id).map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {translateServiceName(service.name, language, t)} - {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(service.price_cents / 100)} ({service.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Select value={format(editTime, 'HH:mm')} onValueChange={(val) => {
                const [h, m] = val.split(':').map(Number);
                const d = new Date(editTime);
                d.setHours(h, m, 0, 0);
                setEditTime(d);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  position="popper"
                  side="bottom"
                  align="center"
                  sideOffset={2}
                  avoidCollisions={true}
                  collisionPadding={8}
                  sticky="always"
                >
                  {timeOptions5m.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Duración (min)</Label>
              <Input type="number" min={15} step={15} value={editDuration} onChange={(e) => setEditDuration(parseInt(e.target.value || '60', 10))} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment">Estado de pago</Label>
                <Select 
                  value={editPaymentStatus} 
                  onValueChange={(v) => {
                    const newPaymentStatus = v as any;
                    setEditPaymentStatus(newPaymentStatus);
                    
                    // CRITICAL: Si se marca como pagado, automáticamente cambiar estado de reserva
                    // (excepto si es no_show, que se mantiene como no_show)
                    if (newPaymentStatus === 'paid' && editBookingStatus === 'pending') {
                      // Si es no_show, mantener no_show. Si no, cambiar a confirmed
                      if (editBookingStatus !== 'no_show' && editingBooking?.status !== 'no_show') {
                        setEditBookingStatus('confirmed');
                      }
                    }
                    // Si se cambia de pagado a pendiente, también cambiar estado de reserva a pendiente
                    if (newPaymentStatus === 'pending' && editBookingStatus === 'confirmed') {
                      setEditBookingStatus('pending');
                    }
                  }}
                >
                  <SelectTrigger disabled={!paymentEditUnlocked} className={!paymentEditUnlocked ? 'opacity-70 cursor-not-allowed' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper"
                    side="bottom"
                    align="center"
                    sideOffset={2}
                    avoidCollisions={true}
                    collisionPadding={8}
                    sticky="always"
                  >
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="failed">Fallido</SelectItem>
                    <SelectItem value="refunded">Reembolsado</SelectItem>
                    <SelectItem value="partial_refund">Reembolso Parcial</SelectItem>
                  </SelectContent>
                </Select>
                {!paymentEditUnlocked && (
                  <div className="text-xs text-muted-foreground">
                    Automático. No editable. 
                    <button
                      type="button"
                      className="underline ml-1"
                      onClick={() => setShowPaymentConfirm1(true)}
                    >
                      Editar manualmente
                    </button>
                  </div>
                )}
                {paymentEditUnlocked && (
                  <div className="text-xs text-amber-600">
                    Edición manual habilitada. Se solicitará guardar para aplicar cambios.
                  </div>
                )}

                {/* Doble confirmación para desbloquear edición */}
                <AlertDialog open={showPaymentConfirm1} onOpenChange={setShowPaymentConfirm1}>
                  <AlertDialogContent className="mx-4 sm:mx-auto">
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Permitir edición manual?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Los estados de pago se actualizan automáticamente. Solo desbloquea si necesitas corregir un error.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="w-full sm:w-auto"
                        onClick={() => { setShowPaymentConfirm1(false); setShowPaymentConfirm2(true); }}
                      >
                        Sí, continuar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showPaymentConfirm2} onOpenChange={setShowPaymentConfirm2}>
                  <AlertDialogContent className="mx-4 sm:mx-auto">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmación adicional</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Seguro que quieres habilitar la edición manual del estado de pago?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="w-full sm:w-auto"
                        onClick={() => { setShowPaymentConfirm2(false); setPaymentEditUnlocked(true); toast({ title: 'Edición habilitada', description: 'Ahora puedes editar el estado de pago.' }); }}
                      >
                        Sí, habilitar edición
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bookingStatus">Estado de reserva</Label>
                <Select value={editBookingStatus} onValueChange={(v) => setEditBookingStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper"
                    side="bottom"
                    align="center"
                    sideOffset={2}
                    avoidCollisions={true}
                    collisionPadding={8}
                    sticky="always"
                  >
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="requested">Solicitada</SelectItem>
                    <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="new">Nueva</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>
                {editBookingStatus === 'no_show' && editPaymentStatus !== 'paid' && (
                  <p className="text-xs text-amber-600 mt-1">
                    💡 Puedes cobrar una penalización parcial usando el botón "Cobrar Cita"
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Códigos de la Reserva
              </Label>
              
              <div className="flex flex-wrap gap-2">
                {codes.map((code) => (
                  <Badge
                    key={code.id}
                    variant={editBookingCodes.includes(code.code) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    style={{
                      backgroundColor: editBookingCodes.includes(code.code) ? code.color : 'transparent',
                      borderColor: code.color,
                      color: editBookingCodes.includes(code.code) ? 'white' : code.color
                    }}
                    onClick={() => {
                      const newCodes = editBookingCodes.includes(code.code)
                        ? editBookingCodes.filter(c => c !== code.code)
                        : [...editBookingCodes, code.code];
                      setEditBookingCodes(newCodes);
                    }}
                  >
                    {code.code} - {code.name}
                  </Badge>
                ))}
              </div>
              
              {editingBooking?.profiles?.id && (
                <div>
                  <Label className="text-xs text-muted-foreground">Códigos del cliente:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getAssignmentsByEntity('client', editingBooking.profiles.id).map((assignment) => (
                      <Badge 
                        key={assignment.id}
                        variant="outline"
                        className="text-xs"
                        style={{ 
                          borderColor: assignment.code_color,
                          color: assignment.code_color,
                          backgroundColor: `${assignment.code_color}10`
                        }}
                      >
                        {assignment.code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notesEdit">Notas internas</Label>
              <Textarea
                id="notesEdit"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={4}
                placeholder="Añade notas internas..."
              />
            </div>

            <div className="space-y-3">
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  size="sm" 
                  onClick={() => {
                    try {
                      // Reset payment state when opening payment modal
                      setPaymentAmount(editingBooking?.total_price_cents ? (editingBooking.total_price_cents / 100) : 0);
                      setCaptureAmountInput('');
                      setPenaltyPercentage(100);
                      setPaymentMethod('');
                      setPaymentNotes('');
                      setShowPaymentModal(true);
                    } catch (error) {
                      console.error('Error opening payment modal:', error);
                      toast({
                        title: 'Error',
                        description: 'No se pudo abrir el modal de pago.',
                        variant: 'destructive'
                      });
                    }
                  }}
                  className="flex-1"
                  disabled={editPaymentStatus === 'paid'}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {editPaymentStatus === 'paid' ? 'Ya Pagado' : 'Cobrar Cita'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" /> Borrar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="mx-4 sm:mx-auto">
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Borrar reserva?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción elimina la reserva definitivamente. No se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteBooking(editingBooking?.id)}
                        className="w-full sm:w-auto"
                      >
                        Sí, borrar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => { setShowEditModal(false); setEditingBooking(null); setPaymentEditUnlocked(false); }}
                >
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => saveBookingEdits()}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" /> Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AppModal>
    </>
  ) : null;

  return (
    <>
      {mainView}
      {bookingModal}
      {editBookingModal}
      {paymentModal}
    </>
  );
};

export default AdvancedCalendarView;
