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
  Clock,
  ArrowUpDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClients, Client, ClientBooking } from "@/hooks/useClients";
import { useClientNotes } from "@/hooks/useClientNotes";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

const ClientManagement = () => {
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientBookings, setClientBookings] = useState<ClientBooking[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client>>({});
  const [newNote, setNewNote] = useState({ title: "", content: "", category: "general", priority: "normal" });
  const { toast } = useToast();

  // Ordenación y creación
  const [sortBy, setSortBy] = useState<'name' | 'total_spent' | 'last_booking' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [newClient, setNewClient] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  // Use the new hook
  const { clients, loading, updateClient, fetchClientBookings, refetch } = useClients();
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

  const handleCreateClient = async () => {
    try {
      if (!newClient.first_name || !newClient.email) return;
      const { error } = await supabase.from('profiles').insert([
        {
          email: newClient.email.trim(),
          first_name: newClient.first_name.trim(),
          last_name: newClient.last_name.trim(),
          phone: newClient.phone.trim(),
          role: 'client'
        }
      ]);
      if (error) throw error;
      toast({ title: 'Cliente creado', description: 'Se ha añadido el cliente correctamente.' });
      setShowCreateClient(false);
      setNewClient({ first_name: '', last_name: '', email: '', phone: '' });
      await refetch?.();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo crear el cliente', variant: 'destructive' });
    }
  };
  const { notes, createNote, refetch: refetchNotes, error: notesError } = useClientNotes(selectedClient?.id);

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
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          Gestión de Clientes
        </h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="total_spent">Gasto total</SelectItem>
              <SelectItem value="last_booking">Última visita</SelectItem>
              <SelectItem value="created_at">Fecha de inclusión</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              aria-label="Cambiar orden"
              className="flex-1 sm:flex-none"
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === 'asc' ? 'Asc' : 'Desc'}
            </Button>
            <Button onClick={() => setShowCreateClient(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nuevo cliente</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>
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

      <Dialog open={showCreateClient} onOpenChange={setShowCreateClient}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nc_name">Nombre</Label>
                <Input id="nc_name" value={newClient.first_name} onChange={(e) => setNewClient({ ...newClient, first_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="nc_last">Apellidos</Label>
                <Input id="nc_last" value={newClient.last_name} onChange={(e) => setNewClient({ ...newClient, last_name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="nc_email">Email</Label>
              <Input id="nc_email" type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="nc_phone">Teléfono</Label>
              <Input id="nc_phone" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateClient(false)}>Cancelar</Button>
              <Button onClick={handleCreateClient} disabled={!newClient.first_name || !newClient.email}>Crear</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          ([...filteredClients]
            .sort((a, b) => {
              const dir = sortOrder === 'asc' ? 1 : -1;
              if (sortBy === 'name') {
                const an = `${a.first_name} ${a.last_name}`.toLowerCase();
                const bn = `${b.first_name} ${b.last_name}`.toLowerCase();
                return an.localeCompare(bn) * dir;
              }
              if (sortBy === 'total_spent') {
                const av = (a.total_spent || 0);
                const bv = (b.total_spent || 0);
                return (av - bv) * dir;
              }
              if (sortBy === 'last_booking') {
                const ad = a.last_booking ? new Date(a.last_booking).getTime() : 0;
                const bd = b.last_booking ? new Date(b.last_booking).getTime() : 0;
                return (ad - bd) * dir;
              }
              const ac = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
              const bc = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
              return (ac - bc) * dir;
            })
          ).map((client) => (
            <Card 
              key={client.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleClientClick(client)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="flex-shrink-0">
                      <AvatarFallback>
                        {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">
                        {client.first_name} {client.last_name}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1 min-w-0">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <a 
                            href={`mailto:${client.email}`}
                            className="truncate hover:text-primary hover:underline transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {client.email}
                          </a>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <a 
                              href={`tel:${client.phone}`}
                              className="hover:text-primary hover:underline transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {client.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:text-right">
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {client.total_bookings} reservas
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        €{((client.total_spent || 0) / 100).toFixed(2)}
                      </Badge>
                    </div>
                    {client.last_booking && (
                      <p className="text-xs text-muted-foreground">
                        Última: {format(new Date(client.last_booking), 'dd/MM/yy', { locale: es })}
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
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">Ficha: {selectedClient?.first_name} {selectedClient?.last_name}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="info" className="text-xs sm:text-sm px-2 py-2">Info</TabsTrigger>
                <TabsTrigger value="bookings" className="text-xs sm:text-sm px-2 py-2">Reservas</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs sm:text-sm px-2 py-2">Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-3 sm:space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">Datos del Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label htmlFor="first_name" className="text-sm">Nombre</Label>
                        <Input
                          id="first_name"
                          value={editingClient.first_name || ""}
                          onChange={(e) => setEditingClient({ ...editingClient, first_name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name" className="text-sm">Apellidos</Label>
                        <Input
                          id="last_name"
                          value={editingClient.last_name || ""}
                          onChange={(e) => setEditingClient({ ...editingClient, last_name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email" className="text-sm">Email</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="email"
                          type="email"
                          value={editingClient.email || ""}
                          onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                          className="flex-1"
                        />
                        {editingClient.email && (
                          <Button
                            variant="outline"
                            size="icon"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a href={`mailto:${editingClient.email}`} title="Enviar email">
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="phone" className="text-sm">Teléfono</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="phone"
                          value={editingClient.phone || ""}
                          onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                          className="flex-1"
                        />
                        {editingClient.phone && (
                          <Button
                            variant="outline"
                            size="icon"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a href={`tel:${editingClient.phone}`} title="Llamar">
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    <Button onClick={handleUpdateClient} className="w-full mt-4">
                      <Edit className="h-4 w-4 mr-2" />
                      <span className="text-sm">Guardar Cambios</span>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">Estadísticas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="text-xl sm:text-2xl font-bold text-primary">{selectedClient.total_bookings}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Total Reservas</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xl sm:text-2xl font-bold text-green-600">
                          €{((selectedClient.total_spent || 0) / 100).toFixed(2)}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Total Gastado</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">
                          {selectedClient.last_booking 
                            ? format(new Date(selectedClient.last_booking), 'dd/MM/yy', { locale: es })
                            : 'N/A'
                          }
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Última Visita</p>
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