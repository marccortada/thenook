import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InlineSelectOption {
  label: string;
  value: string;
}

interface InlineSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: InlineSelectOption[];
  className?: string;
  triggerClassName?: string;
}

// Simple inline select that expands a panel just below the trigger (no portal, no popper)
const InlineSelect: React.FC<InlineSelectProps> = ({
  value,
  onChange,
  options,
  className,
  triggerClassName,
}) => {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          triggerClassName
        )}
        aria-expanded={open}
      >
        <span className="truncate">{current?.label ?? "Seleccionar"}</span>
        <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
      </button>

      {open && (
        <div
          className={cn(
            "mt-2 w-full rounded-md border bg-background shadow z-50",
            "overflow-hidden"
          )}
        >
          <ul className="py-1 max-h-60 overflow-auto">
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                    value === opt.value
                      ? "bg-accent text-foreground"
                      : "hover:bg-muted/60"
                  )}
                >
                  {value === opt.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  <span className="truncate">{opt.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InlineSelect;
