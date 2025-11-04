import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import AppModal from "@/components/ui/app-modal";
import { Search, User, Phone, Mail, X } from "lucide-react";
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
  const modalRef = useRef<HTMLDivElement | null>(null);

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
    <>
      <span onClick={() => setOpen(true)} style={{ display: 'contents' }}>
        {children}
      </span>
      {open && (
        <>
          <AppModal open={open} onClose={() => setOpen(false)} maxWidth={480} mobileMaxWidth={360} maxHeight={680} className="z-[120]">
            <div ref={modalRef} className="flex max-h-[calc(100vh-3rem)] sm:max-h-[85vh] p-4 sm:p-6 flex-col rounded-xl overflow-hidden">
              <div className="sticky top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 flex flex-col gap-4 pt-2 -mt-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-base sm:text-lg">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="truncate">Seleccionar Cliente ({filteredClients.length})</span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-full p-1 transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Client List */}
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full pr-1">
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
            </div>
          </AppModal>
        </>
      )}
    </>
  );
};

export default ClientSelectionModal;
