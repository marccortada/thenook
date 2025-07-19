import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  FileText, 
  Target, 
  Calendar as CalendarIcon,
  Play,
  Eye,
  Settings,
  Plus,
  PieChart,
  LineChart,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import { useToast } from '@/hooks/use-toast';

const AdvancedReports = () => {
  const {
    templates,
    reports,
    kpiTargets,
    loading,
    generateReport,
    getBusinessIntelligence,
    createKpiTarget,
    exportReport
  } = useAdvancedReports();

  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showKpiDialog, setShowKpiDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [businessData, setBusinessData] = useState<any>(null);
  
  // Report generation parameters
  const [reportParams, setReportParams] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    centerId: ''
  });

  // KPI form
  const [kpiForm, setKpiForm] = useState({
    metric_name: '',
    target_value: 0,
    target_type: 'monthly' as const,
    period_start: new Date(),
    period_end: new Date(),
    center_id: ''
  });

  useEffect(() => {
    loadBusinessIntelligence();
  }, []);

  const loadBusinessIntelligence = async () => {
    try {
      const data = await getBusinessIntelligence(
        reportParams.startDate.toISOString().split('T')[0],
        reportParams.endDate.toISOString().split('T')[0]
      );
      setBusinessData(data);
    } catch (error) {
      console.error('Error loading business intelligence:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;
    
    try {
      const params = {
        startDate: reportParams.startDate.toISOString().split('T')[0],
        endDate: reportParams.endDate.toISOString().split('T')[0],
        centerId: reportParams.centerId || null
      };
      
      await generateReport(selectedTemplate.id, params);
      setShowReportDialog(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const handleCreateKpi = async () => {
    try {
      await createKpiTarget({
        metric_name: kpiForm.metric_name,
        target_value: kpiForm.target_value,
        target_type: kpiForm.target_type,
        period_start: kpiForm.period_start.toISOString().split('T')[0],
        period_end: kpiForm.period_end.toISOString().split('T')[0],
        center_id: kpiForm.center_id || undefined
      });
      setShowKpiDialog(false);
      resetKpiForm();
    } catch (error) {
      console.error('Error creating KPI:', error);
    }
  };

  const resetKpiForm = () => {
    setKpiForm({
      metric_name: '',
      target_value: 0,
      target_type: 'monthly',
      period_start: new Date(),
      period_end: new Date(),
      center_id: ''
    });
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'financial': return <TrendingUp className="h-4 w-4" />;
      case 'operational': return <Activity className="h-4 w-4" />;
      case 'marketing': return <BarChart3 className="h-4 w-4" />;
      case 'inventory': return <Activity className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'financial': return 'bg-green-100 text-green-800';
      case 'operational': return 'bg-blue-100 text-blue-800';
      case 'marketing': return 'bg-purple-100 text-purple-800';
      case 'inventory': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes y Analíticas</h1>
          <p className="text-muted-foreground">
            Inteligencia de negocio avanzada y reportes personalizados
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showKpiDialog} onOpenChange={setShowKpiDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetKpiForm()}>
                <Target className="h-4 w-4 mr-2" />
                Nuevo KPI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Objetivo KPI</DialogTitle>
                <DialogDescription>
                  Define un nuevo objetivo de rendimiento
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="metric_name">Nombre de la Métrica</Label>
                  <Input
                    id="metric_name"
                    value={kpiForm.metric_name}
                    onChange={(e) => setKpiForm(prev => ({ ...prev, metric_name: e.target.value }))}
                    placeholder="Ej: Ingresos mensuales"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="target_value">Valor Objetivo</Label>
                    <Input
                      id="target_value"
                      type="number"
                      value={kpiForm.target_value}
                      onChange={(e) => setKpiForm(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="target_type">Tipo de Período</Label>
                    <Select value={kpiForm.target_type} onValueChange={(value: any) => setKpiForm(prev => ({ ...prev, target_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diario</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Fecha Inicio</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !kpiForm.period_start && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {kpiForm.period_start ? format(kpiForm.period_start, "PPP", { locale: es }) : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={kpiForm.period_start}
                          onSelect={(date) => date && setKpiForm(prev => ({ ...prev, period_start: date }))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Fecha Fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !kpiForm.period_end && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {kpiForm.period_end ? format(kpiForm.period_end, "PPP", { locale: es }) : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={kpiForm.period_end}
                          onSelect={(date) => date && setKpiForm(prev => ({ ...prev, period_end: date }))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowKpiDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateKpi}>
                  Crear KPI
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generar Reporte
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Generar Nuevo Reporte</DialogTitle>
                <DialogDescription>
                  Selecciona una plantilla y configura los parámetros
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Plantilla de Reporte</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={cn(
                          "p-3 border rounded-lg cursor-pointer hover:bg-gray-50",
                          selectedTemplate?.id === template.id && "border-primary bg-primary/10"
                        )}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getReportTypeIcon(template.report_type)}
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-sm text-muted-foreground">{template.description}</div>
                            </div>
                          </div>
                          <Badge className={getReportTypeColor(template.report_type)}>
                            {template.report_type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Fecha Inicio</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(reportParams.startDate, "PPP", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={reportParams.startDate}
                          onSelect={(date) => date && setReportParams(prev => ({ ...prev, startDate: date }))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Fecha Fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(reportParams.endDate, "PPP", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={reportParams.endDate}
                          onSelect={(date) => date && setReportParams(prev => ({ ...prev, endDate: date }))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleGenerateReport} disabled={!selectedTemplate || loading}>
                  {loading ? 'Generando...' : 'Generar Reporte'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Business Intelligence Dashboard */}
      {businessData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{businessData.revenue?.total?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {businessData.revenue?.total_bookings || 0} reservas
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{businessData.revenue?.average_ticket?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Por transacción
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nuevos Clientes</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {businessData.operations?.new_clients || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                En el período
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Ocupación</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {businessData.operations?.occupancy_rate?.toFixed(1) || '0.0'}%
              </div>
              <p className="text-xs text-muted-foreground">
                Capacidad utilizada
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="reports">Reportes Generados</TabsTrigger>
          <TabsTrigger value="kpis">Objetivos KPI</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos por Servicio</CardTitle>
                <CardDescription>
                  Distribución de ingresos por tipo de servicio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {businessData?.revenue?.by_service ? (
                  <div className="space-y-2">
                    {Object.entries(businessData.revenue.by_service).map(([service, amount]: [string, any]) => (
                      <div key={service} className="flex justify-between items-center">
                        <span className="text-sm">{service}</span>
                        <span className="font-medium">€{amount?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay datos disponibles
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métricas Operacionales</CardTitle>
                <CardDescription>
                  Indicadores clave de operación
                </CardDescription>
              </CardHeader>
              <CardContent>
                {businessData?.operations ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Clientes</span>
                      <span className="font-medium">{businessData.operations.total_clients}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Clientes Recurrentes</span>
                      <span className="font-medium">{businessData.operations.returning_clients}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tasa No Show</span>
                      <span className="font-medium">{businessData.operations.no_show_rate?.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Duración Promedio</span>
                      <span className="font-medium">{businessData.operations.avg_session_duration?.toFixed(0)} min</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay datos disponibles
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getReportTypeIcon(template.report_type)}
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <Badge className={getReportTypeColor(template.report_type)}>
                      {template.report_type}
                    </Badge>
                  </div>
                  <CardDescription>
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowReportDialog(true);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Generar Reporte
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reportes Generados</CardTitle>
              <CardDescription>
                Historial de reportes generados y disponibles para descarga
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Generado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.format.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status === 'completed' ? 'Completado' : 
                           report.status === 'generating' ? 'Generando' : 'Fallido'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(report.generated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {report.status === 'completed' && (
                            <>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => exportReport(report.id, 'json')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Objetivos KPI</CardTitle>
              <CardDescription>
                Seguimiento de objetivos y metas de rendimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Métrica</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiTargets.map((kpi) => (
                    <TableRow key={kpi.id}>
                      <TableCell className="font-medium">{kpi.metric_name}</TableCell>
                      <TableCell>{kpi.target_value.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{kpi.target_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(kpi.period_start).toLocaleDateString()} - {new Date(kpi.period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Activo</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReports;