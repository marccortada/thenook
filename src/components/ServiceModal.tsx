import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Service, Package } from "@/hooks/useDatabase";
import { usePromotions } from "@/hooks/usePromotions";
import { useTreatmentGroups } from "@/hooks/useTreatmentGroups";
import { cn } from "@/lib/utils";
import { Star, Clock, Users, Sparkles, Percent, Tag, X } from "lucide-react";

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

const ServiceCard: React.FC<{
  service: Service;
  active?: boolean;
  onClick?: () => void;
  centerId?: string;
}> = ({ service, active, onClick, centerId }) => {
  const { calculatePriceWithPromotions } = usePromotions();
  
  // Calcular precio considerando descuentos de servicio Y promociones
  let basePrice = service.price_cents;
  let serviceDiscount = 0;
  let hasServiceDiscount = false;
  
  // Primero aplicar descuento del servicio si existe
  if (service.has_discount && service.discount_price_cents && service.discount_price_cents < service.price_cents) {
    basePrice = service.discount_price_cents;
    serviceDiscount = service.price_cents - service.discount_price_cents;
    hasServiceDiscount = true;
  }
  
  // Luego aplicar promociones sobre el precio ya descontado
  const priceInfo = calculatePriceWithPromotions(basePrice, service.id, centerId);
  const hasPromotion = priceInfo.discount > 0;
  
  const totalDiscount = serviceDiscount + priceInfo.discount;
  const finalPrice = service.price_cents - totalDiscount;
  const showDiscount = totalDiscount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all duration-300",
        "bg-gradient-to-br from-card to-card/80 hover:from-card hover:to-accent/20",
        "shadow-sm hover:shadow-md touch-manipulation min-h-[120px]",
        active 
          ? "border-primary ring-2 ring-primary/20 bg-gradient-to-br from-primary/5 to-primary/10" 
          : "border-border hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn(
              "font-semibold text-sm sm:text-base truncate",
              active && "text-primary"
            )}>
              {service.name}
            </h4>
            {showDiscount && (
              <Badge variant="secondary" className="bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-600 border-orange-300/30">
                <Percent className="w-3 h-3 mr-1" />
                {Math.round((totalDiscount / service.price_cents) * 100)}%
              </Badge>
            )}
          </div>
          
          {service.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {service.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{service.duration_minutes} min</span>
            </div>
            {service.type && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span className="capitalize">{service.type.replace('_', ' ')}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          {showDiscount ? (
            <div className="text-right">
              <p className="text-xs text-muted-foreground line-through">
                {currency(service.price_cents)}
              </p>
              <p className="text-sm font-bold text-primary">
                {currency(finalPrice)}
              </p>
            </div>
          ) : (
            <p className="text-sm font-bold text-foreground">
              {currency(service.price_cents)}
            </p>
          )}
          
          {(hasPromotion || hasServiceDiscount) && (
            <div className="flex flex-col gap-1">
              {hasServiceDiscount && (
                <Badge variant="secondary" className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-600 border-blue-300/30 text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  Descuento
                </Badge>
              )}
              {hasPromotion && (
                <Badge variant="secondary" className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-600 border-emerald-300/30 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Oferta
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

const PackageCard: React.FC<{
  package: Package;
  active?: boolean;
  onClick?: () => void;
}> = ({ package: pkg, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all duration-300",
        "bg-gradient-to-br from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100",
        "shadow-sm hover:shadow-md touch-manipulation min-h-[120px]",
        active 
          ? "border-violet-400 ring-2 ring-violet-300/30 bg-gradient-to-br from-violet-100 to-purple-100" 
          : "border-violet-200 hover:border-violet-300"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-violet-600" />
            <h4 className={cn(
              "font-semibold text-sm sm:text-base truncate",
              active ? "text-violet-700" : "text-violet-600"
            )}>
              {pkg.name}
            </h4>
            <Badge className="bg-violet-500 text-white text-xs">
              Paquete
            </Badge>
          </div>
          
          {pkg.description && (
            <p className="text-xs text-violet-600/70 line-clamp-2 mb-2">
              {pkg.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-xs text-violet-600/80">
            <span>{pkg.sessions_count} sesiones</span>
            {pkg.discount_percentage > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-600 border-orange-200">
                -{pkg.discount_percentage}%
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <p className="text-sm font-bold text-violet-700">
            {currency(pkg.price_cents)}
          </p>
        </div>
      </div>
    </button>
  );
};

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
    onOpenChange(false);
  };

  // Group services by specific treatment categories
  const groupedServices = React.useMemo(() => {
    const groups = {
      'masajes-individuales': {
        name: 'Masajes Individuales',
        color: '#3B82F6',
        services: [] as Service[],
        packages: [] as Package[]
      },
      'masajes-pareja': {
        name: 'Masajes en Pareja',
        color: '#10B981',
        services: [] as Service[],
        packages: [] as Package[]
      },
      'masajes-cuatro-manos': {
        name: 'Masajes a Cuatro Manos',
        color: '#F59E0B',
        services: [] as Service[],
        packages: [] as Package[]
      },
      'rituales': {
        name: 'Rituales',
        color: '#8B5CF6',
        services: [] as Service[],
        packages: [] as Package[]
      }
    };

    // Classify services based on their names
    services.forEach(service => {
      const name = service.name.toLowerCase();
      
      if (name.includes('cuatro manos')) {
        groups['masajes-cuatro-manos'].services.push(service);
      } else if (name.includes('dos personas') || name.includes('pareja') || name.includes('para dos') || name.includes('2 personas')) {
        groups['masajes-pareja'].services.push(service);
      } else if (service.type === 'package' || name.includes('ritual')) {
        groups['rituales'].services.push(service);
      } else {
        // Individual massages and treatments
        groups['masajes-individuales'].services.push(service);
      }
    });

    // Add packages to rituales
    if (mode === "combined" || mode === "voucher") {
      groups['rituales'].packages.push(...packages);
    }

    // Return only groups with content
    return Object.values(groups).filter(group => 
      group.services.length > 0 || group.packages.length > 0
    );
  }, [services, packages, mode]);

  const ServiceGroup: React.FC<{ 
    title: string; 
    services: Service[]; 
    packages?: Package[];
    icon?: React.ReactNode;
  }> = ({ title, services, packages = [], icon }) => {
    if (services.length === 0 && packages.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          {icon}
          <h4 className="font-semibold text-base text-foreground">{title}</h4>
          <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
        </div>
        <div className="grid gap-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              active={selectedId === service.id}
              onClick={() => handleSelect(service.id, "service")}
            />
          ))}
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              package={pkg}
              active={selectedId === pkg.id}
              onClick={() => handleSelect(pkg.id, "package")}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col bg-gradient-to-br from-background to-accent/5">
        <DialogHeader className="flex-shrink-0 pb-4 border-b bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 -mx-6 px-6 -mt-6 pt-6">
          <DialogTitle className="text-xl font-bold text-foreground">
            Seleccionar Servicio
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">Elige el servicio perfecto para ti</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto -mx-6 px-6 service-modal-scroll">
          <div className="space-y-6 py-4">
            {groupedServices.map((group, index) => (
              <ServiceGroup 
                key={index}
                title={group.name} 
                services={group.services}
                packages={group.packages}
                icon={<div className="w-4 h-4 rounded-full" style={{ backgroundColor: group.color }} />}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceModal;