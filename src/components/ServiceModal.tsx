import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Service, Package } from "@/hooks/useDatabase";
import { cn } from "@/lib/utils";
import PriceDisplay from "@/components/PriceDisplay";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "individual" | "voucher" | "combined";
  services: Service[];
  packages: Package[];
  selectedId?: string;
  onSelect: (id: string, kind: "service" | "package") => void;
}

// Heurísticas simples para agrupar servicios por nombre/descr. existente en la BD
const isDuo = (name?: string) => {
  const txt = (name || "").toLowerCase();
  return /(dos|pareja|parejas|dúo|duo)/.test(txt) || /\b2\s*personas?\b/.test(txt) || /para\s*2\s*personas?/.test(txt) || /\b(2p|2\s*pax)\b/.test(txt);
};
const isCuatroManos = (name?: string) => !!name?.toLowerCase().includes("cuatro manos");
const isRitual = (name?: string, description?: string) => {
  const txt = `${name || ""} ${description || ""}`.toLowerCase();
  return txt.includes("ritual");
};
const isTresPersonas = (name?: string) => !!name?.toLowerCase().match(/(tres|3)\s*personas/);

const currency = (cents?: number) =>
  typeof cents === "number" ? (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "";

const ItemRow: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  active?: boolean;
  priceElement?: React.ReactNode;
  onClick?: () => void;
}> = ({ title, subtitle, right, active, priceElement, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between gap-3 px-3 py-3 rounded-md border text-left touch-manipulation",
      "bg-card text-card-foreground hover:bg-accent transition-colors",
      active ? "border-primary/60 ring-1 ring-primary/30 bg-primary/5" : "border-border"
    )}
  >
    <div className="min-w-0 flex-1">
      <p className={cn("text-sm font-medium truncate", active && "text-primary")}>{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      {priceElement && <div className="mt-1">{priceElement}</div>}
    </div>
    {right && <div className="flex-shrink-0">{right}</div>}
  </button>
);

const ServiceModal: React.FC<Props> = ({
  open,
  onOpenChange,
  mode = "individual",
  services,
  packages,
  selectedId,
  onSelect,
}) => {
  const handleSelect = (id: string, kind: "service" | "package") => {
    onSelect(id, kind);
    onOpenChange(false); // Cerrar modal al seleccionar
  };

  // Grouping logic
  const duoServices = services.filter(s => isDuo(s.name));
  const cuatroManosServices = services.filter(s => isCuatroManos(s.name));
  const ritualServices = services.filter(s => isRitual(s.name, s.description));
  const tresPersonasServices = services.filter(s => isTresPersonas(s.name));
  const otherServices = services.filter(s => 
    !isDuo(s.name) && 
    !isCuatroManos(s.name) && 
    !isRitual(s.name, s.description) && 
    !isTresPersonas(s.name)
  );

  const ServiceGroup: React.FC<{ title: string; services: Service[]; packages?: Package[] }> = ({ title, services, packages = [] }) => {
    if (services.length === 0 && packages.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">{title}</h4>
        <div className="space-y-2">
          {services.map((service) => (
            <ItemRow
              key={service.id}
              title={service.name}
              subtitle={service.description}
              active={selectedId === service.id}
              priceElement={<span className="text-sm font-medium text-primary">{currency(service.price_cents)}</span>}
              onClick={() => handleSelect(service.id, "service")}
            />
          ))}
          {packages.map((pkg) => (
            <ItemRow
              key={pkg.id}
              title={pkg.name}
              subtitle={pkg.description}
              active={selectedId === pkg.id}
              priceElement={<span className="text-sm font-medium text-primary">{currency(pkg.price_cents)}</span>}
              onClick={() => handleSelect(pkg.id, "package")}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Seleccionar Servicio</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 pb-4">
            {mode === "combined" && packages.length > 0 && (
              <ServiceGroup title="Paquetes" services={[]} packages={packages} />
            )}
            
            <ServiceGroup title="Servicios Dúo" services={duoServices} />
            <ServiceGroup title="Cuatro Manos" services={cuatroManosServices} />
            <ServiceGroup title="Rituales" services={ritualServices} />
            <ServiceGroup title="Tres Personas" services={tresPersonasServices} />
            <ServiceGroup title="Otros Servicios" services={otherServices} />
            
            {mode === "voucher" && packages.length > 0 && (
              <>
                <Separator />
                <ServiceGroup title="Paquetes" services={[]} packages={packages} />
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceModal;