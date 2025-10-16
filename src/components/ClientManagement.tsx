import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppModal from "@/components/ui/app-modal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useClients, Client, ClientBooking } from "@/hooks/useClients";
import { useInternalCodes } from "@/hooks/useInternalCodes";
import { Calendar, Clock, DollarSign, Edit, Eye, User, Phone, Mail, Tags, X, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MobileResponsiveLayout from "@/components/MobileResponsiveLayout";
import MobileCard from "@/components/MobileCard";
import { useIsMobile } from "@/hooks/use-mobile";
import usePositionedModal from "@/hooks/use-positioned-modal";
import { ClientDialogContent } from "@/components/ClientDialogContent";
import { useClientNotes } from "@/hooks/useClientNotes";

export default function ClientManagement() {
  const { clients, loading, error, updateClient, fetchClientBookings } = useClients();
  const { codes, assignments, getAssignmentsByEntity, createCode, assignCode, unassignCode } = useInternalCodes();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  // Get client codes
  const getClientCodes = (clientId: string) => {
    return getAssignmentsByEntity('client', clientId);
  };

  // Filter clients based on search term and codes
  const filteredClients = clients.filter(client => {
    const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
    const email = client.email?.toLowerCase() || '';
    const phone = client.phone?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    const matchesSearch = fullName.includes(search) || 
                         email.includes(search) || 
                         phone.includes(search);
    
    if (selectedCodes.length === 0) return matchesSearch;
    
    const clientCodes = getClientCodes(client.id);
    const clientCodeNames = clientCodes.map(assignment => assignment.code);
    
    return matchesSearch && selectedCodes.some(code => clientCodeNames.includes(code));
  });

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
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-40">
        <MobileResponsiveLayout padding="md">
          <h1 className={`font-bold text-foreground no-underline ${
            isMobile ? 'text-lg' : 'text-2xl'
          }`}>
            Gestión de Clientes - The Nook Madrid
          </h1>
        </MobileResponsiveLayout>
      </header>

      <main className="py-4 sm:py-8">
        <MobileResponsiveLayout maxWidth="7xl" padding="md">
          <div className="space-y-4 sm:space-y-6">
            {/* Search and Filter Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar y Filtrar Clientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Code Filters */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtrar por códigos
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {codes.map((code) => (
                      <Badge
                        key={code.id}
                        variant={selectedCodes.includes(code.code) ? "default" : "outline"}
                        className="cursor-pointer transition-colors"
                        style={{
                          backgroundColor: selectedCodes.includes(code.code) ? code.color : 'transparent',
                          borderColor: code.color,
                          color: selectedCodes.includes(code.code) ? 'white' : code.color
                        }}
                        onClick={() => {
                          setSelectedCodes(prev => 
                            prev.includes(code.code) 
                              ? prev.filter(c => c !== code.code)
                              : [...prev, code.code]
                          );
                        }}
                      >
                        {code.name}
                      </Badge>
                    ))}
                  </div>
                  {selectedCodes.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCodes([])}
                      className="text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpiar filtros
                    </Button>
                  )}
                </div>

                {(searchTerm || selectedCodes.length > 0) && (
                  <p className="text-sm text-muted-foreground">
                    {filteredClients.length} cliente(s) encontrado(s)
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Clients List */}
            {filteredClients.length === 0 && searchTerm ? (
              <Card>
                <CardContent className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No se encontraron clientes</h3>
                  <p className="text-muted-foreground">
                    No hay clientes que coincidan con "{searchTerm}"
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {filteredClients.map((client) => (
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
                      
                      {/* Client Codes */}
                      {(() => {
                        const clientCodes = getClientCodes(client.id);
                        if (clientCodes.length > 0) {
                          return (
                            <div className="flex items-center gap-1 flex-wrap">
                              <Tags className="h-3 w-3 text-muted-foreground" />
                              {clientCodes.map((assignment) => {
                                const code = codes.find(c => c.id === assignment.code_id);
                                if (!code) return null;
                                return (
                                  <Badge
                                    key={assignment.id}
                                    variant="outline"
                                    className="text-xs"
                                    style={{
                                      borderColor: code.color,
                                      color: code.color,
                                      backgroundColor: `${code.color}10`
                                    }}
                                  >
                                    {code.name}
                                  </Badge>
                                );
                              })}
                            </div>
                          );
                        }
                        return null;
                      })()}
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
            )}
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
  const {
    isOpen,
    handleOpenModal: openClientModal,
    closeModal: closePositionedModal,
    modalStyle,
  } = usePositionedModal({
    anchorSelector: ".client-card",
  });
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
  const { codes, assignCode, unassignCode, getAssignmentsByEntity, createCode } = useInternalCodes();
  const { notes, createNote } = useClientNotes();
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    category: 'general' as 'general' | 'preferences' | 'medical' | 'allergies' | 'behavior' | 'payment' | 'complaints' | 'compliments' | 'follow_up',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent'
  });

  const handleOpenModal = async (event: React.MouseEvent<HTMLElement>) => {
    openClientModal(event);
    const bookings = await fetchClientBookings(client.id);
    setClientBookings(bookings);
    setEditingClient(null);
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
    closePositionedModal();
    setEditingClient(null);
  };

  const handleAssignCode = async (codeId: string) => {
    try {
      await assignCode({
        code_id: codeId,
        entity_type: 'client',
        entity_id: client.id,
        notes: ''
      });
      toast({
        title: "Código asignado",
        description: "El código se ha asignado correctamente al cliente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo asignar el código",
        variant: "destructive",
      });
    }
  };

  const handleUnassignCode = async (assignmentId: string) => {
    try {
      await unassignCode(assignmentId);
      toast({
        title: "Código removido",
        description: "El código se ha removido correctamente del cliente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo remover el código",
        variant: "destructive",
      });
    }
  };

  const handleCreateNote = async () => {
    try {
      await createNote({
        ...newNote,
        client_id: client.id
      });
      setNewNote({
        title: '',
        content: '',
        category: 'general',
        priority: 'normal'
      });
      toast({
        title: "Nota creada",
        description: "La nota se ha creado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la nota",
        variant: "destructive",
      });
    }
  };

  const handleCreateCode = async (codeData: { code: string; name: string; description?: string; category: string; color: string }) => {
    try {
      const newCode = await createCode(codeData);
      if (newCode) {
        // Asignar automáticamente el código recién creado al cliente
        await assignCode({
          code_id: newCode.id,
          entity_type: 'client',
          entity_id: client.id,
          notes: 'Código creado y asignado desde gestión de cliente'
        });
        
        toast({
          title: "Código creado y asignado",
          description: `El código "${codeData.name}" se ha creado y asignado al cliente`,
        });
      }
    } catch (error) {
      console.error('Error creating and assigning code:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el código",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'confirmed': return 'Confirmada';
      case 'cancelled': return 'Cancelada';
      case 'no_show': return 'No vino';
      case 'pending': return 'Pendiente';
      default: return status;
    }
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

      <AppModal open={isOpen} onClose={closeModal} maxWidth={500} mobileMaxWidth={350} maxHeight={600}>
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
              <ClientDialogContent
                client={client}
                bookings={clientBookings}
                editingClient={editingClient ? editData : client}
                newNote={newNote}
                notes={notes.filter(note => note.client_id === client.id)}
                codes={codes}
                clientCodes={getAssignmentsByEntity('client', client.id)}
                onUpdateClient={editingClient ? handleSaveClient : handleEditClient}
                onCreateNote={handleCreateNote}
                onUpdateEditingClient={(updates) => setEditData(prev => ({ ...prev, ...updates }))}
                onUpdateNewNote={(updates) => setNewNote(prev => ({ 
                  ...prev, 
                  ...updates,
                  category: (updates.category as any) || prev.category,
                  priority: (updates.priority as any) || prev.priority
                }))}
                onOpenEmailModal={() => {}}
                onAssignCode={handleAssignCode}
                onUnassignCode={handleUnassignCode}
                onCreateCode={handleCreateCode}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
              />
            </div>
      </AppModal>
    </>
  );
}
