import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, CreditCard, CheckCircle, TrendingUp, Users, DollarSign, X, Plus, BarChart3 } from "lucide-react";
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

interface PeriodData {
  from: Date;
  to: Date;
  label: string;
  stats?: {
    totalBookings: number;
    totalRevenue: number;
    averageTicket: number;
    totalBookingsAll: number;
  };
}

const PeriodCalendarModal = ({ open, onOpenChange }: PeriodCalendarModalProps) => {
  const { toast } = useToast();
  const [selectedPeriodType, setSelectedPeriodType] = useState<PeriodType>('day');
  const [selectedPeriods, setSelectedPeriods] = useState<PeriodData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);

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

  // Fetch period statistics when periods change
  useEffect(() => {
    if (selectedPeriods.length > 0) {
      fetchPeriodsStats();
    }
  }, [selectedPeriods]);

  const fetchPeriodsStats = async () => {
    setLoadingStats(true);
    try {
      const updatedPeriods = await Promise.all(
        selectedPeriods.map(async (period) => {
          const startDate = format(period.from, 'yyyy-MM-dd');
          const endDate = format(period.to, 'yyyy-MM-dd');

          // Fetch bookings for the selected period
          const { data: bookings, error } = await supabase
            .from("bookings")
            .select("total_price_cents, booking_datetime, payment_status")
            .gte("booking_datetime", startDate)
            .lte("booking_datetime", endDate);

          if (error) {
            console.error("Error fetching period stats:", error);
            return period;
          }

          const completedBookings = bookings?.filter(b => b.payment_status === 'paid') || [];
          const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.total_price_cents || 0), 0);
          const averageTicket = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

          return {
            ...period,
            stats: {
              totalBookings: completedBookings.length,
              totalRevenue: totalRevenue / 100, // Convert to euros
              averageTicket: averageTicket / 100, // Convert to euros
              totalBookingsAll: bookings?.length || 0
            }
          };
        })
      );

      setSelectedPeriods(updatedPeriods);
    } catch (error) {
      console.error("Error fetching periods stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handlePeriodSelection = (start: Date, end: Date, label: string) => {
    const newPeriod: PeriodData = {
      from: start,
      to: end,
      label
    };

    if (comparisonMode) {
      // In comparison mode, add to the list (max 3 periods)
      if (selectedPeriods.length < 3) {
        const exists = selectedPeriods.some(p => 
          p.from.getTime() === start.getTime() && p.to.getTime() === end.getTime()
        );
        if (!exists) {
          setSelectedPeriods([...selectedPeriods, newPeriod]);
        }
      } else {
        toast({
          title: "Límite alcanzado",
          description: "Máximo 3 períodos para comparar",
          variant: "destructive",
        });
      }
    } else {
      // Normal mode, replace the selection
      setSelectedPeriods([newPeriod]);
    }
  };

  const handleDaySelection = (range: { from: Date; to: Date } | undefined) => {
    if (range?.from) {
      const end = range.to || range.from;
      const label = range.from.getTime() === end.getTime() 
        ? format(range.from, 'dd/MM/yyyy', { locale: es })
        : `${format(range.from, 'dd/MM/yyyy', { locale: es })} - ${format(end, 'dd/MM/yyyy', { locale: es })}`;
      
      handlePeriodSelection(range.from, end, label);
    }
  };

  const removePeriod = (index: number) => {
    const newPeriods = selectedPeriods.filter((_, i) => i !== index);
    setSelectedPeriods(newPeriods);
  };

  const handlePurchase = async () => {
    if (selectedPeriods.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona al menos un período",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // For now, purchase the first selected period (can be extended for multiple purchases)
      const firstPeriod = selectedPeriods[0];
      const { data, error } = await supabase.functions.invoke('purchase-period', {
        body: {
          startDate: format(firstPeriod.from, 'yyyy-MM-dd'),
          endDate: format(firstPeriod.to, 'yyyy-MM-dd'),
          periodType: selectedPeriodType,
          priceInfo: {
            stats: firstPeriod.stats,
            daysInPeriod: getDaysInPeriod(firstPeriod),
            comparisonData: selectedPeriods.length > 1 ? selectedPeriods : null
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        const purchase = data.purchase;
        toast({
          title: "¡Compra exitosa!",
          description: `Has comprado el análisis del período "${firstPeriod.label}" por €${(purchase.priceCents / 100).toFixed(2)}`,
        });
        onOpenChange(false);
        setSelectedPeriods([]);
        setComparisonMode(false);
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

  const getDaysInPeriod = (period: PeriodData) => {
    return Math.ceil((period.to.getTime() - period.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const getCurrentSelection = (start: Date, end: Date) => {
    return selectedPeriods.some(p => 
      p.from.getTime() === start.getTime() && p.to.getTime() === end.getTime()
    );
  };

  const getTotalPrice = () => {
    if (selectedPeriods.length === 0) return 0;
    
    return selectedPeriods.reduce((total, period) => {
      const daysInPeriod = getDaysInPeriod(period);
      let price;
      
      if (period.stats && period.stats.totalRevenue > 0) {
        // 5% of actual revenue
        price = period.stats.totalRevenue * 0.05;
      } else {
        // Fallback: €1.99 per day
        price = daysInPeriod * 1.99;
      }
      
      // Minimum €4.99 per period
      return total + Math.max(price, 4.99);
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Seleccionar Períodos para Comparar y Comprar
          </DialogTitle>
          <DialogDescription>
            Selecciona uno o múltiples períodos para analizar y comparar. Los datos mostrados son reales de tu base de datos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Comparison Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant={comparisonMode ? "default" : "outline"}
                onClick={() => setComparisonMode(!comparisonMode)}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Modo Comparación
              </Button>
              {comparisonMode && (
                <Badge variant="secondary">
                  {selectedPeriods.length}/3 períodos seleccionados
                </Badge>
              )}
            </div>
          </div>

          {/* Selected Periods Display */}
          {selectedPeriods.length > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Períodos Seleccionados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedPeriods.map((period, index) => (
                    <Card key={index} className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0"
                        onClick={() => removePeriod(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-sm">{period.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          {getDaysInPeriod(period)} días
                        </p>
                        {period.stats && (
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Reservas:</span>
                              <span className="font-medium">{period.stats.totalBookings}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Ingresos:</span>
                              <span className="font-medium">€{period.stats.totalRevenue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Ticket medio:</span>
                              <span className="font-medium">€{period.stats.averageTicket.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                  <CardTitle>Seleccionar Rango de Días</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {comparisonMode ? "Haz clic para añadir períodos a la comparación" : "Selecciona un rango de fechas"}
                  </p>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="range"
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
                  <CardTitle>Seleccionar Meses</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {comparisonMode ? "Selecciona múltiples meses para comparar" : "Selecciona un mes"}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                    {months.map((month) => (
                      <Button
                        key={month.label}
                        variant={getCurrentSelection(month.start, month.end) ? "default" : "outline"}
                        className="h-auto p-3 flex flex-col items-center text-xs"
                        onClick={() => handlePeriodSelection(month.start, month.end, month.label)}
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
                  <CardTitle>Seleccionar Trimestres</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {comparisonMode ? "Selecciona múltiples trimestres para comparar" : "Selecciona un trimestre"}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {quarters.map((quarter) => (
                      <Button
                        key={quarter.label}
                        variant={getCurrentSelection(quarter.start, quarter.end) ? "default" : "outline"}
                        className="h-auto p-4 flex flex-col items-center"
                        onClick={() => handlePeriodSelection(quarter.start, quarter.end, quarter.label)}
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
                  <CardTitle>Seleccionar Años</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {comparisonMode ? "Selecciona múltiples años para comparar" : "Selecciona un año"}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {years.map((year) => (
                      <Button
                        key={year.label}
                        variant={getCurrentSelection(year.start, year.end) ? "default" : "outline"}
                        className="h-auto p-8 flex flex-col items-center"
                        onClick={() => handlePeriodSelection(year.start, year.end, year.label)}
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

          {/* Comparison Summary */}
          {selectedPeriods.length > 1 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Comparación de Períodos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-blue-700">Total Reservas</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {loadingStats ? "..." : selectedPeriods.reduce((sum, p) => sum + (p.stats?.totalBookings || 0), 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700">Total Ingresos</p>
                    <p className="text-2xl font-bold text-green-900">
                      {loadingStats ? "..." : `€${selectedPeriods.reduce((sum, p) => sum + (p.stats?.totalRevenue || 0), 0).toFixed(2)}`}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-purple-700">Ticket Medio Promedio</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {loadingStats ? "..." : `€${(selectedPeriods.reduce((sum, p) => sum + (p.stats?.averageTicket || 0), 0) / selectedPeriods.length).toFixed(2)}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Purchase Button */}
          <div className="flex justify-between items-center">
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Precio total del análisis:</p>
              <p className="text-2xl font-bold text-primary">€{getTotalPrice().toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Basado en datos reales de reservas</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={selectedPeriods.length === 0 || isLoading || loadingStats}
                className={cn(
                  "px-8 py-3 text-lg font-semibold rounded-xl",
                  "bg-gradient-to-r from-primary to-primary/80",
                  "hover:from-primary/90 hover:to-primary/70",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {isLoading ? "Procesando..." : loadingStats ? "Calculando..." : 
                 selectedPeriods.length > 1 ? "Comprar Análisis Comparativo" : "Comprar Análisis"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PeriodCalendarModal;