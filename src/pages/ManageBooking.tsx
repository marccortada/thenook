import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarIcon, Search, Phone, Mail, MapPin, Clock, User, Calendar as CalendarDays, Edit, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSelector } from "@/components/LanguageSelector";

interface Booking {
  id: string;
  booking_datetime: string;
  duration_minutes: number;
  status: string;
  notes: string;
  centers: { name: string } | null;
  services: { name: string } | null;
  profiles: { first_name: string; last_name: string; email: string; phone: string } | null;
}

const ManageBooking = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchData, setSearchData] = useState({
    email: "",
    phone: "",
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    date: undefined as Date | undefined,
    time: "",
  });

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

  const searchBookings = async () => {
    if (!searchData.email && !searchData.phone) {
      toast({
        title: t('error'),
        description: t('enter_email_or_phone'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Search for bookings by email or phone
      let query = supabase
        .from('bookings')
        .select(`
          id,
          booking_datetime,
          duration_minutes,
          status,
          notes,
          centers(name),
          services(name),
          profiles(first_name, last_name, email, phone)
        `)
        .gte('booking_datetime', new Date().toISOString())
        .neq('status', 'cancelled')
        .order('booking_datetime', { ascending: true });

      if (searchData.email) {
        const { data: profilesWithEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', searchData.email.toLowerCase());
        
        if (profilesWithEmail && profilesWithEmail.length > 0) {
          query = query.in('client_id', profilesWithEmail.map(p => p.id));
        } else {
          setBookings([]);
          setLoading(false);
          return;
        }
      } else if (searchData.phone) {
        const { data: profilesWithPhone } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', searchData.phone);
        
        if (profilesWithPhone && profilesWithPhone.length > 0) {
          query = query.in('client_id', profilesWithPhone.map(p => p.id));
        } else {
          setBookings([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setBookings(data || []);
      
      if (!data || data.length === 0) {
        toast({
          title: "No se encontraron reservas",
          description: "No hemos encontrado ninguna reserva con estos datos. Por favor, revisa tu información.",
        });
      }
    } catch (error) {
      console.error('Error searching bookings:', error);
      toast({
        title: "Error",
        description: "Error al buscar reservas. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (booking: Booking) => {
    setEditingBooking(booking);
    const bookingDate = new Date(booking.booking_datetime);
    setEditForm({
      date: bookingDate,
      time: format(bookingDate, "HH:mm"),
    });
  };

  const saveEdit = async () => {
    if (!editingBooking || !editForm.date || !editForm.time) {
      toast({
        title: "Error",
        description: "Por favor selecciona fecha y hora",
        variant: "destructive",
      });
      return;
    }

    try {
      const newDateTime = new Date(editForm.date);
      const [hours, minutes] = editForm.time.split(':');
      newDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase
        .from('bookings')
        .update({
          booking_datetime: newDateTime.toISOString(),
        })
        .eq('id', editingBooking.id);

      if (error) throw error;

      toast({
        title: "Reserva actualizada",
        description: "Tu reserva ha sido modificada exitosamente",
      });

      setEditingBooking(null);
      searchBookings(); // Refresh the list
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la reserva",
        variant: "destructive",
      });
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Reserva cancelada",
        description: "Tu reserva ha sido cancelada exitosamente",
      });

      searchBookings(); // Refresh the list
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la reserva",
        variant: "destructive",
      });
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
            <div className="flex items-center space-x-2">
              <LanguageSelector />
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs sm:text-sm"
              >
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('back')}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs sm:text-sm"
              >
                <Link to="/admin-login">{t('admin')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="hover-lift glass-effect border-primary/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Mis Reservas</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Introduce tu email o teléfono para buscar tus reservas
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {/* Search Form */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="text-sm flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={searchData.email}
                      onChange={(e) => setSearchData({ ...searchData, email: e.target.value })}
                      placeholder="tu@email.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>Teléfono</span>
                    </Label>
                    <Input
                      id="phone"
                      value={searchData.phone}
                      onChange={(e) => setSearchData({ ...searchData, phone: e.target.value })}
                      placeholder="+34 600 000 000"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button onClick={searchBookings} disabled={loading} className="w-full">
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Buscando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4" />
                      <span>Buscar mis reservas</span>
                    </div>
                  )}
                </Button>
              </div>

              {/* Bookings List */}
              {bookings.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Tus Reservas</h3>
                  {bookings.map((booking) => (
                    <Card key={booking.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex flex-col space-y-3">
                          {/* Booking Info */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-sm">
                                <CalendarDays className="h-4 w-4 text-primary" />
                                <span className="font-medium">
                                  {format(new Date(booking.booking_datetime), "PPP", { locale: es })}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm">
                                <Clock className="h-4 w-4 text-primary" />
                                <span>
                                  {format(new Date(booking.booking_datetime), "HH:mm")} 
                                  ({booking.duration_minutes} min)
                                </span>
                              </div>
                              {booking.centers && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <MapPin className="h-4 w-4 text-primary" />
                                  <span>{booking.centers.name}</span>
                                </div>
                              )}
                              {booking.services && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <User className="h-4 w-4 text-primary" />
                                  <span>{booking.services.name}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-3 sm:mt-0">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const { data, error } = await supabase.functions.invoke("create-checkout", {
                                      body: {
                                        intent: "booking_payment",
                                        booking_payment: { booking_id: booking.id },
                                        currency: "eur",
                                      },
                                    });
                                    if (error) throw error;
                                    if (data?.url) window.open(data.url, "_blank");
                                  } catch (e: any) {
                                    toast({ title: "No se pudo iniciar el pago", description: e.message, variant: "destructive" });
                                  }
                                }}
                              >
                                Pagar ahora
                              </Button>
                            </div>
                          </div>
                          
                          {booking.notes && (
                            <div className="bg-muted/50 rounded-lg p-3">
                              <p className="text-sm text-muted-foreground">
                                <strong>Notas:</strong> {booking.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Edit Modal */}
              {editingBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                  <Card className="w-full max-w-md">
                    <CardHeader>
                      <CardTitle>Modificar Reserva</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Nueva Fecha</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1",
                                !editForm.date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editForm.date ? format(editForm.date, "PPP", { locale: es }) : "Selecciona fecha"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={editForm.date}
                              onSelect={(date) => setEditForm({ ...editForm, date })}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label>Nueva Hora</Label>
                        <Select value={editForm.time} onValueChange={(value) => setEditForm({ ...editForm, time: value })}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecciona hora" />
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

                      <div className="flex space-x-2 pt-4">
                        <Button variant="outline" onClick={() => setEditingBooking(null)} className="flex-1">
                          Cancelar
                        </Button>
                        <Button onClick={saveEdit} className="flex-1">
                          Guardar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ManageBooking;