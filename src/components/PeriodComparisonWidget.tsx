import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { 
  CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Euro, 
  Calendar, 
  CreditCard, 
  Gift,
  Ticket,
  Users,
  ArrowUpDown,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PeriodData {
  totalBookings: number;
  totalRevenue: number;
  averageTicket: number;
  packageUsage: number;
  giftCardUsage: number;
  giftCardRevenue: number;
  newClients: number;
  confirmedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  dailyData: Array<{
    date: string;
    bookings: number;
    revenue: number;
    packages: number;
    giftCards: number;
  }>;
}

type PeriodType = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'lastYear' | 'custom';

export const PeriodComparisonWidget = () => {
  const [period1, setPeriod1] = useState<PeriodType>('thisMonth');
  const [period2, setPeriod2] = useState<PeriodType>('lastMonth');
  const [customDate1Start, setCustomDate1Start] = useState<Date>();
  const [customDate1End, setCustomDate1End] = useState<Date>();
  const [customDate2Start, setCustomDate2Start] = useState<Date>();
  const [customDate2End, setCustomDate2End] = useState<Date>();
  const [period1Data, setPeriod1Data] = useState<PeriodData | null>(null);
  const [period2Data, setPeriod2Data] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'daily'>('summary');
  const { toast } = useToast();

  const getDateRange = (period: PeriodType, customStart?: Date, customEnd?: Date) => {
    const now = new Date();
    
    if (period === 'custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    
    switch (period) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return { start: today, end: todayEnd };
        
      case 'yesterday':
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { start: yesterday, end: yesterdayEnd };
        
      case 'thisWeek':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };
        
      case 'lastWeek':
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
        lastWeekStart.setHours(0, 0, 0, 0);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        return { start: lastWeekStart, end: lastWeekEnd };
        
      case 'thisMonth':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start: startOfMonth, end: endOfMonth };
        
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { start: lastMonthStart, end: lastMonthEnd };
        
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
        return { start: quarterStart, end: quarterEnd };
        
      case 'lastQuarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const lastQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastQuarterStart = new Date(lastQuarterYear, lastQuarter * 3, 1);
        const lastQuarterEnd = new Date(lastQuarterYear, lastQuarter * 3 + 3, 0, 23, 59, 59, 999);
        return { start: lastQuarterStart, end: lastQuarterEnd };
        
      case 'thisYear':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start: yearStart, end: yearEnd };
        
      case 'lastYear':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        return { start: lastYearStart, end: lastYearEnd };
        
      default:
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const defaultEnd = new Date(defaultStart);
        defaultEnd.setHours(23, 59, 59, 999);
        return { start: defaultStart, end: defaultEnd };
    }
  };

  const fetchPeriodData = async (startDate: Date, endDate: Date): Promise<PeriodData> => {
    try {
      console.log('Fetching data for period:', startDate.toISOString(), 'to', endDate.toISOString());

      // Fetch bookings data
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          client_id,
          total_price_cents,
          status,
          booking_datetime,
          created_at
        `)
        .gte('booking_datetime', startDate.toISOString())
        .lte('booking_datetime', endDate.toISOString());

      if (bookingsError) throw bookingsError;

      // Fetch package usage
      const { data: packageUsages, error: packageError } = await supabase
        .from('client_package_usages')
        .select('*')
        .gte('used_at', startDate.toISOString())
        .lte('used_at', endDate.toISOString());

      if (packageError) throw packageError;

      // Fetch gift card redemptions
      const { data: giftCardRedemptions, error: giftCardError } = await supabase
        .from('gift_card_redemptions')
        .select('amount_cents, redeemed_at')
        .gte('redeemed_at', startDate.toISOString())
        .lte('redeemed_at', endDate.toISOString());

      if (giftCardError) throw giftCardError;

      // Fetch gift card purchases
      const { data: giftCardPurchases, error: giftCardPurchaseError } = await supabase
        .from('gift_cards')
        .select('initial_balance_cents, purchased_at')
        .gte('purchased_at', startDate.toISOString())
        .lte('purchased_at', endDate.toISOString());

      if (giftCardPurchaseError) throw giftCardPurchaseError;

      // Calculate metrics
      const totalBookings = bookings?.length || 0;
      const totalRevenue = bookings?.reduce((sum, booking) => sum + (booking.total_price_cents / 100), 0) || 0;
      const averageTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;
      const packageUsage = packageUsages?.length || 0;
      const giftCardUsage = giftCardRedemptions?.length || 0;
      const giftCardRevenue = giftCardPurchases?.reduce((sum, card) => sum + (card.initial_balance_cents / 100), 0) || 0;

      const confirmedBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'completed').length || 0;
      const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
      const noShowBookings = bookings?.filter(b => b.status === 'no_show').length || 0;

      // Calculate new clients
      const uniqueClientIds = Array.from(new Set(bookings?.map(b => b.client_id) || []));
      let newClientCount = 0;
      for (const clientId of uniqueClientIds) {
        if (!clientId) continue;
        const { data: previousBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('client_id', clientId)
          .lt('booking_datetime', startDate.toISOString())
          .limit(1);
        if (!previousBookings || previousBookings.length === 0) {
          newClientCount++;
        }
      }

      // Generate daily data
      const dailyData = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const dayBookings = bookings?.filter(b => {
          const bookingDate = new Date(b.booking_datetime);
          return bookingDate >= dayStart && bookingDate <= dayEnd;
        }) || [];

        const dayPackages = packageUsages?.filter(p => {
          const usageDate = new Date(p.used_at);
          return usageDate >= dayStart && usageDate <= dayEnd;
        }) || [];

        const dayGiftCards = giftCardRedemptions?.filter(g => {
          const redeemDate = new Date(g.redeemed_at);
          return redeemDate >= dayStart && redeemDate <= dayEnd;
        }) || [];

        dailyData.push({
          date: currentDate.toISOString().split('T')[0],
          bookings: dayBookings.length,
          revenue: dayBookings.reduce((sum, b) => sum + (b.total_price_cents / 100), 0),
          packages: dayPackages.length,
          giftCards: dayGiftCards.length
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        totalBookings,
        totalRevenue,
        averageTicket,
        packageUsage,
        giftCardUsage,
        giftCardRevenue,
        newClients: newClientCount,
        confirmedBookings,
        cancelledBookings,
        noShowBookings,
        dailyData
      };
    } catch (error) {
      console.error('Error fetching period data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del período",
        variant: "destructive",
      });
      return {
        totalBookings: 0,
        totalRevenue: 0,
        averageTicket: 0,
        packageUsage: 0,
        giftCardUsage: 0,
        giftCardRevenue: 0,
        newClients: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        noShowBookings: 0,
        dailyData: []
      };
    }
  };

  const loadComparison = async () => {
    setLoading(true);
    try {
      const range1 = getDateRange(period1, customDate1Start, customDate1End);
      const range2 = getDateRange(period2, customDate2Start, customDate2End);

      const [data1, data2] = await Promise.all([
        fetchPeriodData(range1.start, range1.end),
        fetchPeriodData(range2.start, range2.end)
      ]);

      setPeriod1Data(data1);
      setPeriod2Data(data2);
    } catch (error) {
      console.error('Error loading comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, [period1, period2, customDate1Start, customDate1End, customDate2Start, customDate2End]);

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getPeriodLabel = (period: PeriodType) => {
    switch (period) {
      case 'today': return 'Hoy';
      case 'yesterday': return 'Ayer';
      case 'thisWeek': return 'Esta Semana';
      case 'lastWeek': return 'Semana Pasada';
      case 'thisMonth': return 'Este Mes';
      case 'lastMonth': return 'Mes Pasado';
      case 'thisQuarter': return 'Este Trimestre';
      case 'lastQuarter': return 'Trimestre Pasado';
      case 'thisYear': return 'Este Año';
      case 'lastYear': return 'Año Pasado';
      case 'custom': return 'Personalizado';
      default: return period;
    }
  };

  const combinedDailyData = period1Data && period2Data ? 
    period1Data.dailyData.map((day1, index) => {
      const day2 = period2Data.dailyData[index] || { date: day1.date, bookings: 0, revenue: 0, packages: 0, giftCards: 0 };
      return {
        date: day1.date.split('-')[2] + '/' + day1.date.split('-')[1],
        periodo1_reservas: day1.bookings,
        periodo1_ingresos: day1.revenue,
        periodo2_reservas: day2.bookings,
        periodo2_ingresos: day2.revenue,
      };
    }) : [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5" />
          Comparador de Períodos
          <Badge variant="secondary" className="ml-auto">
            {loading ? 'Cargando...' : 'Datos en Tiempo Real'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period Selection Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded"></div>
              <h3 className="font-medium">Período 1</h3>
            </div>
            <Select value={period1} onValueChange={(value: PeriodType) => setPeriod1(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="yesterday">Ayer</SelectItem>
                <SelectItem value="thisWeek">Esta Semana</SelectItem>
                <SelectItem value="lastWeek">Semana Pasada</SelectItem>
                <SelectItem value="thisMonth">Este Mes</SelectItem>
                <SelectItem value="lastMonth">Mes Pasado</SelectItem>
                <SelectItem value="thisQuarter">Este Trimestre</SelectItem>
                <SelectItem value="lastQuarter">Trimestre Pasado</SelectItem>
                <SelectItem value="thisYear">Este Año</SelectItem>
                <SelectItem value="lastYear">Año Pasado</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            
            {period1 === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate1Start ? format(customDate1Start, "dd/MM/yyyy", { locale: es }) : "Inicio"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={customDate1Start}
                      onSelect={setCustomDate1Start}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate1End ? format(customDate1End, "dd/MM/yyyy", { locale: es }) : "Fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={customDate1End}
                      onSelect={setCustomDate1End}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-secondary rounded"></div>
              <h3 className="font-medium">Período 2</h3>
            </div>
            <Select value={period2} onValueChange={(value: PeriodType) => setPeriod2(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="yesterday">Ayer</SelectItem>
                <SelectItem value="thisWeek">Esta Semana</SelectItem>
                <SelectItem value="lastWeek">Semana Pasada</SelectItem>
                <SelectItem value="thisMonth">Este Mes</SelectItem>
                <SelectItem value="lastMonth">Mes Pasado</SelectItem>
                <SelectItem value="thisQuarter">Este Trimestre</SelectItem>
                <SelectItem value="lastQuarter">Trimestre Pasado</SelectItem>
                <SelectItem value="thisYear">Este Año</SelectItem>
                <SelectItem value="lastYear">Año Pasado</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            
            {period2 === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate2Start ? format(customDate2Start, "dd/MM/yyyy", { locale: es }) : "Inicio"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={customDate2Start}
                      onSelect={setCustomDate2Start}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate2End ? format(customDate2End, "dd/MM/yyyy", { locale: es }) : "Fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={customDate2End}
                      onSelect={setCustomDate2End}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'summary' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('summary')}
            >
              Resumen
            </Button>
            <Button
              variant={viewMode === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('daily')}
            >
              Evolución Diaria
            </Button>
          </div>
          <Button onClick={loadComparison} disabled={loading} size="sm">
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>

        {/* Comparison Results */}
        {period1Data && period2Data && (
          <>
            {viewMode === 'summary' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Reservas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">{getPeriodLabel(period1)}</span>
                      <span className="font-bold">{period1Data.totalBookings}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">{getPeriodLabel(period2)}</span>
                      <span className="font-bold">{period2Data.totalBookings}</span>
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      {getGrowthPercentage(period1Data.totalBookings, period2Data.totalBookings) >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className="text-xs font-medium">
                        {getGrowthPercentage(period1Data.totalBookings, period2Data.totalBookings).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <Euro className="h-4 w-4" />
                      Ingresos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">{getPeriodLabel(period1)}</span>
                      <span className="font-bold">€{period1Data.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">{getPeriodLabel(period2)}</span>
                      <span className="font-bold">€{period2Data.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      {getGrowthPercentage(period1Data.totalRevenue, period2Data.totalRevenue) >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className="text-xs font-medium">
                        {getGrowthPercentage(period1Data.totalRevenue, period2Data.totalRevenue).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <Ticket className="h-4 w-4" />
                      Bonos Usados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">{getPeriodLabel(period1)}</span>
                      <span className="font-bold">{period1Data.packageUsage}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">{getPeriodLabel(period2)}</span>
                      <span className="font-bold">{period2Data.packageUsage}</span>
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      {getGrowthPercentage(period1Data.packageUsage, period2Data.packageUsage) >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className="text-xs font-medium">
                        {getGrowthPercentage(period1Data.packageUsage, period2Data.packageUsage).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <Gift className="h-4 w-4" />
                      Tarjetas Regalo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary">{getPeriodLabel(period1)}</span>
                      <span className="font-bold">€{period1Data.giftCardRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">{getPeriodLabel(period2)}</span>
                      <span className="font-bold">€{period2Data.giftCardRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      {getGrowthPercentage(period1Data.giftCardRevenue, period2Data.giftCardRevenue) >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className="text-xs font-medium">
                        {getGrowthPercentage(period1Data.giftCardRevenue, period2Data.giftCardRevenue).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {viewMode === 'daily' && combinedDailyData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Evolución Diaria Comparativa</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={combinedDailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="periodo1_reservas"
                        stackId="1"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                        name={`${getPeriodLabel(period1)} - Reservas`}
                      />
                      <Area
                        type="monotone"
                        dataKey="periodo2_reservas"
                        stackId="2"
                        stroke="hsl(var(--secondary))"
                        fill="hsl(var(--secondary))"
                        fillOpacity={0.3}
                        name={`${getPeriodLabel(period2)} - Reservas`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};