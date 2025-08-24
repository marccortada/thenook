import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, User, Phone, Mail } from "lucide-react";
import { useClients } from "@/hooks/useClients";

export interface Client {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  total_bookings?: number;
  last_booking?: string | null;
}

interface ClientSelectionModalProps {
  onSelect: (client: Client) => void;
  children: React.ReactNode;
}

const ClientSelectionModal: React.FC<ClientSelectionModalProps> = ({
  onSelect,
  children
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { clients, loading } = useClients();

  // Filter clients based on search query
  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
    const email = (client.email || '').toLowerCase();
    const phone = (client.phone || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           phone.includes(searchLower);
  });

  const handleClientSelect = (client: Client) => {
    console.log('Cliente seleccionado:', client); // Debug log
    onSelect(client);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('Modal abriéndose/cerrándose:', newOpen); // Debug log
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Seleccionar Cliente ({filteredClients.length} clientes)
          </DialogTitle>
        </DialogHeader>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Client List */}
        <ScrollArea className="flex-1 max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Cargando clientes...</div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleClientSelect(client)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">
                          {client.first_name} {client.last_name}
                        </h4>
                        {client.total_bookings && client.total_bookings > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            {client.total_bookings} visitas
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.last_booking && (
                          <div className="text-xs text-muted-foreground">
                            Última visita: {new Date(client.last_booking).toLocaleDateString('es-ES')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      Seleccionar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientSelectionModal;