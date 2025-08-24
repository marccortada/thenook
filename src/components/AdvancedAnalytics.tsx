import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Download, 
  Calendar as CalendarIcon,
  RotateCcw,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";

interface ComparisonPeriod {
  label: string;
  startDate: Date;
  endDate: Date;
}

export default function AdvancedAnalytics() {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [currentPeriod, setCurrentPeriod] = useState<ComparisonPeriod>({
    label: "Este mes",
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>({
    label: "Mes anterior",
    startDate: startOfMonth(subDays(new Date(), 30)),
    endDate: endOfMonth(subDays(new Date(), 30))
  });
  const [showDatePicker, setShowDatePicker] = useState<'current' | 'comparison' | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'auto' | 'custom'>('auto');

  // Mock data
  const mockData = {
    currentBookings: 45,
    previousBookings: 38,
    currentRevenue: 3250,
    previousRevenue: 2890,
    currentTicket: 72.22,
    previousTicket: 76.05,
    currentClients: 12,
    previousClients: 8
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const generateQuickPeriods = (granularity: string) => {
    const now = new Date();
    const periods = [];

    switch (granularity) {
      case 'day':
        for (let i = 0; i < 7; i++) {
          const date = subDays(now, i);
          periods.push({
            label: i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : format(date, 'EEEE', { locale: es }),
            startDate: startOfDay(date),
            endDate: endOfDay(date)
          });
        }
        break;
      case 'week':
        for (let i = 0; i < 4; i++) {
          const date = subDays(now, i * 7);
          periods.push({
            label: i === 0 ? 'Esta semana' : `Hace ${i} semana${i > 1 ? 's' : ''}`,
            startDate: startOfWeek(date, { locale: es }),
            endDate: endOfWeek(date, { locale: es })
          });
        }
        break;
      case 'month':
        for (let i = 0; i < 6; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          periods.push({
            label: i === 0 ? 'Este mes' : format(date, 'MMMM yyyy', { locale: es }),
            startDate: startOfMonth(date),
            endDate: endOfMonth(date)
          });
        }
        break;
      case 'year':
        for (let i = 0; i < 3; i++) {
          const date = new Date(now.getFullYear() - i, 0, 1);
          periods.push({
            label: i === 0 ? 'Este año' : date.getFullYear().toString(),
            startDate: startOfYear(date),
            endDate: endOfYear(date)
          });
        }
        break;
    }
    return periods;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const GrowthIndicator = ({ value }: { value: number }) => {
    const isPositive = value > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    
    return (
      <div className={cn(
        "flex items-center gap-1 text-sm font-medium",
        isPositive ? "text-green-600" : "text-red-600"
      )}>
        <Icon className="h-3 w-3" />
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </div>
    );
  };

  const PeriodSlider = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={granularity} onValueChange={(value: any) => setGranularity(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Día</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="year">Año</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex border rounded-lg p-1">
            <Button
              variant={comparisonMode === 'auto' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setComparisonMode('auto')}
              className="text-xs"
            >
              Auto
            </Button>
            <Button
              variant={comparisonMode === 'custom' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setComparisonMode('custom')}
              className="text-xs"
            >
              Personalizado
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Período actual:</p>
          <div className="flex flex-wrap gap-2">
            {generateQuickPeriods(granularity).map((period, index) => (
              <Button
                key={index}
                variant={
                  currentPeriod.startDate.getTime() === period.startDate.getTime() 
                    ? "default" 
                    : "outline"
                }
                size="sm"
                onClick={() => setCurrentPeriod(period)}
                className="text-xs"
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        {comparisonMode === 'custom' && (
          <div>
            <p className="text-sm font-medium mb-2">Período de comparación:</p>
            <div className="flex flex-wrap gap-2">
              {generateQuickPeriods(granularity).map((period, index) => (
                <Button
                  key={index}
                  variant={
                    comparisonPeriod.startDate.getTime() === period.startDate.getTime() 
                      ? "default" 
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setComparisonPeriod(period)}
                  className="text-xs"
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparación de Períodos
          </CardTitle>
          <div className="flex flex-wrap gap-4 text-sm">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
              {currentPeriod.label}: {format(currentPeriod.startDate, 'dd MMM', { locale: es })} - {format(currentPeriod.endDate, 'dd MMM', { locale: es })}
            </Badge>
            <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-300">
              {comparisonPeriod.label}: {format(comparisonPeriod.startDate, 'dd MMM', { locale: es })} - {format(comparisonPeriod.endDate, 'dd MMM', { locale: es })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Reservas Totales</span>
                <GrowthIndicator value={calculateGrowth(mockData.currentBookings, mockData.previousBookings)} />
              </div>
              <div className="flex items-center justify-between text-2xl font-bold">
                <span className="text-blue-600">{mockData.currentBookings}</span>
                <span className="text-gray-500 text-lg">{mockData.previousBookings}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ingresos Totales</span>
                <GrowthIndicator value={calculateGrowth(mockData.currentRevenue, mockData.previousRevenue)} />
              </div>
              <div className="flex items-center justify-between text-2xl font-bold">
                <span className="text-green-600">{formatCurrency(mockData.currentRevenue)}</span>
                <span className="text-gray-500 text-lg">{formatCurrency(mockData.previousRevenue)}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ticket Medio</span>
                <GrowthIndicator value={calculateGrowth(mockData.currentTicket, mockData.previousTicket)} />
              </div>
              <div className="flex items-center justify-between text-2xl font-bold">
                <span className="text-purple-600">{formatCurrency(mockData.currentTicket)}</span>
                <span className="text-gray-500 text-lg">{formatCurrency(mockData.previousTicket)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Avanzados</h1>
          <p className="text-muted-foreground">
            Análisis detallado con comparación personalizable
          </p>
        </div>
      </div>

      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comparison">Comparación</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-6">
          <PeriodSlider />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolución Temporal</CardTitle>
              <CardDescription>
                Próximamente: gráficos de tendencias detallados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded flex items-center justify-center">
                <p className="text-muted-foreground">Gráficos en desarrollo...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}