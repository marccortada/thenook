import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Clock, MapPin, User, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCenters, useServices, useEmployees, useLanes, useBookings } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ReservationSystem = () => {
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

  const { services } = useServices(formData.center);

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

  // Filter employees and lanes based on selected center
  const availableEmployees = employees.filter(emp => 
    emp.center_id === formData.center && emp.active
  );
  
  const availableLanes = lanes.filter(lane => 
    lane.center_id === formData.center && lane.active
  );

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
      // First create a client profile
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .insert([{
          email: formData.clientEmail || `cliente_${Date.now()}@temp.com`,
          first_name: formData.clientName.split(' ')[0],
          last_name: formData.clientName.split(' ').slice(1).join(' ') || '',
          phone: formData.clientPhone,
          role: 'client'
        }])
        .select()
        .single();

      if (profileError) throw profileError;

      // Get service details for pricing
      const selectedService = services.find(s => s.id === formData.service);
      if (!selectedService) throw new Error('Servicio no encontrado');

      // Create the booking datetime
      const bookingDate = new Date(formData.date!);
      const [hours, minutes] = formData.time.split(':');
      bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const bookingData = {
        client_id: profile?.id,
        service_id: formData.service,
        package_id: null,
        center_id: formData.center,
        lane_id: formData.lane || availableLanes[0]?.id,
        employee_id: formData.employee || availableEmployees[0]?.id,
        booking_datetime: bookingDate.toISOString(),
        duration_minutes: selectedService.duration_minutes,
        total_price_cents: selectedService.price_cents,
        status: 'pending' as const,
        channel: 'web' as const,
        notes: formData.notes || null,
        stripe_session_id: null,
        payment_status: 'pending' as const,
      };

      await createBooking(bookingData);

      toast({
        title: "Reserva Creada",
        description: `Reserva para ${formData.clientName} confirmada exitosamente`,
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
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la reserva. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const selectedService = services.find(s => s.id === formData.service);
  const selectedCenter = centers.find(c => c.id === formData.center);

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5" />
            <span>Nueva Reserva</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Information */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Información del Cliente</span>
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

            {/* Service Selection */}
            <div className="space-y-4">
              <h3 className="font-medium">Selección de Servicio</h3>
              
              <div>
                <Label htmlFor="service">Servicio *</Label>
                <Select value={formData.service} onValueChange={(value) => setFormData({ ...formData, service: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {service.duration_minutes}min - €{(service.price_cents / 100).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="center">Centro *</Label>
                <Select value={formData.center} onValueChange={(value) => setFormData({ ...formData, center: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un centro" />
                  </SelectTrigger>
                  <SelectContent>
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
                     <PopoverContent className="w-auto p-0" align="start">
                       <Calendar
                         mode="single"
                         selected={formData.date}
                         onSelect={(date) => setFormData({ ...formData, date })}
                         disabled={(date) => date < new Date()}
                         initialFocus
                         className="p-3 pointer-events-auto"
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
                    <SelectContent>
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

            {/* Summary */}
            {selectedService && (
              <div className="p-4 bg-accent/20 rounded-lg">
                <h4 className="font-medium mb-2">Resumen de la Reserva</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Servicio:</strong> {selectedService.name}</p>
                  <p><strong>Duración:</strong> {selectedService.duration_minutes} minutos</p>
                   <p><strong>Precio:</strong> €{(selectedService.price_cents / 100).toFixed(2)}</p>
                   {formData.date && formData.time && (
                     <p><strong>Fecha:</strong> {format(formData.date, "PPP", { locale: es })} a las {formData.time}</p>
                   )}
                 </div>

            {/* Employee and Lane Selection */}
            {formData.center && (
              <div className="space-y-4">
                <h3 className="font-medium">Asignación</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee">Terapeuta</Label>
                    <Select value={formData.employee} onValueChange={(value) => setFormData({ ...formData, employee: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un terapeuta" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEmployees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.profiles?.first_name} {employee.profiles?.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="lane">Sala</Label>
                    <Select value={formData.lane} onValueChange={(value) => setFormData({ ...formData, lane: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una sala" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLanes.map((lane) => (
                          <SelectItem key={lane.id} value={lane.id}>
                            {lane.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg">
              Crear Reserva
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReservationSystem;