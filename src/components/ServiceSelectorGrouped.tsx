import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { Service, Package } from "@/hooks/useDatabase";
import { cn } from "@/lib/utils";

interface Props {
  mode: "individual" | "voucher";
  services: Service[];
  packages: Package[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

// Heurísticas simples para agrupar servicios por nombre/texto existente en la BD
const isDuo = (name?: string) => !!name?.toLowerCase().match(/(dos|pareja|parejas|dúo|duo)/);
const isCuatroManos = (name?: string) => !!name?.toLowerCase().includes("cuatro manos");
const isRitual = (name?: string, description?: string) => {
  const txt = `${name || ""} ${description || ""}`.toLowerCase();
  return txt.includes("ritual");
};

const currency = (cents?: number) =>
  typeof cents === "number" ? (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "";

const ItemRow: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  active?: boolean;
}> = ({ title, subtitle, right, active }) => (
  <div
    className={cn(
      "flex items-center justify-between gap-3 px-3 py-2 rounded-md border",
      "bg-card text-card-foreground",
      active ? "border-primary/60 ring-1 ring-primary/30" : "border-border"
    )}
  >
    <div className="min-w-0">
      <p className={cn("text-sm font-medium truncate", active && "text-primary")}>{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
    </div>
    {right}
  </div>
);

const ServiceSelectorGrouped: React.FC<Props> = ({ mode, services, packages, selectedId, onSelect }) => {
  if (mode === "voucher") {
    return (
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="bonos">
          <AccordionTrigger className="px-3">Bonos</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {packages.length === 0 && (
              <p className="text-sm text-muted-foreground px-3">No hay bonos disponibles para el centro seleccionado.</p>
            )}
            {packages.map((pkg) => (
              <ItemRow
                key={pkg.id}
                title={pkg.name}
                subtitle={`${pkg.sessions_count} sesiones${pkg.services?.duration_minutes ? ` · ${pkg.services.duration_minutes} min` : ""} · ${currency(pkg.price_cents)}`}
                right={
                  <Button size="sm" variant={selectedId === pkg.id ? "default" : "outline"} onClick={() => onSelect(pkg.id)}>
                    {selectedId === pkg.id ? "Seleccionado" : "Seleccionar"}
                  </Button>
                }
                active={selectedId === pkg.id}
              />
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  // Filtrar solo servicios activos de tipo masaje o tratamiento según texto
  const massageServices = services.filter((s) => s.active !== false);

  const groups = [
    {
      key: "masajes-individuales",
      title: "Masajes Individuales",
      items: massageServices.filter((s) => s.type === "massage" && !isDuo(s.name) && !isCuatroManos(s.name) && !isRitual(s.name, s.description)),
    },
    {
      key: "masajes-cuatro-manos",
      title: "Masajes a Cuatro Manos",
      items: massageServices.filter((s) => isCuatroManos(s.name)),
    },
    {
      key: "masajes-dos-personas",
      title: "Masajes para dos Personas",
      items: massageServices.filter((s) => s.type === "massage" && isDuo(s.name) && !isRitual(s.name, s.description)),
    },
    {
      key: "rituales-individuales",
      title: "Rituales Individuales",
      items: massageServices.filter((s) => isRitual(s.name, s.description) && !isDuo(s.name)),
    },
    {
      key: "rituales-dos-personas",
      title: "Rituales para dos Personas",
      items: massageServices.filter((s) => isRitual(s.name, s.description) && isDuo(s.name)),
    },
  ];

  // Ocultar grupos vacíos para no confundir
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  return (
    <Accordion type="single" collapsible className="w-full">
      {visibleGroups.map((group) => (
        <AccordionItem key={group.key} value={group.key}>
          <AccordionTrigger className="px-3">{group.title}</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {group.items.map((s) => (
              <ItemRow
                key={s.id}
                title={s.name}
                subtitle={`${s.duration_minutes} min · ${currency(s.price_cents)}`}
                right={
                  <Button size="sm" variant={selectedId === s.id ? "default" : "outline"} onClick={() => onSelect(s.id)}>
                    {selectedId === s.id ? "Seleccionado" : "Seleccionar"}
                  </Button>
                }
                active={selectedId === s.id}
              />)
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
      {visibleGroups.length === 0 && (
        <p className="text-sm text-muted-foreground px-3">No hay servicios disponibles para el centro seleccionado.</p>
      )}
    </Accordion>
  );
};

export default ServiceSelectorGrouped;
