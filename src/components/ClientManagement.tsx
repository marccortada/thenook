import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  User,
  ArrowUpDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClients, Client, ClientBooking } from "@/hooks/useClients";
import { useClientNotes } from "@/hooks/useClientNotes";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { ClientDialogContent } from "./ClientDialogContent";

const ClientManagement = () => {
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Cambiar a Map para manejar múltiples modales independientes
  const [openDialogs, setOpenDialogs] = useState<Map<string, {
    client: Client;
    bookings: ClientBooking[];
    editingClient: Partial<Client>;
    newNote: { title: string; content: string; category: string; priority: string };
  }>>(new Map());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    message: ""
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const { toast } = useToast();

  // Ordenación y creación
  const [sortBy, setSortBy] = useState<'name' | 'total_spent' | 'last_booking' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [newClient, setNewClient] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  // Use the new hook
  const { clients, loading, updateClient, fetchClientBookings, refetch } = useClients();

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
    // Si ya está abierto, no hacer nada
    if (openDialogs.has(client.id)) return;
    
    const bookings = await fetchClientBookings(client.id);
    
    setOpenDialogs(prev => new Map(prev).set(client.id, {
      client,
      bookings,
      editingClient: client,
      newNote: { title: "", content: "", category: "general", priority: "normal" }
    }));
  };

  const handleUpdateClient = async (clientId: string) => {
    const dialogData = openDialogs.get(clientId);
    if (!dialogData) return;
    await updateClient(clientId, dialogData.editingClient);
  };

  const handleOpenEmailModal = (client: any) => {
    setEmailForm({
      to: client.email || "",
      subject: "",
      message: ""
    });
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForm.to)) {
      toast({ title: "Error", description: "Por favor, introduce una dirección de correo válida", variant: "destructive" });
      return;
    }

    if (!emailForm.subject.trim()) {
      toast({ title: "Error", description: "Por favor, introduce un asunto", variant: "destructive" });
      return;
    }

    if (!emailForm.message.trim()) {
      toast({ title: "Error", description: "Por favor, introduce un mensaje", variant: "destructive" });
      return;
    }

    setSendingEmail(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: emailForm.to,
          subject: emailForm.subject,
          message: emailForm.message
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: "Éxito", description: "Correo enviado correctamente" });
        setShowEmailModal(false);
        setEmailForm({ to: "", subject: "", message: "" });
      } else {
        throw new Error(data?.error || "Error al enviar el correo");
      }
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({ title: "Error", description: error.message || "Error al enviar el correo", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
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

  const handleCreateNote = async (clientId: string) => {
    const dialogData = openDialogs.get(clientId);
    if (!dialogData || !dialogData.newNote.title || !dialogData.newNote.content) return;

    try {
      // Usar el hook de forma dinámica
      const { createNote } = useClientNotes(clientId);
      
      await createNote({
        client_id: clientId,
        title: dialogData.newNote.title,
        content: dialogData.newNote.content,
        category: dialogData.newNote.category as any,
        priority: dialogData.newNote.priority as any,
      });

      // Resetear la nota en el diálogo específico
      setOpenDialogs(prev => {
        const newMap = new Map(prev);
        const data = newMap.get(clientId);
        if (data) {
          data.newNote = { title: "", content: "", category: "general", priority: "normal" };
        }
        return newMap;
      });
      
      toast({
        title: "Éxito",
        description: "Nota añadida correctamente",
      });
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleCloseDialog = (clientId: string) => {
    setOpenDialogs(prev => {
      const newMap = new Map(prev);
      newMap.delete(clientId);
      return newMap;
    });
  };

  const updateDialogData = (clientId: string, field: string, value: any) => {
    setOpenDialogs(prev => {
      const newMap = new Map(prev);
      const data = newMap.get(clientId);
      if (data) {
        (data as any)[field] = value;
      }
      return newMap;
    });
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

      {/* Multiple Client Detail Dialogs */}
      {Array.from(openDialogs.entries()).map(([clientId, dialogData]) => {
        const { notes } = useClientNotes(clientId);
        
        return (
          <Dialog 
            key={clientId} 
            open={true} 
            onOpenChange={(open) => !open && handleCloseDialog(clientId)}
          >
            <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="truncate">Ficha: {dialogData.client.first_name} {dialogData.client.last_name}</span>
                </DialogTitle>
              </DialogHeader>

              <ClientDialogContent 
                client={dialogData.client}
                bookings={dialogData.bookings}
                editingClient={dialogData.editingClient}
                newNote={dialogData.newNote}
                notes={notes}
                onUpdateClient={() => handleUpdateClient(clientId)}
                onCreateNote={() => handleCreateNote(clientId)}
                onUpdateEditingClient={(updates) => updateDialogData(clientId, 'editingClient', { ...dialogData.editingClient, ...updates })}
                onUpdateNewNote={(updates) => updateDialogData(clientId, 'newNote', { ...dialogData.newNote, ...updates })}
                onOpenEmailModal={handleOpenEmailModal}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
              />
            </DialogContent>
          </Dialog>
        );
      })}

      {/* Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Correo Electrónico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email_to">Para</Label>
              <Input
                id="email_to"
                type="email"
                value={emailForm.to}
                onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                placeholder="destinatario@ejemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="email_subject">Asunto</Label>
              <Input
                id="email_subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Asunto del correo"
              />
            </div>
            <div>
              <Label htmlFor="email_message">Mensaje</Label>
              <Textarea
                id="email_message"
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                placeholder="Escribe aquí tu mensaje..."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEmailModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSendEmail} disabled={sendingEmail}>
                {sendingEmail ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientManagement;