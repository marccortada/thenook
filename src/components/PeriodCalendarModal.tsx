import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, CreditCard, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PeriodCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PeriodType = 'day' | 'month' | 'quarter' | 'year';

const PeriodCalendarModal = ({ open, onOpenChange }: PeriodCalendarModalProps) => {
  const { toast } = useToast();
  const [selectedPeriodType, setSelectedPeriodType] = useState<PeriodType>('day');
  const [selectedRange, setSelectedRange] = useState<{ from: Date; to: Date } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const periodPrices = {
    day: { price: 9.99, label: "Día" },
    month: { price: 29.99, label: "Mes" },
    quarter: { price: 79.99, label: "Trimestre" },
    year: { price: 299.99, label: "Año" }
  };

  const quarters = [
    { label: "Q1 2024", start: new Date(2024, 0, 1), end: new Date(2024, 2, 31) },
    { label: "Q2 2024", start: new Date(2024, 3, 1), end: new Date(2024, 5, 30) },
    { label: "Q3 2024", start: new Date(2024, 6, 1), end: new Date(2024, 8, 30) },
    { label: "Q4 2024", start: new Date(2024, 9, 1), end: new Date(2024, 11, 31) },
  ];

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2024, i, 1);
    return {
      label: format(date, "MMMM yyyy", { locale: es }),
      start: startOfMonth(date),
      end: endOfMonth(date)
    };
  });

  const years = [
    { label: "2024", start: startOfYear(new Date(2024, 0, 1)), end: endOfYear(new Date(2024, 0, 1)) },
    { label: "2025", start: startOfYear(new Date(2025, 0, 1)), end: endOfYear(new Date(2025, 0, 1)) },
  ];

  const handleQuickSelection = (start: Date, end: Date) => {
    setSelectedRange({ from: start, to: end });
  };

  const handleDaySelection = (range: { from: Date; to: Date } | undefined) => {
    if (range?.from && range?.to) {
      setSelectedRange(range);
    }
  };

  const handlePurchase = async () => {
    if (!selectedRange) {
      toast({
        title: "Error",
        description: "Por favor selecciona un período",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('purchase-period', {
        body: {
          startDate: format(selectedRange.from, 'yyyy-MM-dd'),
          endDate: format(selectedRange.to, 'yyyy-MM-dd'),
          periodType: selectedPeriodType,
          priceInfo: {
            amount: periodPrices[selectedPeriodType].price,
            currency: 'EUR',
            label: periodPrices[selectedPeriodType].label
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "¡Compra exitosa!",
          description: `Has comprado el período desde ${format(selectedRange.from, 'dd/MM/yyyy', { locale: es })} hasta ${format(selectedRange.to, 'dd/MM/yyyy', { locale: es })}`,
        });
        onOpenChange(false);
        setSelectedRange(null);
      } else {
        throw new Error(data.error || 'Error en la compra');
      }
    } catch (error) {
      console.error('Error purchasing period:', error);
      toast({
        title: "Error en la compra",
        description: "No se pudo completar la compra. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatSelectedPeriod = () => {
    if (!selectedRange) return null;
    
    const days = Math.ceil((selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      start: format(selectedRange.from, 'dd/MM/yyyy', { locale: es }),
      end: format(selectedRange.to, 'dd/MM/yyyy', { locale: es }),
      days,
      price: periodPrices[selectedPeriodType].price
    };
  };

  const selectedPeriodInfo = formatSelectedPeriod();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Seleccionar Período para Comprar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Period Type Selection */}
          <Tabs value={selectedPeriodType} onValueChange={(value) => setSelectedPeriodType(value as PeriodType)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="day" className="text-sm">
                Días
                <Badge variant="secondary" className="ml-2">€{periodPrices.day.price}</Badge>
              </TabsTrigger>
              <TabsTrigger value="month" className="text-sm">
                Meses
                <Badge variant="secondary" className="ml-2">€{periodPrices.month.price}</Badge>
              </TabsTrigger>
              <TabsTrigger value="quarter" className="text-sm">
                Trimestres
                <Badge variant="secondary" className="ml-2">€{periodPrices.quarter.price}</Badge>
              </TabsTrigger>
              <TabsTrigger value="year" className="text-sm">
                Años
                <Badge variant="secondary" className="ml-2">€{periodPrices.year.price}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="day" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Seleccionar Rango de Días</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="range"
                    selected={selectedRange}
                    onSelect={handleDaySelection}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                    locale={es}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="month" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Seleccionar Mes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {months.map((month) => (
                      <Button
                        key={month.label}
                        variant={selectedRange?.from?.getTime() === month.start.getTime() ? "default" : "outline"}
                        className="h-auto p-4 flex flex-col items-center"
                        onClick={() => handleQuickSelection(month.start, month.end)}
                      >
                        <span className="font-medium">{month.label}</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {format(month.start, 'dd MMM', { locale: es })} - {format(month.end, 'dd MMM', { locale: es })}
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quarter" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Seleccionar Trimestre</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {quarters.map((quarter) => (
                      <Button
                        key={quarter.label}
                        variant={selectedRange?.from?.getTime() === quarter.start.getTime() ? "default" : "outline"}
                        className="h-auto p-6 flex flex-col items-center"
                        onClick={() => handleQuickSelection(quarter.start, quarter.end)}
                      >
                        <span className="font-bold text-lg">{quarter.label}</span>
                        <span className="text-sm text-muted-foreground mt-2">
                          {format(quarter.start, 'dd MMM', { locale: es })} - {format(quarter.end, 'dd MMM', { locale: es })}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">3 meses</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="year" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Seleccionar Año</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {years.map((year) => (
                      <Button
                        key={year.label}
                        variant={selectedRange?.from?.getTime() === year.start.getTime() ? "default" : "outline"}
                        className="h-auto p-8 flex flex-col items-center"
                        onClick={() => handleQuickSelection(year.start, year.end)}
                      >
                        <span className="font-bold text-2xl">{year.label}</span>
                        <span className="text-sm text-muted-foreground mt-2">
                          {format(year.start, 'dd MMM', { locale: es })} - {format(year.end, 'dd MMM', { locale: es })}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">12 meses</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Selection Summary */}
          {selectedPeriodInfo && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Resumen de Selección
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Período:</span>
                  <span>{selectedPeriodInfo.start} - {selectedPeriodInfo.end}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Duración:</span>
                  <span>{selectedPeriodInfo.days} día{selectedPeriodInfo.days !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Tipo:</span>
                  <Badge variant="secondary">{periodPrices[selectedPeriodType].label}</Badge>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="font-bold text-lg">Total:</span>
                  <span className="font-bold text-xl text-primary">€{selectedPeriodInfo.price}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Purchase Button */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={!selectedRange || isLoading}
              className={cn(
                "px-8 py-3 text-lg font-semibold rounded-xl",
                "bg-gradient-to-r from-primary to-primary/80",
                "hover:from-primary/90 hover:to-primary/70",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {isLoading ? "Procesando..." : "Comprar este período"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PeriodCalendarModal;