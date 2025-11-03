import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Service, Package } from "@/hooks/useDatabase";
import { usePromotions } from "@/hooks/usePromotions";
import { cn } from "@/lib/utils";
import { Clock, Percent, Tag, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  mode?: "individual" | "voucher" | "combined";
  services: Service[];
  packages: Package[];
  selectedId?: string;
  onSelect: (id: string, kind: "service" | "package") => void;
  useDropdown?: boolean;
}

const currency = (cents?: number) =>
  typeof cents === "number" ? (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "";

const ServiceCard: React.FC<{
  service: Service;
  active?: boolean;
  onClick?: () => void;
  centerId?: string;
}> = ({ service, active, onClick, centerId }) => {
  const { calculatePriceWithPromotions } = usePromotions();
  
  let basePrice = service.price_cents;
  let serviceDiscount = 0;
  let hasServiceDiscount = false;
  
  if (service.has_discount && service.discount_price_cents && service.discount_price_cents < service.price_cents) {
    basePrice = service.discount_price_cents;
    serviceDiscount = service.price_cents - service.discount_price_cents;
    hasServiceDiscount = true;
  }
  
  const priceInfo = calculatePriceWithPromotions(basePrice, service.id, centerId);
  const hasPromotion = priceInfo.discount > 0;
  
  const totalDiscount = serviceDiscount + priceInfo.discount;
  const finalPrice = service.price_cents - totalDiscount;
  const showDiscount = totalDiscount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-lg border text-left transition-all duration-200",
        "bg-card hover:bg-accent/10",
        "shadow-sm hover:shadow-md",
        active 
          ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
          : "border-border hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-semibold text-sm truncate",
            active && "text-primary"
          )}>
            {service.name}
          </h4>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{service.duration_minutes} min</span>
            </div>
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
            <p className="text-sm font-bold">
              {currency(service.price_cents)}
            </p>
          )}
          
          {showDiscount && (
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 text-xs">
              <Percent className="w-3 h-3 mr-1" />
              {Math.round((totalDiscount / service.price_cents) * 100)}%
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
};

const ServiceSelectorGrouped: React.FC<Props> = ({
  mode = "individual",
  services,
  packages,
  selectedId,
  onSelect,
  useDropdown = true,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const groupedServices = useMemo(() => {
    const groups: Record<string, { name: string; services: Service[]; packages: Package[] }> = {
      'masajes-individuales': { name: 'Masajes Individuales', services: [], packages: [] },
      'masajes-pareja': { name: 'Masajes para Dos', services: [], packages: [] },
      'masajes-cuatro-manos': { name: 'Masajes a Cuatro Manos', services: [], packages: [] },
      'rituales': { name: 'Rituales Individuales', services: [], packages: [] },
      'rituales-pareja': { name: 'Rituales para Dos', services: [], packages: [] },
    };

    services.forEach((service) => {
      // Prioridad absoluta: si el servicio tiene group_id y coincide con grupos conocidos, usarlo
      const groupId = (service as any).group_id as string | undefined;
      const groupFromId = groupId &&
        (service as any).group_name &&
        ((service as any).group_name.toLowerCase().includes('rituales para dos') ? 'rituales-pareja'
          : (service as any).group_name.toLowerCase().includes('rituales') ? 'rituales'
          : undefined);
      if (groupFromId && groups[groupFromId]) {
        groups[groupFromId].services.push(service);
        return;
      }

      const name = (service.name || '').toLowerCase();
      const description = (service.description || '').toLowerCase();
      const isRitual = name.includes('ritual') || description.includes('ritual');
      const isDuo = name.includes('dos personas') || name.includes('pareja') || name.includes('para dos') || name.includes('2 personas') || name.includes('duo');

      if (name.includes('cuatro manos')) {
        groups['masajes-cuatro-manos'].services.push(service);
      } else if (isRitual && isDuo) {
        groups['rituales-pareja'].services.push(service);
      } else if (isDuo) {
        groups['masajes-pareja'].services.push(service);
      } else if (isRitual) {
        groups['rituales'].services.push(service);
      } else {
        groups['masajes-individuales'].services.push(service);
      }
    });

    return Object.entries(groups)
      .filter(([, group]) => group.services.length > 0)
      .map(([key, group]) => ({ key, ...group }));
  }, [services]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupKey) 
        ? prev.filter(k => k !== groupKey)
        : [...prev, groupKey]
    );
  };

  if (useDropdown) {
    return (
      <Select value={selectedId} onValueChange={(value) => onSelect(value, "service")}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona un servicio" />
        </SelectTrigger>
        <SelectContent>
          {groupedServices.map((group) => (
            <React.Fragment key={group.key}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {group.name}
              </div>
              {group.services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} - {currency(service.price_cents)}
                </SelectItem>
              ))}
            </React.Fragment>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-3">
      {groupedServices.map((group) => {
        const isExpanded = expandedGroups.includes(group.key);
        
        return (
          <div key={group.key} className="space-y-2">
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg",
                "bg-accent/30 hover:bg-accent/50 transition-colors",
                "border border-border/50"
              )}
            >
              <span className="font-semibold text-sm">{group.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {group.services.length}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>
            
            {isExpanded && (
              <div className="grid gap-2 pl-2">
                {group.services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    active={selectedId === service.id}
                    onClick={() => onSelect(service.id, "service")}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ServiceSelectorGrouped;
