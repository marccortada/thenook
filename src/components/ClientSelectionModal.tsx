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
      <DialogContent className="w-screen h-screen sm:w-full sm:h-auto max-w-2xl sm:max-h-[85vh] m-0 sm:mx-auto p-3 sm:p-6 flex flex-col rounded-none sm:rounded-lg">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Seleccionar Cliente ({filteredClients.length})</span>
          </DialogTitle>
        </DialogHeader>
        
        {/* Search Input */}
        <div className="relative mb-4 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full max-h-[calc(90vh-200px)] sm:max-h-[calc(85vh-200px)]">
            <div className="px-1">
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
                <div className="space-y-3 py-2 pb-4">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors active:bg-muted"
                      onClick={() => handleClientSelect(client)}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm truncate flex-1">
                          {client.first_name} {client.last_name}
                        </h4>
                        <Button variant="outline" size="sm" className="text-xs px-3 py-1 shrink-0">
                          Seleccionar
                        </Button>
                      </div>
                      
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{client.phone}</span>
                          </div>
                        )}
                        {client.total_bookings && client.total_bookings > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            {client.total_bookings} visitas
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end pt-4 border-t mt-4 flex-shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto text-sm">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientSelectionModal;