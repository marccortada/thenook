import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Service, Package } from "@/hooks/useDatabase";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import ServiceModal from "./ServiceModal";

interface Props {
  mode?: "individual" | "voucher" | "combined";
  services: Service[];
  packages: Package[];
  selectedId?: string;
  onSelect: (id: string, kind: "service" | "package") => void;
}

const ServiceSelectorGrouped: React.FC<Props> = ({
  mode = "individual",
  services,
  packages,
  selectedId,
  onSelect,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Encontrar el servicio/paquete seleccionado para mostrar en el botón
  const selectedService = services.find(s => s.id === selectedId);
  const selectedPackage = packages.find(p => p.id === selectedId);
  const selectedItem = selectedService || selectedPackage;

  const buttonText = selectedItem 
    ? selectedItem.name 
    : "Seleccionar servicio";

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