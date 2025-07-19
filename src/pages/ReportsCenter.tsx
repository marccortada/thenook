import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  Calendar,
  Users,
  BarChart3,
  TrendingUp,
  Filter,
  Eye,
  Plus,
  Clock,
  DollarSign,
  ArrowLeft
} from "lucide-react";
import { useReports, ReportData, ReportFilter } from "@/hooks/useReports";
import { useCenters, useServices, useEmployees } from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportData['type'];
  icon: any;
  defaultFilters: ReportFilter;
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'daily-bookings',
    name: 'Reservas Diarias',
    description: 'Todas las reservas del día actual con detalles completos',
    type: 'bookings',
    icon: Calendar,
    defaultFilters: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  },
  {
    id: 'weekly-revenue',
    name: 'Ingresos Semanales',
    description: 'Análisis de ingresos de los últimos 7 días',
    type: 'revenue',
    icon: TrendingUp,
    defaultFilters: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  },
  {
    id: 'client-analysis',
    name: 'Análisis de Clientes',
    description: 'Reporte completo de todos los clientes y su actividad',
    type: 'clients',
    icon: Users,
    defaultFilters: {},
  },
  {
    id: 'service-performance',
    name: 'Rendimiento de Servicios',
    description: 'Estadísticas de popularidad y rentabilidad por servicio',
    type: 'services',
    icon: BarChart3,
    defaultFilters: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  },
];

const ReportsCenter = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customFilters, setCustomFilters] = useState<ReportFilter>({});
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [generatedReports, setGeneratedReports] = useState<ReportData[]>([]);
  const [viewingReport, setViewingReport] = useState<ReportData | null>(null);

  const { generateReport, exportToCSV, loading } = useReports();
  const { centers } = useCenters();
  const { services } = useServices();
  const { employees } = useEmployees();

  // Precargar template seleccionado
  useEffect(() => {
    if (selectedTemplate) {
      setReportName(selectedTemplate.name);
      setReportDescription(selectedTemplate.description);
      setCustomFilters(selectedTemplate.defaultFilters);
    }
  }, [selectedTemplate]);

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;

    try {
      const report = await generateReport(
        selectedTemplate.type,
        customFilters,
        reportName,
        reportDescription
      );
      setGeneratedReports(prev => [report, ...prev]);
      setViewingReport(report);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const getReportStats = (report: ReportData) => {
    const data = report.data;
    if (!data || data.length === 0) return null;

    switch (report.type) {
      case 'bookings':
        return {
          total: data.length,
          confirmed: data.filter(r => r.estado === 'confirmed').length,
          revenue: data.reduce((sum, r) => sum + (r.precio_euros || 0), 0),
        };
      case 'revenue':
        return {
          total: data.reduce((sum, r) => sum + (r.ingresos_total || 0), 0),
          days: data.length,
          average: data.length > 0 ? data.reduce((sum, r) => sum + (r.ingresos_total || 0), 0) / data.length : 0,
        };
      case 'clients':
        return {
          total: data.length,
          active: data.filter(r => r.dias_desde_ultima_reserva !== null && r.dias_desde_ultima_reserva < 30).length,
          totalSpent: data.reduce((sum, r) => sum + (r.gasto_total_euros || 0), 0),
        };
      case 'services':
        return {
          total: data.length,
          mostPopular: data.length > 0 ? data[0].servicio : 'N/A',
          totalBookings: data.reduce((sum, r) => sum + (r.total_reservas || 0), 0),
        };
      default:
        return null;
    }
  };

  const renderReportPreview = (report: ReportData) => {
    const maxRows = 10;
    const data = report.data.slice(0, maxRows);
    
    if (data.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No hay datos para mostrar</div>;
    }

    const headers = Object.keys(data[0]);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">Vista Previa - Primeras {Math.min(maxRows, report.data.length)} filas</h4>
          <Badge variant="outline">{report.data.length} registros totales</Badge>
        </div>
        
        <ScrollArea className="h-96 w-full rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header} className="whitespace-nowrap">
                    {header.replace(/_/g, ' ').toUpperCase()}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  {headers.map((header) => (
                    <TableCell key={header} className="whitespace-nowrap">
                      {typeof row[header] === 'number' && header.includes('euros') 
                        ? `€${row[header].toFixed(2)}`
                        : row[header]?.toString() || '-'
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header con navegación */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al Inicio</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Centro de Reportes</h1>
              <p className="text-muted-foreground">
                Genera reportes detallados y analiza el rendimiento de tu negocio
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
            <TabsTrigger value="custom">Personalizado</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            {/* Templates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card 
                    key={template.id} 
                    className={cn(
                      "cursor-pointer hover-scale transition-all",
                      selectedTemplate?.id === template.id && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Icon className="h-5 w-5" />
                        <span>{template.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {template.description}
                      </p>
                      <Badge variant="outline">{template.type}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Configuration */}
            {selectedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle>Configurar Reporte: {selectedTemplate.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="report-name">Nombre del Reporte</Label>
                      <Input
                        id="report-name"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        placeholder="Nombre personalizado..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Fecha Inicio</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={customFilters.startDate || ''}
                        onChange={(e) => setCustomFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end-date">Fecha Fin</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={customFilters.endDate || ''}
                        onChange={(e) => setCustomFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="center">Centro</Label>
                       <Select 
                        value={customFilters.centerId || 'all'} 
                        onValueChange={(value) => setCustomFilters(prev => ({ ...prev, centerId: value === 'all' ? undefined : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los centros" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los centros</SelectItem>
                          {centers.map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              {center.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Descripción del reporte..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleGenerateReport} 
                    disabled={loading || !reportName}
                    className="w-full"
                  >
                    {loading ? 'Generando...' : 'Generar Reporte'}
                    <FileText className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="custom">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Reportes Personalizados</h3>
                  <p className="text-muted-foreground mb-4">
                    Próximamente: Constructor de reportes con campos personalizables
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Funcionalidad solicitada",
                        description: "Hemos registrado tu interés en reportes personalizados. Te notificaremos cuando esté disponible.",
                      });
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Solicitar Funcionalidad
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {generatedReports.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Sin Reportes Generados</h3>
                    <p className="text-muted-foreground">
                      Los reportes que generes aparecerán aquí
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {generatedReports.map((report) => {
                  const stats = getReportStats(report);
                  return (
                    <Card key={report.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center space-x-2">
                              <FileText className="h-5 w-5" />
                              <span>{report.name}</span>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {report.description}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingReport(report)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => exportToCSV(report)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              CSV
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-4">
                            <span className="text-muted-foreground">
                              Generado: {new Date(report.generatedAt).toLocaleString('es-ES')}
                            </span>
                            <Badge variant="outline">{report.type}</Badge>
                            <Badge>{report.data.length} registros</Badge>
                          </div>
                          
                          {stats && (
                            <div className="flex items-center space-x-4 text-sm">
                              {report.type === 'revenue' && (
                                <span className="text-green-600 font-medium">
                                  €{stats.total.toFixed(2)}
                                </span>
                              )}
                              {report.type === 'bookings' && (
                                <span className="text-blue-600 font-medium">
                                  {stats.confirmed}/{stats.total} confirmadas
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Report Viewer */}
        {viewingReport && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{viewingReport.name}</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => exportToCSV(viewingReport)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {renderReportPreview(viewingReport)}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ReportsCenter;