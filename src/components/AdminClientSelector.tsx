import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Calendar, Phone, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  created_at: string;
  last_booking?: {
    booking_datetime: string;
    service_name: string;
  };
}

interface AdminClientSelectorProps {
  onClientSelect: (client: Client) => void;
}

export default function AdminClientSelector({ onClientSelect }: AdminClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          created_at
        `)
        .eq('role', 'client')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get last booking for each client
      const clientsWithBookings = await Promise.all(
        (data || []).map(async (client) => {
          const { data: lastBooking } = await supabase
            .from('bookings')
            .select(`
              booking_datetime,
              services(name)
            `)
            .eq('client_id', client.id)
            .order('booking_datetime', { ascending: false })
            .limit(1)
            .single();

          return {
            ...client,
            last_booking: lastBooking ? {
              booking_datetime: lastBooking.booking_datetime,
              service_name: lastBooking.services?.name || 'Sin servicio'
            } : undefined
          };
        })
      );

      setClients(clientsWithBookings);
      setFilteredClients(clientsWithBookings);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(client => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const email = client.email.toLowerCase();
      const phone = client.phone || '';
      const search = searchTerm.toLowerCase();

      return fullName.includes(search) || 
             email.includes(search) || 
             phone.includes(search);
    });

    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const handleClientSelect = (client: Client) => {
    onClientSelect(client);
    setIsOpen(false);
    setSearchTerm("");
    toast({
      title: "Cliente seleccionado",
      description: `${client.first_name} ${client.last_name} seleccionado para la reserva`
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          type="button"
          variant="outline" 
          className="w-full flex items-center gap-2"
          size="lg"
        >
          <Users className="h-4 w-4" />
          Ver Clientes Existentes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Seleccionar Cliente Existente
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Clients List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando clientes...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No se encontraron clientes con ese criterio' : 'No hay clientes registrados'}
                </p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <Card 
                  key={client.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary/20"
                  onClick={() => handleClientSelect(client)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">
                            {client.first_name} {client.last_name}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            Cliente
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span>{client.email}</span>
                          </div>
                          {client.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>

                        {client.last_booking && (
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Última cita: </span>
                              <span className="font-medium">
                                {format(new Date(client.last_booking.booking_datetime), 'dd/MM/yyyy', { locale: es })}
                              </span>
                              <span>- {client.last_booking.service_name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClientSelect(client);
                        }}
                      >
                        Seleccionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}