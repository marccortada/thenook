import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, CreditCard, CheckCircle, CheckCircle2, Clock, TrendingUp, Users, DollarSign } from "lucide-react";
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
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<string>('all');

  // Función para obtener el trimestre actual
  const getCurrentQuarter = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    if (currentMonth <= 2) return { year: currentYear, quarter: 1 };
    if (currentMonth <= 5) return { year: currentYear, quarter: 2 };
    if (currentMonth <= 8) return { year: currentYear, quarter: 3 };
    return { year: currentYear, quarter: 4 };
  };

  const currentQuarter = getCurrentQuarter();

  const quarters = [
    { label: "Q1 2025", start: new Date(2025, 0, 1), end: new Date(2025, 2, 31), isCurrent: currentQuarter.year === 2025 && currentQuarter.quarter === 1 },
    { label: "Q2 2025", start: new Date(2025, 3, 1), end: new Date(2025, 5, 30), isCurrent: currentQuarter.year === 2025 && currentQuarter.quarter === 2 },
    { label: "Q3 2025", start: new Date(2025, 6, 1), end: new Date(2025, 8, 31), isCurrent: currentQuarter.year === 2025 && currentQuarter.quarter === 3 },
    { label: "Q4 2025", start: new Date(2025, 9, 1), end: new Date(2025, 11, 31), isCurrent: currentQuarter.year === 2025 && currentQuarter.quarter === 4 },
    { label: "Q1 2026", start: new Date(2026, 0, 1), end: new Date(2026, 2, 31), isCurrent: currentQuarter.year === 2026 && currentQuarter.quarter === 1 },
    { label: "Q2 2026", start: new Date(2026, 3, 1), end: new Date(2026, 5, 30), isCurrent: currentQuarter.year === 2026 && currentQuarter.quarter === 2 },
    { label: "Q3 2026", start: new Date(2026, 6, 1), end: new Date(2026, 8, 31), isCurrent: currentQuarter.year === 2026 && currentQuarter.quarter === 3 },
    { label: "Q4 2026", start: new Date(2026, 9, 1), end: new Date(2026, 11, 31), isCurrent: currentQuarter.year === 2026 && currentQuarter.quarter === 4 },
  ];

  const months = Array.from({ length: 24 }, (_, i) => {
    const year = 2025 + Math.floor(i / 12);
    const month = i % 12;
    const date = new Date(year, month, 1);
    return {
      label: format(date, "MMMM yyyy", { locale: es }),
      start: startOfMonth(date),
      end: endOfMonth(date)
    };
  });

  const years = [
    { label: "2025", start: startOfYear(new Date(2025, 0, 1)), end: endOfYear(new Date(2025, 0, 1)) },
    { label: "2026", start: startOfYear(new Date(2026, 0, 1)), end: endOfYear(new Date(2026, 0, 1)) },
  ];

// Cargar centros al abrir el modal
useEffect(() => {
  if (!open) return;
  (async () => {
    const { data, error } = await supabase
      .from('centers')
      .select('id, name')
      .eq('active', true);
    if (!error && data) setCenters(data as { id: string; name: string }[]);
  })();
}, [open]);

// Recalcular estadísticas cuando cambia el rango o el centro
useEffect(() => {
  if (selectedRange) {
    fetchPeriodStats();
  }
}, [selectedRange, selectedCenter]);

