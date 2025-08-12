import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Search, 
  Filter, 
  Plus,
  Edit3,
  Trash2,
  Users,
  MapPin,
  Phone,
  Mail,
  CalendarDays,
  Settings,
  Ban
} from 'lucide-react';
import { format, addDays, subDays, startOfDay, addMinutes, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBookings, useCenters, useEmployees, useLanes } from '@/hooks/useDatabase';
import { useToast } from '@/hooks/use-toast';

interface BookingSlot {
  id: string;
  clientName: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  price: number;
  employeeId: string;
  laneId: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
}

const DailyAgendaView = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCenter, setSelectedCenter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingSlot | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'lanes' | 'employees'>('lanes');

  const { bookings, loading: bookingsLoading } = useBookings();
  const { centers } = useCenters();
  const { employees } = useEmployees();
  const { lanes } = useLanes();

  // Time slots (every 30 minutes from 9:00 to 21:00 for better compactness)
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 9;
    const endHour = 21;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === endHour && minute > 0) break;
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Filter bookings for selected date and center
  const filteredBookings = bookings.filter(booking => {
    if (!booking.booking_datetime) return false;
    
    const bookingDate = parseISO(booking.booking_datetime);
    const matchesDate = isSameDay(bookingDate, selectedDate);
    const matchesCenter = selectedCenter === 'all' || booking.center_id === selectedCenter;
    const matchesSearch = searchTerm === '' || 
      booking.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.services?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesDate && matchesCenter && matchesSearch;
  });

  // Get columns (lanes or employees) - filter active ones
  const getColumns = () => {
    if (viewMode === 'lanes') {
      const filtered = selectedCenter === 'all' 
        ? lanes.filter(lane => lane.active !== false)
        : lanes.filter(lane => lane.center_id === selectedCenter && lane.active !== false);
      return filtered.slice(0, 6); // Limit to 6 columns for responsiveness
    } else {
      const filtered = selectedCenter === 'all'
        ? employees.filter(emp => emp.active !== false)
        : employees.filter(emp => emp.center_id === selectedCenter && emp.active !== false);
      return filtered.slice(0, 6); // Limit to 6 columns for responsiveness
    }
  };

  const columns = getColumns();

  // Convert booking to slot format
  const convertBookingToSlot = (booking: any): BookingSlot => {
    const startTime = parseISO(booking.booking_datetime);
    const endTime = addMinutes(startTime, booking.duration_minutes || 60);
    
    return {
      id: booking.id,
      clientName: `${booking.profiles?.first_name || ''} ${booking.profiles?.last_name || ''}`.trim() || 'Cliente',
      serviceName: booking.services?.name || 'Servicio',
      startTime,
      endTime,
      status: booking.status,
      price: booking.total_price_cents / 100,
      employeeId: booking.employee_id,
      laneId: booking.lane_id,
      clientEmail: booking.profiles?.email,
      clientPhone: booking.profiles?.phone,
      notes: booking.notes
    };
  };

  // Get booking slots for a specific column and time
  const getBookingForColumnAndTime = (columnId: string, time: Date) => {
    return filteredBookings.find(booking => {
      const slot = convertBookingToSlot(booking);
      const bookingColumn = viewMode === 'lanes' ? slot.laneId : slot.employeeId;
      const bookingStart = slot.startTime;
      const bookingEnd = slot.endTime;
      
      return bookingColumn === columnId && 
             time >= bookingStart && 
             time < bookingEnd;
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 border-green-500 text-green-700';
      case 'pending': return 'bg-yellow-500/20 border-yellow-500 text-yellow-700';
      case 'cancelled': return 'bg-red-500/20 border-red-500 text-red-700';
      case 'completed': return 'bg-blue-500/20 border-blue-500 text-blue-700';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-700';
    }
  };

  // Handle booking click
  const handleBookingClick = (booking: any) => {
    setSelectedBooking(convertBookingToSlot(booking));
    setShowBookingDetails(true);
  };

  // Navigation functions
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-32 lg:w-48"
              />
            </div>

            {/* Center filter */}
            <Select value={selectedCenter} onValueChange={setSelectedCenter}>
              <SelectTrigger className="w-32 lg:w-40">
                <MapPin className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {centers.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View mode toggle */}
            <Select value={viewMode} onValueChange={(value: 'lanes' | 'employees') => setViewMode(value)}>
              <SelectTrigger className="w-28 lg:w-32">
                <Settings className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lanes">Carriles</SelectItem>
                <SelectItem value="employees">Especialistas</SelectItem>
              </SelectContent>
            </Select>

            {/* Add booking button with options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden lg:inline">Nuevo</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => toast({ title: "Crear cita", description: "Selecciona un hueco en la agenda para crear la cita." })}>
                  <Calendar className="h-4 w-4 mr-2" /> Crear cita
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: "Crear bloqueo", description: "Próximamente: bloqueo rápido en la agenda." })}>
                  <Ban className="h-4 w-4 mr-2" /> Crear bloqueo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats - Compact version */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
          <Card className="p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Total</p>
                <p className="text-lg lg:text-2xl font-bold">{filteredBookings.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Confirmadas</p>
                <p className="text-lg lg:text-2xl font-bold text-green-600">
                  {filteredBookings.filter(b => b.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Pendientes</p>
                <p className="text-lg lg:text-2xl font-bold text-yellow-600">
                  {filteredBookings.filter(b => b.status === 'pending').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-primary" />
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Ingresos</p>
                <p className="text-lg lg:text-2xl font-bold">
                  €{filteredBookings.reduce((sum, b) => sum + ((b.total_price_cents || 0) / 100), 0).toFixed(0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Agenda Grid - Compact */}
        <Card>
          <CardContent className="p-0">
            <div className="border-b p-2 lg:p-4">
              <h3 className="font-semibold text-base lg:text-lg">
                Agenda del {format(selectedDate, "d MMM", { locale: es })}
              </h3>
            </div>
            
            <ScrollArea className="h-[400px] lg:h-[500px]">
              <div className="relative">
                {/* Header - Responsive */}
                <div className="sticky top-0 z-10 bg-background border-b">
                  <div className={cn(
                    "grid gap-0",
                    columns.length <= 3 ? "grid-cols-[60px_repeat(auto-fit,minmax(120px,1fr))]" : "grid-cols-[60px_repeat(auto-fit,minmax(100px,1fr))]"
                  )}>
                    <div className="p-2 text-center font-medium border-r bg-muted/50 text-xs lg:text-sm">
                      Hora
                    </div>
                    {columns.map((column) => (
                      <div key={column.id} className="p-2 text-center font-medium border-r bg-muted/50">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-xs lg:text-sm truncate">{(column.name || '').replace(/ra[ií]l/gi, 'Carril')}</span>
                          {viewMode === 'employees' && column.specialties && (
                            <Badge variant="secondary" className="text-xs hidden lg:inline-flex">
                              {column.specialties.length} esp.
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time slots - Compact */}
                <div className={cn(
                  "grid gap-0",
                  columns.length <= 3 ? "grid-cols-[60px_repeat(auto-fit,minmax(120px,1fr))]" : "grid-cols-[60px_repeat(auto-fit,minmax(100px,1fr))]"
                )}>
                  {timeSlots.map((timeSlot, timeIndex) => (
                    <React.Fragment key={timeIndex}>
                      {/* Time label - Compact */}
                      <div className="p-1 text-center text-xs lg:text-sm border-r border-b bg-muted/30 font-medium">
                        {format(timeSlot, 'HH:mm')}
                      </div>

                      {/* Column slots - Compact */}
                      {columns.map((column) => {
                        const booking = getBookingForColumnAndTime(column.id, timeSlot);
                        const isFirstSlotOfBooking = booking && 
                          format(timeSlot, 'HH:mm') === format(convertBookingToSlot(booking).startTime, 'HH:mm');

                        return (
                          <div
                            key={`${column.id}-${timeIndex}`}
                            className="relative border-r border-b min-h-[40px] lg:min-h-[50px] hover:bg-muted/20 transition-colors overflow-hidden"
                          >
                            {booking && isFirstSlotOfBooking && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute top-1 left-1 right-1 rounded border-l-4 p-1 lg:p-2 cursor-pointer transition-all hover:shadow-md",
                                      getStatusColor(booking.status)
                                    )}
                                    style={{
                                      height: `${Math.ceil((convertBookingToSlot(booking).endTime.getTime() - convertBookingToSlot(booking).startTime.getTime()) / (30 * 60 * 1000)) * 40 - 4}px`,
                                      minWidth: 0,
                                      maxWidth: '100%'
                                    }}
                                    onClick={() => handleBookingClick(booking)}
                                  >
                                    <div className="text-xs font-semibold truncate w-full">
                                      {convertBookingToSlot(booking).clientName}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate w-full hidden lg:block">
                                      {convertBookingToSlot(booking).serviceName}
                                    </div>
                                    <div className="text-xs font-medium truncate w-full">
                                      €{convertBookingToSlot(booking).price}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate w-full hidden lg:block">
                                      {format(convertBookingToSlot(booking).startTime, 'HH:mm')}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-sm">
                                  <div className="space-y-2">
                                    <div className="font-semibold">{convertBookingToSlot(booking).clientName}</div>
                                    <div className="text-sm space-y-1">
                                      <div>📅 {format(convertBookingToSlot(booking).startTime, 'HH:mm')} - {format(convertBookingToSlot(booking).endTime, 'HH:mm')}</div>
                                      <div>💼 {convertBookingToSlot(booking).serviceName}</div>
                                      <div>💰 €{convertBookingToSlot(booking).price}</div>
                                      <div>📊 {convertBookingToSlot(booking).status}</div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Booking Details Dialog */}
        <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
          <DialogContent className="w-[96vw] sm:max-w-md p-0">
            <div className="flex flex-col max-h-[85vh]">
              <DialogHeader className="px-4 pt-4 pb-2 border-b">
                <DialogTitle>Detalles de la Reserva</DialogTitle>
                <DialogDescription>
                  Información completa de la reserva seleccionada
                </DialogDescription>
              </DialogHeader>
              
              {selectedBooking && (
                <>
                  <div className="space-y-4 px-4 py-3 overflow-auto flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{selectedBooking.clientName}</h3>
                      <Badge className={getStatusColor(selectedBooking.status)}>
                        {selectedBooking.status}
                      </Badge>
                    </div>
    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(selectedBooking.startTime, "d 'de' MMMM 'de' yyyy", { locale: es })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(selectedBooking.startTime, 'HH:mm')} - {format(selectedBooking.endTime, 'HH:mm')}
                        </span>
                      </div>
    
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded bg-primary" />
                        <span className="text-sm">{selectedBooking.serviceName}</span>
                      </div>
    
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 text-green-600">€</div>
                        <span className="text-sm font-medium">€{selectedBooking.price}</span>
                      </div>
    
                      {selectedBooking.clientEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedBooking.clientEmail}</span>
                        </div>
                      )}
    
                      {selectedBooking.clientPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedBooking.clientPhone}</span>
                        </div>
                      )}
    
                      {selectedBooking.notes && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Notas:</p>
                          <p className="text-sm">{selectedBooking.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="sticky bottom-0 px-4 py-3 border-t bg-background">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit3 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowBookingDetails(false)}>
                        Cerrar
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default DailyAgendaView;