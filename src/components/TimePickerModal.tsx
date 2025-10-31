import React from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import AppModal from "@/components/ui/app-modal";

interface TimeSlot {
  time: string;
  disabled?: boolean;
  reason?: string;
}

interface TimePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string | undefined;
  onSelect: (time: string) => void;
  timeSlots: Array<TimeSlot | string>;
  placeholder?: string;
}

export const TimePickerModal = ({
  open,
  onOpenChange,
  selected,
  onSelect,
  timeSlots,
  placeholder = "Seleccionar hora"
}: TimePickerModalProps) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState<boolean>(open);

  React.useEffect(() => setIsOpen(open), [open]);

  const handleOpenModal = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsOpen(true);
    onOpenChange(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    onOpenChange(false);
  };

  const normalizedSlots = React.useMemo(() => {
    return timeSlots
      .map((slot) =>
        typeof slot === "string" ? { time: slot } : slot,
      )
      .filter((slot): slot is TimeSlot => typeof slot.time === "string" && slot.time.length > 0);
  }, [timeSlots]);

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal mt-1",
          !selected && "text-muted-foreground"
        )}
        onClick={handleOpenModal}
      >
        <Clock className="mr-2 h-4 w-4" />
        {selected || placeholder}
      </Button>

      <AppModal open={isOpen} onClose={closeModal} maxWidth={500} mobileMaxWidth={350} maxHeight={600} zIndex={120}>
            <div className="pb-4 border-b border-border/10 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-left">🕐 Seleccionar Hora</div>
                  <p className="text-sm text-muted-foreground mt-1">Elige el horario que prefieras</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-6">
              <div className="grid grid-cols-3 gap-3 px-4">
                {normalizedSlots.map(({ time, disabled, reason }) => (
                  <Button
                    key={time}
                    variant={selected === time ? "default" : "outline"}
                    className={cn(
                      "h-12 text-sm font-medium transition-all duration-200",
                      disabled
                        ? "bg-muted text-muted-foreground opacity-70 cursor-not-allowed"
                        : selected === time
                          ? "bg-primary text-primary-foreground shadow-md scale-105"
                          : "hover:bg-accent hover:text-accent-foreground hover:scale-105"
                    )}
                    disabled={disabled}
                    title={reason}
                    onClick={() => {
                      onSelect(time);
                      closeModal();
                    }}
                  >
                    {time}
                  </Button>
                ))}
              </div>
              {timeSlots.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No hay horarios disponibles para esta fecha</p>
                </div>
              )}
            </div>
      </AppModal>
    </>
  );
};
