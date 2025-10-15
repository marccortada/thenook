import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [modalStyle, setModalStyle] = useState<React.CSSProperties>({
    width: "min(480px, calc(100vw - 32px))",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  });

  useLayoutEffect(() => {
    if (!open) {
      setModalStyle({
        width: "min(480px, calc(100vw - 32px))",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const padding = 16;

    const calculatePosition = () => {
      const modalEl = modalRef.current;
      if (!modalEl) return;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const parentModal = document.querySelector('[data-new-booking-modal]') as HTMLElement | null;
      const parentRect = parentModal?.getBoundingClientRect();

      const baseWidth = modalEl.scrollWidth || modalEl.getBoundingClientRect().width || 360;
      const maxWidth = viewportWidth - padding * 2;
      const width = Math.min(parentRect ? parentRect.width : baseWidth, maxWidth);

      const contentHeight = modalEl.scrollHeight || modalEl.getBoundingClientRect().height;
      const maxHeight = Math.min(parentRect ? parentRect.height : viewportHeight, viewportHeight - padding * 2);
      const height = Math.min(contentHeight, maxHeight - padding);

      const centerX = parentRect ? parentRect.left + parentRect.width / 2 : viewportWidth / 2;
      const centerY = parentRect ? parentRect.top + parentRect.height / 2 : viewportHeight / 2;

      const halfWidth = width / 2;
      const halfHeight = height / 2;

      const clampedCenterX = Math.max(padding + halfWidth, Math.min(centerX, viewportWidth - padding - halfWidth));
      const clampedCenterY = Math.max(padding + halfHeight, Math.min(centerY, viewportHeight - padding - halfHeight));

      setModalStyle({
        width: `${width}px`,
        maxHeight: `${maxHeight - padding}px`,
        transform: "translate(-50%, -50%)",
        left: `${clampedCenterX}px`,
        top: `${clampedCenterY}px`,
      });
    };

    const frame = requestAnimationFrame(calculatePosition);
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [open, clients.length, searchQuery]);

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
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
          <div
            ref={modalRef}
            className="fixed z-[120] flex max-h-[calc(100vh-3rem)] sm:max-h-[85vh] p-4 sm:p-6 flex-col rounded-xl overflow-hidden border bg-background shadow-2xl transition-all duration-300"
            style={modalStyle}
          >
            <div className="pb-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-base sm:text-lg">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">Seleccionar Cliente ({filteredClients.length})</span>
              </div>
            </div>
        
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
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
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
          </div>
        </>
      )}
    </>
  );
};

export default ClientSelectionModal;
