import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { useIsMobile } from "@/hooks/use-mobile";
import AppModal from "@/components/ui/app-modal";

interface DatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  placeholder?: string;
}

export const DatePickerModal = ({
  open,
  onOpenChange,
  selected,
  onSelect,
  disabled,
  placeholder = "Seleccionar fecha"
}: DatePickerModalProps) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState<boolean>(open);

  React.useEffect(() => {
    setIsOpen(open);
  }, [open]);

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
        <CalendarIcon className="mr-2 h-4 w-4" />
        {selected ? format(selected, "PPP", { locale: es }) : placeholder}
      </Button>

      <AppModal open={isOpen} onClose={closeModal} maxWidth={500} mobileMaxWidth={350} maxHeight={600} zIndex={120}>
            <div className="pb-4 border-b border-border/10 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-left">📅 Seleccionar Fecha</div>
                  <p className="text-sm text-muted-foreground mt-1">Elige la fecha para tu cita</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-6">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selected}
                  onSelect={(date) => {
                    onSelect(date);
                    closeModal();
                  }}
                  disabled={disabled}
                  locale={es}
                  className="w-full max-w-sm mx-auto p-3 pointer-events-auto"
                  classNames={{
                    months: "flex flex-col space-y-6 w-full",
                    month: "space-y-6 w-full",
                    caption: "flex justify-center pt-2 relative items-center w-full mb-4",
                    caption_label: "text-lg font-bold text-foreground",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-12 w-12 bg-transparent p-0 opacity-80 hover:opacity-100 border-2 border-input hover:bg-accent hover:text-accent-foreground rounded-lg transition-all",
                    nav_button_previous: "absolute left-2",
                    nav_button_next: "absolute right-2",
                    table: "w-full border-collapse space-y-2",
                    head_row: "flex w-full mb-2",
                    head_cell: "text-muted-foreground rounded-md w-12 font-semibold text-base flex items-center justify-center py-3",
                    row: "flex w-full mt-3",
                    cell: "text-center text-base p-1 relative w-12 h-12 flex items-center justify-center",
                    day: "h-11 w-11 p-0 font-medium text-base cursor-pointer rounded-lg hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-all duration-200 flex items-center justify-center border border-transparent hover:border-accent-foreground/20",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground border-primary",
                    day_today: "bg-accent text-accent-foreground font-bold border-accent-foreground/30",
                    day_outside: "text-muted-foreground opacity-40",
                    day_disabled: "text-muted-foreground opacity-20 cursor-not-allowed",
                    day_hidden: "invisible",
                  }}
                />
              </div>
            </div>
      </AppModal>
    </>
  );
};
