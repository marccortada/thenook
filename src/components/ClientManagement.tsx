import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useClients, Client, ClientBooking } from "@/hooks/useClients";
import { Calendar, Clock, DollarSign, Edit, Eye, User, Phone, Mail, Tags, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MobileResponsiveLayout from "@/components/MobileResponsiveLayout";
import MobileCard from "@/components/MobileCard";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ClientManagement() {
  const { clients, loading, error, updateClient, fetchClientBookings } = useClients();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    document.title = "Gestión de Clientes | The Nook Madrid";
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <MobileResponsiveLayout padding="md">
          <h1 className={`font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent ${
            isMobile ? 'text-lg' : 'text-2xl'
          }`}>
            Gestión de Clientes - The Nook Madrid
          </h1>
        </MobileResponsiveLayout>
      </header>

      <main className="py-4 sm:py-8">
        <MobileResponsiveLayout maxWidth="7xl" padding="md">
          <div className="space-y-4 sm:space-y-6">
            {clients.map((client) => (
              <MobileCard key={client.id} className="client-card" padding="sm">
                <div className="space-y-3 sm:space-y-4">
                  {/* Header Mobile/Desktop */}
                  <div className={`${isMobile ? 'space-y-3' : 'flex justify-between items-start'}`}>
                    <div className="space-y-2">
                      <div className={`font-semibold flex items-center gap-2 ${
                        isMobile ? 'text-base' : 'text-lg'
                      }`}>
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                        {client.first_name} {client.last_name}
                      </div>
                      <div className={`${
                        isMobile ? 'flex flex-col gap-1' : 'flex items-center gap-4'
                      } text-xs sm:text-sm text-muted-foreground`}>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="truncate">{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="truncate">{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`${isMobile ? 'flex justify-between items-center' : 'text-right'} space-y-2`}>
                      <div className="space-y-1">
                        <div className={`font-bold text-primary ${
                          isMobile ? 'text-base' : 'text-lg'
                        }`}>
                          {(client.total_spent || 0) / 100}€ gastados
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {client.total_bookings || 0} citas
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className={`grid gap-3 sm:gap-4 ${
                    isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  }`}>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Fecha registro</Label>
                      <p className="font-medium text-sm sm:text-base truncate">
                        {format(new Date(client.created_at), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Última cita</Label>
                      <p className="font-medium text-sm sm:text-base truncate">
                        {client.last_booking ? 
                          format(new Date(client.last_booking), 'dd/MM/yyyy', { locale: es }) : 
                          'Sin citas'
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Estado</Label>
                      <Badge className={client.total_bookings ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {client.total_bookings ? 'Activo' : 'Nuevo'}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`pt-3 sm:pt-4 border-t ${
                    isMobile ? 'flex justify-center' : 'flex justify-end'
                  }`}>
                    <ClientModal 
                      client={client} 
                      onClientUpdated={() => {}} 
                    />
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        </MobileResponsiveLayout>
      </main>
    </div>
  );
}

// Componente individual para cada modal de cliente
interface ClientModalProps {
  client: Client;
  onClientUpdated: () => void;
}

function ClientModal({ client, onClientUpdated }: ClientModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientBookings, setClientBookings] = useState<ClientBooking[]>([]);
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { updateClient, fetchClientBookings } = useClients();

  const handleOpenModal = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Obtener la tarjeta completa (parent del botón)
    const cardElement = event.currentTarget.closest('.client-card') as HTMLElement;
    if (!cardElement) return;
    
    const cardRect = cardElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    // Dimensiones del modal
    const modalWidth = Math.min(500, windowWidth - 40);
    const modalHeight = Math.min(600, windowHeight - 80);
    
    // Calcular posición
    let top = cardRect.top + scrollTop - 50; // Un poco arriba de la tarjeta
    let left = (windowWidth - modalWidth) / 2; // Centrado horizontalmente
    
    // Ajustar verticalmente para que esté siempre visible
    const viewportTop = scrollTop + 20;
    const viewportBottom = scrollTop + windowHeight - 20;
    
    if (top < viewportTop) {
      top = viewportTop;
    } else if (top + modalHeight > viewportBottom) {
      top = viewportBottom - modalHeight;
    }
    
    // Asegurar que no se salga horizontalmente
    if (left < 20) left = 20;
    if (left + modalWidth > windowWidth - 20) left = windowWidth - modalWidth - 20;
    
    console.log('Modal position:', { top, left, cardTop: cardRect.top, scrollTop });
    
    setModalPosition({ top, left });
    
    // Fetch client bookings
    const bookings = await fetchClientBookings(client.id);
    setClientBookings(bookings);
    
    setIsOpen(true);
  };

  const handleEditClient = () => {
    setEditingClient(client);
    setEditData({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone || ''
    });
  };

  const handleSaveClient = async () => {
    if (!editingClient) return;
    
    try {
      await updateClient(editingClient.id, editData);
      setEditingClient(null);
      onClientUpdated();
      toast({
        title: "Éxito",
        description: "Cliente actualizado correctamente",
      });
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el cliente",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setEditData({
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
    });
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditingClient(null);
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        className="flex items-center gap-2"
        variant="outline"
      >
        <Eye className="h-4 w-4" />
        Ver Detalles
      </Button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeModal}
          />
          
          {/* Modal */}
          <div 
            className="fixed z-50 bg-white rounded-lg shadow-2xl border"
            style={{
              top: `${modalPosition.top}px`,
              left: `${modalPosition.left}px`,
              width: `${isMobile ? Math.min(350, window.innerWidth - 20) : Math.min(500, window.innerWidth - 40)}px`,
              maxHeight: `${isMobile ? window.innerHeight - 40 : Math.min(600, window.innerHeight - 80)}px`,
              overflowY: 'auto'
            }}
          >
            <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
              {/* Header */}
              <div className={`flex items-center justify-between ${isMobile ? 'mb-4' : 'mb-6'}`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <User className={`text-primary ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                  <h3 className={`font-semibold ${isMobile ? 'text-lg' : 'text-xl'}`}>
                    {client.first_name} {client.last_name}
                  </h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Content */}
              <div className="space-y-3 sm:space-y-4">
                {/* Información Personal */}
                <div className={`bg-gray-50 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                  <h4 className={`font-semibold ${isMobile ? 'mb-2 text-sm' : 'mb-3'} flex items-center gap-2`}>
                    <User className="h-4 w-4" />
                    Información Personal
                  </h4>
                  <div className={`gap-3 text-sm ${
                    isMobile ? 'grid grid-cols-1 space-y-2' : 'grid grid-cols-2'
                  }`}>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Nombre</Label>
                      <Input
                        value={editingClient ? editData.first_name : client.first_name}
                        onChange={editingClient ? 
                          (e) => setEditData({...editData, first_name: e.target.value}) : 
                          undefined
                        }
                        disabled={!editingClient}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Apellidos</Label>
                      <Input
                        value={editingClient ? editData.last_name : client.last_name}
                        onChange={editingClient ? 
                          (e) => setEditData({...editData, last_name: e.target.value}) : 
                          undefined
                        }
                        disabled={!editingClient}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Email</Label>
                      <Input
                        value={editingClient ? editData.email : client.email}
                        onChange={editingClient ? 
                          (e) => setEditData({...editData, email: e.target.value}) : 
                          undefined
                        }
                        disabled={!editingClient}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Teléfono</Label>
                      <Input
                        value={editingClient ? editData.phone : (client.phone || '')}
                        onChange={editingClient ? 
                          (e) => setEditData({...editData, phone: e.target.value}) : 
                          undefined
                        }
                        disabled={!editingClient}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="flex gap-2 mt-3">
                    {editingClient ? (
                      <>
                        <Button
                          onClick={handleSaveClient}
                          className="flex items-center gap-2"
                          size={isMobile ? "sm" : "default"}
                        >
                          Guardar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          size={isMobile ? "sm" : "default"}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleEditClient}
                        variant="outline"
                        className="flex items-center gap-2"
                        size={isMobile ? "sm" : "default"}
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Estadísticas */}
                <div className={`gap-3 ${
                  isMobile ? 'grid grid-cols-1' : 'grid grid-cols-3'
                }`}>
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <Calendar className={`text-blue-600 mx-auto mb-1 ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
                    <div className={`font-bold text-blue-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                      {client.total_bookings || 0}
                    </div>
                    <div className="text-xs text-blue-700">Total Citas</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <DollarSign className={`text-green-600 mx-auto mb-1 ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
                    <div className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                      {((client.total_spent || 0) / 100).toFixed(2)}€
                    </div>
                    <div className="text-xs text-green-700">Total Gastado</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <Clock className={`text-purple-600 mx-auto mb-1 ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
                    <div className={`font-bold text-purple-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                      {client.last_booking ? 
                        format(new Date(client.last_booking), 'dd/MM', { locale: es }) : 
                        'N/A'
                      }
                    </div>
                    <div className="text-xs text-purple-700">Última Cita</div>
                  </div>
                </div>

                {/* Historial de Citas */}
                <div className="bg-white border rounded-lg p-3">
                  <h4 className={`font-semibold ${isMobile ? 'mb-2 text-sm' : 'mb-3'} flex items-center gap-2`}>
                    <Calendar className="h-4 w-4" />
                    Historial ({clientBookings.length} citas)
                  </h4>
                  <div className={`space-y-2 ${isMobile ? 'max-h-40' : 'max-h-48'} overflow-y-auto`}>
                    {clientBookings.length > 0 ? (
                      clientBookings.map((booking) => (
                        <div key={booking.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {format(new Date(booking.booking_datetime), 'dd/MM/yyyy - HH:mm', { locale: es })}
                            </div>
                            <div className={`text-gray-600 truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {booking.service_name}
                            </div>
                          </div>
                          <div className="text-right ml-2">
                            <div className={`font-bold text-green-600 ${isMobile ? 'text-sm' : ''}`}>
                              {(booking.total_price_cents / 100).toFixed(2)}€
                            </div>
                            <Badge className={`text-xs ${
                              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-4 text-sm">
                        No hay citas registradas
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}