const fetchPeriodStats = async () => {
  if (!selectedRange) return;
  setLoadingStats(true);
  try {
    const startDate = format(selectedRange.from, 'yyyy-MM-dd');
    const endDate = format(selectedRange.to, 'yyyy-MM-dd');

    // Construir consulta con rango completo del día y filtro por centro
    let query = supabase
      .from("bookings")
      .select("total_price_cents, booking_datetime, payment_status, status, center_id")
      .gte("booking_datetime", `${startDate}T00:00:00`)
      .lte("booking_datetime", `${endDate}T23:59:59`);

    if (selectedCenter !== 'all') {
      query = query.eq('center_id', selectedCenter);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Error fetching period stats:", error);
      return;
    }

    const confirmedBookings = bookings?.filter((b: any) => b.status === 'confirmed') || [];
    const revenueBookings = bookings?.filter((b: any) => ['paid', 'completed'].includes((b.payment_status as string) || '')) || [];

    const totalRevenueCents = revenueBookings.reduce((sum: number, booking: any) => sum + (booking.total_price_cents || 0), 0);
    const averageTicketCents = revenueBookings.length > 0 ? totalRevenueCents / revenueBookings.length : 0;

    setPeriodStats({
      totalBookings: confirmedBookings.length,
      totalRevenue: totalRevenueCents / 100, // euros
      averageTicket: averageTicketCents / 100, // euros
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
      days
    };
  };

  const selectedPeriodInfo = formatSelectedPeriod();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Comparar Períodos - Datos Reales
          </DialogTitle>
        </DialogHeader>

<div className="space-y-6">
  <div className="flex flex-wrap items-end gap-4">
    <div className="space-y-1">
      <span className="text-sm font-medium">Centro</span>
      <Select value={selectedCenter} onValueChange={(v) => setSelectedCenter(v)}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Todos los centros" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los centros</SelectItem>
          {centers.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
                    {months.map((month, index) => {
                      const isSelected = selectedRange?.from?.getTime() === month.start.getTime();
                      // Colores alternos para meses
                      const monthColors = [
                        'from-indigo-400 to-indigo-600 border-indigo-500',
                        'from-pink-400 to-pink-600 border-pink-500',
                        'from-teal-400 to-teal-600 border-teal-500',
                        'from-amber-400 to-amber-600 border-amber-500'
                      ];
                      const colorClass = monthColors[index % 4];
                      
                      return (
                        <div
                          key={month.label}
                          className={cn(
                            "relative cursor-pointer transition-all duration-300 hover:scale-105",
                            isSelected && "ring-4 ring-primary ring-offset-2"
                          )}
                          onClick={() => handleQuickSelection(month.start, month.end)}
                        >
                          <div className={cn(
                            "bg-gradient-to-br p-4 rounded-lg border-2 shadow-md text-white text-center",
                            colorClass
                          )}>
                            <div className="text-sm font-bold">{month.label}</div>
                            <div className="text-xs mt-2 bg-white/20 rounded p-1">
                              <div className="flex items-center justify-center">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {format(month.start, 'dd MMM', { locale: es })} - {format(month.end, 'dd MMM', { locale: es })}
                              </div>
                              <div className="flex items-center justify-center mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {Math.ceil((month.end.getTime() - month.start.getTime()) / (1000 * 60 * 60 * 24)) + 1} días
                              </div>
                            </div>
                            
                            {isSelected && (
                              <div className="absolute -top-2 -right-2">
                                <CheckCircle2 className="h-6 w-6 bg-white text-green-600 rounded-full" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {quarters.map((quarter, index) => {
                       const isSelected = selectedRange?.from?.getTime() === quarter.start.getTime();
                       const isCurrent = quarter.isCurrent;
                       
                       // Diferentes colores para cada trimestre
                       const colorClasses = [
                         'from-blue-400 to-blue-600 border-blue-500',
                         'from-green-400 to-green-600 border-green-500', 
                         'from-orange-400 to-orange-600 border-orange-500',
                         'from-purple-400 to-purple-600 border-purple-500'
                       ];
                       const colorClass = colorClasses[index % 4];
                       
                       return (
                         <div
                           key={quarter.label}
                           className={cn(
                             "relative group cursor-pointer transition-all duration-300 hover:scale-105",
                             isSelected && "ring-4 ring-primary ring-offset-2"
                           )}
                           onClick={() => handleQuickSelection(quarter.start, quarter.end)}
                         >
                           {/* Decorative background pattern */}
                           <div className="absolute inset-0 bg-gradient-to-br opacity-10 rounded-lg" style={{
                             backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)`
                           }}></div>
                           
                           <div className={cn(
                             "relative bg-gradient-to-br p-6 rounded-lg border-2 shadow-lg text-white overflow-hidden",
                             colorClass,
                             isCurrent && "ring-4 ring-yellow-400 ring-offset-2",
                             isSelected && "ring-4 ring-white ring-offset-2"
                           )}>
                             {/* Current indicator */}
                             {isCurrent && (
                               <div className="absolute -top-1 -right-1">
                                 <div className="bg-yellow-400 text-black text-xs px-3 py-1 rounded-full font-bold shadow-lg animate-pulse">
                                   ACTUAL
                                 </div>
                               </div>
                             )}
                             
                             {/* Quarter icon */}
                             <div className="flex items-center justify-between mb-3">
                               <div className="text-2xl font-bold bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">
                                 Q{((index % 4) + 1)}
                               </div>
                               <div className="text-right">
                                 <div className="text-sm opacity-90">
                                   {quarter.label.split(' ')[1]}
                                 </div>
                               </div>
                             </div>
                             
                             <div className="space-y-2">
                               <h3 className="text-xl font-bold">{quarter.label}</h3>
                               <div className="text-sm bg-white/20 rounded p-2">
                                 <div className="flex items-center text-xs">
                                   <CalendarIcon className="h-3 w-3 mr-1" />
                                   {format(quarter.start, 'dd MMM', { locale: es })} - {format(quarter.end, 'dd MMM', { locale: es })}
                                 </div>
                                 <div className="flex items-center text-xs mt-1">
                                   <Clock className="h-3 w-3 mr-1" />
                                   {Math.ceil((quarter.end.getTime() - quarter.start.getTime()) / (1000 * 60 * 60 * 24)) + 1} días
                                 </div>
                               </div>
                             </div>
                             
                             {/* Selection indicator */}
                             {isSelected && (
                               <div className="absolute bottom-2 right-2">
                                 <CheckCircle2 className="h-6 w-6 bg-white text-green-600 rounded-full" />
                               </div>
                             )}
                           </div>
                         </div>
                       );
                     })}
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
                  <div className="grid grid-cols-2 gap-6">
                    {years.map((year, index) => {
                      const isSelected = selectedRange?.from?.getTime() === year.start.getTime();
                      // Colores para años
                      const yearColors = [
                        'from-violet-500 to-violet-700 border-violet-600',
                        'from-emerald-500 to-emerald-700 border-emerald-600'
                      ];
                      const colorClass = yearColors[index % 2];
                      
                      return (
                        <div
                          key={year.label}
                          className={cn(
                            "relative cursor-pointer transition-all duration-300 hover:scale-105",
                            isSelected && "ring-4 ring-primary ring-offset-2"
                          )}
                          onClick={() => handleQuickSelection(year.start, year.end)}
                        >
                          <div className={cn(
                            "bg-gradient-to-br p-8 rounded-xl border-2 shadow-xl text-white text-center",
                            colorClass
                          )}>
                            <div className="space-y-4">
                              <div className="text-4xl font-bold">{year.label}</div>
                              <div className="text-sm bg-white/20 rounded-lg p-3">
                                <div className="flex items-center justify-center mb-2">
                                  <CalendarIcon className="h-4 w-4 mr-2" />
                                  <span className="font-medium">Año Completo</span>
                                </div>
                                <div className="flex items-center justify-center">
                                  <Clock className="h-4 w-4 mr-2" />
                                  {Math.ceil((year.end.getTime() - year.start.getTime()) / (1000 * 60 * 60 * 24)) + 1} días
                                </div>
                              </div>
                            </div>
                            
                            {isSelected && (
                              <div className="absolute -top-3 -right-3">
                                <CheckCircle2 className="h-8 w-8 bg-white text-green-600 rounded-full shadow-lg" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
<p className="text-lg font-medium text-blue-700">📅 Reservas Confirmadas</p>
<p className="text-4xl font-bold text-blue-900">
  {loadingStats ? "..." : periodStats?.totalBookings || 0}
</p>
<p className="text-sm text-blue-600 mt-1">reservas confirmadas</p>
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

          {/* Summary of Selected Period */}
          {selectedPeriodInfo && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Resumen del Período
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
              </CardContent>
            </Card>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PeriodCalendarModal;