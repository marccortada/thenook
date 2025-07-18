import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Clock, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ReservationSystem = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    service: "",
    center: "",
    date: "",
    time: "",
    notes: "",
  });

  const services = [
    { id: "massage-relaxing", name: "Masaje Relajante", duration: 60, price: 60 },
    { id: "massage-sports", name: "Masaje Deportivo", duration: 90, price: 80 },
    { id: "facial-treatment", name: "Tratamiento Facial", duration: 45, price: 55 },
  ];

  const centers = [
    { id: "madrid-centro", name: "Madrid Centro", address: "Calle Gran Vía 123" },
    { id: "madrid-salamanca", name: "Madrid Salamanca", address: "Calle Serrano 456" },
  ];

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

  const handleSubmit = (e: React.FormEvent) => {
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
      date: "",
      time: "",
      notes: "",
    });
  };

  const selectedService = services.find(s => s.id === formData.service);

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
                        {service.name} - {service.duration}min - €{service.price}
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
                          <span>{center.name} - {center.address}</span>
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
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
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
                  <p><strong>Duración:</strong> {selectedService.duration} minutos</p>
                  <p><strong>Precio:</strong> €{selectedService.price}</p>
                  {formData.date && formData.time && (
                    <p><strong>Fecha:</strong> {new Date(formData.date).toLocaleDateString('es-ES')} a las {formData.time}</p>
                  )}
                </div>
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