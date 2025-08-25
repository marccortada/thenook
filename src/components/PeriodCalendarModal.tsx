import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, CreditCard, CheckCircle, TrendingUp, Users, DollarSign } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
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
  const [periodStats, setPeriodStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const quarters = [
    { label: "Q1 2024", start: new Date(2024, 0, 1), end: new Date(2024, 2, 31) },
    { label: "Q2 2024", start: new Date(2024, 3, 1), end: new Date(2024, 5, 30) },
    { label: "Q3 2024", start: new Date(2024, 6, 1), end: new Date(2024, 8, 30) },
    { label: "Q4 2024", start: new Date(2024, 9, 1), end: new Date(2024, 11, 31) },
    { label: "Q1 2025", start: new Date(2025, 0, 1), end: new Date(2025, 2, 31) },
    { label: "Q2 2025", start: new Date(2025, 3, 1), end: new Date(2025, 5, 30) },
  ];

  const months = Array.from({ length: 24 }, (_, i) => {
    const year = 2024 + Math.floor(i / 12);
    const month = i % 12;
    const date = new Date(year, month, 1);
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

  // Fetch period statistics when range changes
  useEffect(() => {
    if (selectedRange) {
      fetchPeriodStats();
    }
  }, [selectedRange]);

  const fetchPeriodStats = async () => {
    if (!selectedRange) return;
    
    setLoadingStats(true);
    try {
      const startDate = format(selectedRange.from, 'yyyy-MM-dd');
      const endDate = format(selectedRange.to, 'yyyy-MM-dd');

      // Fetch bookings for the selected period
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("total_price_cents, booking_datetime, payment_status")
        .gte("booking_datetime", startDate)
        .lte("booking_datetime", endDate);

      if (error) {
        console.error("Error fetching period stats:", error);
        return;
      }

      const completedBookings = bookings?.filter(b => b.payment_status === 'paid') || [];
      const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.total_price_cents || 0), 0);
      const averageTicket = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

      setPeriodStats({
        totalBookings: completedBookings.length,
        totalRevenue: totalRevenue / 100, // Convert to euros
        averageTicket: averageTicket / 100, // Convert to euros
        totalBookingsAll: bookings?.length || 0
      });
    } catch (error) {
      console.error("Error fetching period stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleQuickSelection = (start: Date, end: Date) => {
    setSelectedRange({ from: start, to: end });
  };

  const handleDaySelection = (range: { from: Date; to: Date } | undefined) => {
    if (range?.from) {
      if (!range.to) {
        // Solo una fecha seleccionada, establecer ambas fechas como la misma
        setSelectedRange({ from: range.from, to: range.from });
      } else {
        // Rango completo seleccionado
        setSelectedRange(range);
      }
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
            stats: periodStats,
            daysInPeriod: getDaysInPeriod()
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        const purchase = data.purchase;
        toast({
          title: "¡Compra exitosa!",
          description: `Has comprado el período desde ${format(selectedRange.from, 'dd/MM/yyyy', { locale: es })} hasta ${format(selectedRange.to, 'dd/MM/yyyy', { locale: es })} por €${(purchase.priceCents / 100).toFixed(2)}`,
        });
        onOpenChange(false);
        setSelectedRange(null);
        setPeriodStats(null);
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

  const getDaysInPeriod = () => {
    if (!selectedRange) return 0;
    return Math.ceil((selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const getRealPrice = () => {
    if (!periodStats || !selectedRange) return "Calculando...";
    
    let realPrice;
    
    if (periodStats.totalRevenue > 0) {
      // 5% of actual revenue from real bookings
      realPrice = periodStats.totalRevenue * 0.05;
    } else {
      // If no revenue, use minimum price
      realPrice = 4.99;
    }
    
    // Ensure minimum €4.99
    realPrice = Math.max(realPrice, 4.99);
    
    return `€${realPrice.toFixed(2)}`;
  };

  const formatSelectedPeriod = () => {
    if (!selectedRange) return null;
    
    const days = getDaysInPeriod();
    
    return {
      start: format(selectedRange.from, 'dd/MM/yyyy', { locale: es }),
      end: format(selectedRange.to, 'dd/MM/yyyy', { locale: es }),
      days,
      realPrice: getRealPrice()
    };
  };

  const selectedPeriodInfo = formatSelectedPeriod();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
              <TabsTrigger value="day" className="text-sm">Días</TabsTrigger>
              <TabsTrigger value="month" className="text-sm">Meses</TabsTrigger>
              <TabsTrigger value="quarter" className="text-sm">Trimestres</TabsTrigger>
              <TabsTrigger value="year" className="text-sm">Años</TabsTrigger>
            </TabsList>

            <TabsContent value="day" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Seleccionar Período - Pulsa dos fechas</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Primera fecha: inicio del período | Segunda fecha: fin del período
                  </p>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                    {months.map((month) => (
                      <Button
                        key={month.label}
                        variant={selectedRange?.from?.getTime() === month.start.getTime() ? "default" : "outline"}
                        className="h-auto p-3 flex flex-col items-center text-xs"
                        onClick={() => handleQuickSelection(month.start, month.end)}
                      >
                        <span className="font-medium">{month.label}</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {format(month.start, 'dd MMM', { locale: es })} - {format(month.end, 'dd MMM', { locale: es })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.ceil((month.end.getTime() - month.start.getTime()) / (1000 * 60 * 60 * 24)) + 1} días
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {quarters.map((quarter) => (
                      <Button
                        key={quarter.label}
                        variant={selectedRange?.from?.getTime() === quarter.start.getTime() ? "default" : "outline"}
                        className="h-auto p-4 flex flex-col items-center"
                        onClick={() => handleQuickSelection(quarter.start, quarter.end)}
                      >
                        <span className="font-bold text-lg">{quarter.label}</span>
                        <span className="text-sm text-muted-foreground mt-2">
                          {format(quarter.start, 'dd MMM', { locale: es })} - {format(quarter.end, 'dd MMM', { locale: es })}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {Math.ceil((quarter.end.getTime() - quarter.start.getTime()) / (1000 * 60 * 60 * 24)) + 1} días
                        </span>
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
                        <span className="text-xs text-muted-foreground mt-1">
                          {Math.ceil((year.end.getTime() - year.start.getTime()) / (1000 * 60 * 60 * 24)) + 1} días
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Period Statistics - Destacar reservas y cash */}
          {selectedRange && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">📊 Datos del Período Seleccionado</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-blue-50 border-blue-200 border-2">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-medium text-blue-700">📅 Número de Reservas</p>
                        <p className="text-4xl font-bold text-blue-900">
                          {loadingStats ? "..." : periodStats?.totalBookings || 0}
                        </p>
                        <p className="text-sm text-blue-600 mt-1">reservas completadas</p>
                      </div>
                      <Users className="h-12 w-12 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200 border-2">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-medium text-green-700">💰 Cash Total</p>
                        <p className="text-4xl font-bold text-green-900">
                          {loadingStats ? "..." : `€${periodStats?.totalRevenue?.toFixed(2) || "0.00"}`}
                        </p>
                        <p className="text-sm text-green-600 mt-1">ingresos confirmados</p>
                      </div>
                      <DollarSign className="h-12 w-12 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Ticket medio en una card separada más pequeña */}
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Ticket Medio</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {loadingStats ? "..." : `€${periodStats?.averageTicket?.toFixed(2) || "0.00"}`}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                  <Badge variant="secondary">
                    {selectedPeriodType === 'day' ? 'Día(s)' :
                     selectedPeriodType === 'month' ? 'Mes' :
                     selectedPeriodType === 'quarter' ? 'Trimestre' : 'Año'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="font-bold text-lg">Precio Real:</span>
                  <span className="font-bold text-xl text-primary">{selectedPeriodInfo.realPrice}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  * Precio calculado con datos reales del período: {periodStats?.totalBookings || 0} reservas, €{periodStats?.totalRevenue?.toFixed(2) || "0.00"} ingresos
                </p>
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
              disabled={!selectedRange || isLoading || loadingStats}
              className={cn(
                "px-8 py-3 text-lg font-semibold rounded-xl",
                "bg-gradient-to-r from-primary to-primary/80",
                "hover:from-primary/90 hover:to-primary/70",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {isLoading ? "Procesando..." : loadingStats ? "Calculando..." : "Comprar este período"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PeriodCalendarModal;