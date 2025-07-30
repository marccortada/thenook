import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  User,
  Clock,
  Plus
} from 'lucide-react';
import { format, addDays, subDays, startOfDay, addMinutes, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBookings, useCenters, useEmployees } from '@/hooks/useDatabase';

const SimpleCenterCalendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  const { bookings, loading: bookingsLoading } = useBookings();
  const { centers } = useCenters();
  const { employees } = useEmployees();

  // Time slots every 30 minutes from 9:00 to 21:00
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 21 && minute > 0) break;
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Filter bookings for selected date
  const getBookingsForDate = (centerId: string) => {
    return bookings.filter(booking => {
      if (!booking.booking_datetime) return false;
      const bookingDate = parseISO(booking.booking_datetime);
      return isSameDay(bookingDate, selectedDate) && booking.center_id === centerId;
    });
  };

  // Get employees for a specific center
  const getEmployeesForCenter = (centerId: string) => {
    return employees.filter(emp => emp.center_id === centerId && emp.active !== false);
  };

  // Get booking for specific time and employee
  const getBookingForTimeAndEmployee = (centerId: string, timeSlot: Date, employeeId?: string) => {
    const centerBookings = getBookingsForDate(centerId);
    return centerBookings.find(booking => {
      const bookingStart = parseISO(booking.booking_datetime);
      const bookingEnd = addMinutes(bookingStart, booking.duration_minutes || 60);
      
      const matchesTime = timeSlot >= bookingStart && timeSlot < bookingEnd;
      const matchesEmployee = !employeeId || booking.employee_id === employeeId;
      
      return matchesTime && matchesEmployee;
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 border-green-500 text-green-700';
      case 'pending': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'cancelled': return 'bg-red-100 border-red-500 text-red-700';
      case 'completed': return 'bg-blue-100 border-blue-500 text-blue-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  // Navigation functions
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));

  // Render calendar for a specific center
  const renderCenterCalendar = (center: any) => {
    const centerEmployees = getEmployeesForCenter(center.id);
    const centerBookings = getBookingsForDate(center.id);
    
    return (
      <div className="space-y-4">
        {/* Stats for this center */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{centerBookings.length}</div>
              <div className="text-sm text-muted-foreground">Total Reservas</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {centerBookings.filter(b => b.status === 'confirmed').length}
              </div>
              <div className="text-sm text-muted-foreground">Confirmadas</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                €{centerBookings.reduce((sum, b) => sum + ((b.total_price_cents || 0) / 100), 0).toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">Ingresos</div>
            </div>
          </Card>
        </div>

        {/* Employee selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">Especialista:</span>
          </div>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todos los especialistas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los especialistas</SelectItem>
              {centerEmployees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.profiles?.first_name} {employee.profiles?.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Reserva
          </Button>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-[80px_1fr] gap-0">
                {/* Time labels */}
                <div className="border-r bg-muted/30">
                  <div className="h-12 border-b flex items-center justify-center font-medium text-sm">
                    Hora
                  </div>
                  {timeSlots.map((timeSlot, index) => (
                    <div key={index} className="h-16 border-b flex items-center justify-center text-sm font-medium">
                      {format(timeSlot, 'HH:mm')}
                    </div>
                  ))}
                </div>

                {/* Appointments column */}
                <div>
                  <div className="h-12 border-b flex items-center justify-center font-medium bg-muted/30">
                    Reservas del día
                  </div>
                  {timeSlots.map((timeSlot, timeIndex) => {
                    const booking = getBookingForTimeAndEmployee(center.id, timeSlot, selectedEmployeeId);
                    const isFirstSlotOfBooking = booking && 
                      format(timeSlot, 'HH:mm') === format(parseISO(booking.booking_datetime), 'HH:mm');

                    return (
                      <div
                        key={timeIndex}
                        className="relative h-16 border-b hover:bg-muted/20 transition-colors"
                      >
                        {booking && isFirstSlotOfBooking && (
                          <div
                            className={cn(
                              "absolute inset-1 rounded border-l-4 p-2 cursor-pointer transition-all hover:shadow-md",
                              getStatusColor(booking.status)
                            )}
                            style={{
                              height: `${Math.ceil((booking.duration_minutes || 60) / 30) * 64 - 4}px`
                            }}
                          >
                            <div className="text-sm font-semibold truncate">
                              {booking.profiles?.first_name} {booking.profiles?.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {booking.services?.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                €{((booking.total_price_cents || 0) / 100).toFixed(0)}
                              </Badge>
                              {booking.employee_id && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {employees.find(e => e.id === booking.employee_id)?.profiles?.first_name}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (bookingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Cargando calendario...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between">
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
      </div>

      {/* Calendars by Center */}
      <Tabs defaultValue={centers[0]?.id} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          {centers.map((center) => (
            <TabsTrigger key={center.id} value={center.id} className="text-sm">
              {center.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {centers.map((center) => (
          <TabsContent key={center.id} value={center.id} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Calendario - {center.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderCenterCalendar(center)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default SimpleCenterCalendar;