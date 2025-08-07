import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Calendar,
  Edit,
  User,
  MapPin,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClients, Client, ClientBooking } from "@/hooks/useClients";
import { useClientNotes } from "@/hooks/useClientNotes";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ClientManagement = () => {
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientBookings, setClientBookings] = useState<ClientBooking[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client>>({});
  const [newNote, setNewNote] = useState({ title: "", content: "", category: "general", priority: "normal" });
  const { toast } = useToast();

  // Use the new hook
  const { clients, loading, updateClient, fetchClientBookings } = useClients();
  
  // Debug logs para diagnosticar problemas de carga
  console.log('🔍 ClientManagement Debug:', {
    clientsCount: clients?.length || 0,
    loading,
    error: 'Revisar en useClients hook',
    clients: clients?.slice(0, 3) // Solo primeros 3 clientes para no saturar console
  });

  // Filter clients based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client => 
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.phone && client.phone.includes(searchQuery))
      );
      setFilteredClients(filtered);
    }
  }, [searchQuery, clients]);

  const handleClientClick = async (client: Client) => {
    setSelectedClient(client);
    setEditingClient(client);
    const bookings = await fetchClientBookings(client.id);
    setClientBookings(bookings);
    setIsDialogOpen(true);
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;
    await updateClient(selectedClient.id, editingClient);
  };

  const { notes, createNote, refetch: refetchNotes } = useClientNotes(selectedClient?.id);

  const handleCreateNote = async () => {
    if (!selectedClient || !newNote.title || !newNote.content) return;

    try {
      await createNote({
        client_id: selectedClient.id,
        title: newNote.title,
        content: newNote.content,
        category: newNote.category as any,
        priority: newNote.priority as any,
      });

      setNewNote({ title: "", content: "", category: "general", priority: "normal" });
      await refetchNotes();
      
      toast({
        title: "Éxito",
        description: "Nota añadida correctamente",
      });
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'no_show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelada';
      case 'completed': return 'Completada';
      case 'no_show': return 'No Show';
      default: return status;
    }
  };

  // Debug visual para verificar que el componente se renderiza
  console.log('🔍 ClientManagement se está renderizando');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Cargando clientes...</span>
        <p className="text-xs text-muted-foreground mt-1">
          Debug: Componente ClientManagement cargando datos...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Gestión de Clientes
        </h2>
        <div className="text-xs bg-muted/50 px-2 py-1 rounded">
          Debug: {clients.length} clientes cargados
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients Grid */}
      <div className="grid gap-4">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No se encontraron clientes</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Prueba con otros términos de búsqueda' : 'Los clientes aparecerán aquí cuando se registren'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card 
              key={client.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleClientClick(client)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">
                        {client.first_name} {client.last_name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex gap-2 mb-2">
                      <Badge variant="secondary">
                        {client.total_bookings} reservas
                      </Badge>
                      <Badge variant="outline">
                        €{((client.total_spent || 0) / 100).toFixed(2)}
                      </Badge>
                    </div>
                    {client.last_booking && (
                      <p className="text-xs text-muted-foreground">
                        Última visita: {format(new Date(client.last_booking), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Client Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Ficha de Cliente: {selectedClient?.first_name} {selectedClient?.last_name}
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="bookings">Reservas</TabsTrigger>
                <TabsTrigger value="notes">Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Datos del Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">Nombre</Label>
                        <Input
                          id="first_name"
                          value={editingClient.first_name || ""}
                          onChange={(e) => setEditingClient({ ...editingClient, first_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Apellidos</Label>
                        <Input
                          id="last_name"
                          value={editingClient.last_name || ""}
                          onChange={(e) => setEditingClient({ ...editingClient, last_name: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editingClient.email || ""}
                        onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={editingClient.phone || ""}
                        onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                      />
                    </div>

                    <Button onClick={handleUpdateClient} className="w-full">
                      <Edit className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estadísticas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">{selectedClient.total_bookings}</p>
                        <p className="text-sm text-muted-foreground">Total Reservas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          €{((selectedClient.total_spent || 0) / 100).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Gastado</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedClient.last_booking 
                            ? format(new Date(selectedClient.last_booking), 'dd/MM/yy', { locale: es })
                            : 'N/A'
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">Última Visita</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bookings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Historial de Reservas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientBookings.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay reservas registradas
                      </p>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {clientBookings.map((booking) => (
                            <div key={booking.id} className="border rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="h-4 w-4" />
                                    <span className="font-medium">
                                      {format(new Date(booking.booking_datetime), 'dd/MM/yyyy HH:mm', { locale: es })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {booking.center_name}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge className={getStatusColor(booking.status)}>
                                    {getStatusText(booking.status)}
                                  </Badge>
                                  <p className="text-sm font-medium mt-1">
                                    €{(booking.total_price_cents / 100).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-sm">
                                <p><strong>Servicio:</strong> {booking.service_name}</p>
                                <p><strong>Duración:</strong> {booking.duration_minutes} min</p>
                                {booking.notes && (
                                  <p><strong>Notas:</strong> {booking.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Añadir Nueva Nota</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="note_title">Título</Label>
                      <Input
                        id="note_title"
                        value={newNote.title}
                        onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                        placeholder="Título de la nota"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="note_category">Categoría</Label>
                        <Select value={newNote.category} onValueChange={(value) => setNewNote({ ...newNote, category: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="preferences">Preferencias</SelectItem>
                            <SelectItem value="medical">Médico</SelectItem>
                            <SelectItem value="allergies">Alergias</SelectItem>
                            <SelectItem value="behavior">Comportamiento</SelectItem>
                            <SelectItem value="payment">Pago</SelectItem>
                            <SelectItem value="complaints">Quejas</SelectItem>
                            <SelectItem value="compliments">Cumplidos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="note_priority">Prioridad</Label>
                        <Select value={newNote.priority} onValueChange={(value) => setNewNote({ ...newNote, priority: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="note_content">Contenido</Label>
                      <Textarea
                        id="note_content"
                        value={newNote.content}
                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                        placeholder="Escribe aquí el contenido de la nota..."
                        rows={3}
                      />
                    </div>
                    
                    <Button onClick={handleCreateNote} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir Nota
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notas Existentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay notas registradas
                      </p>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {notes.map((note) => (
                            <div key={note.id} className="border rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{note.title}</h4>
                                <div className="flex gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {note.category}
                                  </Badge>
                                  <Badge 
                                    variant={note.priority === 'urgent' ? 'destructive' : 
                                           note.priority === 'high' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {note.priority}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{note.content}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', { locale: es })} • {note.staff_name}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientManagement;