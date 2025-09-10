import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Service, Package } from "@/hooks/useDatabase";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Clock, Users, Tag, Percent, Sparkles } from "lucide-react";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import ServiceModal from "./ServiceModal";

interface Props {
  mode?: "individual" | "voucher" | "combined";
  services: Service[];
  packages: Package[];
  selectedId?: string;
  onSelect: (id: string, kind: "service" | "package") => void;
  useDropdown?: boolean; // New prop to control dropdown vs modal
}

const ServiceSelectorGrouped: React.FC<Props> = ({
  mode = "individual",
  services,
  packages,
  selectedId,
  onSelect,
  useDropdown = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isAdmin, isEmployee } = useSimpleAuth();

  // Encontrar el servicio/paquete seleccionado para mostrar en el botón
  const selectedService = services.find(s => s.id === selectedId);
  const selectedPackage = packages.find(p => p.id === selectedId);
  const selectedItem = selectedService || selectedPackage;

  const buttonText = selectedItem 
    ? selectedItem.name 
    : "Seleccionar servicio";

  // Debug log to check if services are being loaded
  console.log('ServiceSelectorGrouped - services:', services.length, 'packages:', packages.length);

  // Group services by category for dropdown
  const groupedServices = React.useMemo(() => {
    const groups = {
      'masajes-individuales': {
        name: 'Tarjetas para Masaje Individual',
        color: '#3B82F6',
        services: [] as Service[],
      },
      'masajes-pareja': {
        name: 'Tarjetas para Masaje para Dos',
        color: '#10B981',
        services: [] as Service[],
      },
      'masajes-cuatro-manos': {
        name: 'Tarjetas para Masaje a Cuatro Manos',
        color: '#F59E0B',
        services: [] as Service[],
      },
      'rituales': {
        name: 'Tarjetas para Rituales Individuales',
        color: '#8B5CF6',
        services: [] as Service[],
      },
      'rituales-pareja': {
        name: 'Tarjetas para Rituales para Dos',
        color: '#EC4899',
        services: [] as Service[],
      }
    };

    console.log('ServiceSelectorGrouped classification debug:');
    console.log('Total services:', services.length);
    
    services.forEach(service => {
      const name = service.name.toLowerCase();
      const description = (service.description || '').toLowerCase();
      const isRitualService = name.includes('ritual') || description.includes('ritual');
      const isDuoService = name.includes('dos personas') || name.includes('pareja') || name.includes('para dos') || name.includes('2 personas') || name.includes('duo') || name.includes('two') || description.includes('dos personas') || description.includes('pareja') || description.includes('para dos');
      
      console.log(`ServiceSelector - Service "${service.name}": isRitual=${isRitualService}, isDuo=${isDuoService}, name="${name}", description="${description}"`);
      
      if (name.includes('cuatro manos')) {
        console.log(`-> Clasificando "${service.name}" como cuatro manos`);
        groups['masajes-cuatro-manos'].services.push(service);
      } else if (isRitualService && isDuoService) {
        console.log(`-> Clasificando "${service.name}" como ritual para dos`);
        // Rituales para dos personas van al grupo específico de rituales para dos
        groups['rituales-pareja'].services.push(service);
      } else if (isDuoService) {
        console.log(`-> Clasificando "${service.name}" como masaje para dos`);
        // Masajes para dos personas (que no sean rituales)
        groups['masajes-pareja'].services.push(service);
      } else if (isRitualService && !isDuoService) {
        console.log(`-> Clasificando "${service.name}" como ritual individual`);
        // Solo rituales individuales (no para dos personas)
        groups['rituales'].services.push(service);
      } else if (isRitualService && !isDuoService) {
        // Solo rituales individuales (no para dos personas)
        groups['rituales'].services.push(service);
      } else {
        // Masajes individuales
        groups['masajes-individuales'].services.push(service);
      }
    });

    const result = Object.values(groups);
    console.log('ServiceSelectorGrouped - Final groups result:', result.map(g => ({ name: g.name, services: g.services.length })));
    console.log('ServiceSelectorGrouped - All group keys:', Object.keys(groups));
    console.log('ServiceSelectorGrouped - rituales-pareja group exists:', !!groups['rituales-pareja']);
    
    return result;
  }, [services]);

  const handleSelect = (id: string, kind: "service" | "package") => {
    onSelect(id, kind);
    setIsDropdownOpen(false);
    setIsModalOpen(false);
  };

  const ServiceCard = ({ service }: { service: Service }) => (
    <button
      onClick={() => handleSelect(service.id, "service")}
      className={cn(
        "w-full p-3 rounded-lg border text-left transition-all duration-200",
        "hover:bg-accent hover:border-accent-foreground/20",
        selectedId === service.id 
          ? "border-primary bg-primary/5" 
          : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-medium text-sm truncate",
            selectedId === service.id && "text-primary"
          )}>
            {service.name}
          </h4>
          
          {service.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {service.description}
            </p>
          )}
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{service.duration_minutes} min</span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          {service.has_discount && service.discount_price_cents ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground line-through">
                €{(service.price_cents / 100).toFixed(2)}
              </p>
              <p className="text-sm font-bold text-primary">
                €{(service.discount_price_cents / 100).toFixed(2)}
              </p>
            </div>
          ) : (
            <p className="text-sm font-bold text-foreground">
              €{(service.price_cents / 100).toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </button>
  );

  if (useDropdown) {
    console.log('Rendering dropdown mode, isDropdownOpen:', isDropdownOpen);
    
    return (
      <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-between text-left h-10 sm:h-11",
              !selectedItem && "text-muted-foreground"
            )}
          >
            <span className="truncate">{buttonText}</span>
            <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[400px] max-w-[90vw] p-0 bg-background border shadow-lg z-[1000]" 
          align="start"
          side="bottom"
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-4">
              {groupedServices.map((group, index) => {
                const GroupCollapsible = () => {
                  const [isExpanded, setIsExpanded] = useState(false);
                  
                  return (
                    <div key={index} className="space-y-2">
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn(
                          "w-full flex items-center gap-2 px-1 rounded-md py-1 transition-colors group",
                          (isAdmin || isEmployee) 
                            ? "hover:bg-accent/50" 
                            : "hover:bg-muted/30"
                        )}
                      >
                        {(isAdmin || isEmployee) && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />}
                        <h4 className="font-medium text-sm text-foreground">{group.name}</h4>
                        <span className="text-xs text-muted-foreground ml-1">({group.services.length})</span>
                        <div className="flex-1 h-px bg-border" />
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="space-y-2 animate-in slide-in-from-top-1 duration-150">
                          {group.services.map((service) => (
                            <ServiceCard key={service.id} service={service} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                };
                
                return <GroupCollapsible key={index} />;
              })}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }

  // Original modal behavior for non-admin users
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-between text-left h-10 sm:h-11",
          !selectedItem && "text-muted-foreground"
        )}
        onClick={() => setIsModalOpen(true)}
      >
        <span className="truncate">{buttonText}</span>
        <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
      </Button>

      <ServiceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        mode={mode}
        services={services}
        packages={packages}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </>
  );
};

export default ServiceSelectorGrouped;