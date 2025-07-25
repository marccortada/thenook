import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, LineChart, PieChart, FileText, Download, Plus, Calendar, Filter } from 'lucide-react';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';

const AdvancedReports = () => {
  const {
    reports,
    templates,
    loading,
    generateReport,
    createTemplate,
    executeCustomQuery,
    exportReport
  } = useAdvancedReports();

  const [activeTab, setActiveTab] = useState('reports');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const [reportForm, setReportForm] = useState({
    type: 'bookings',
    name: '',
    description: '',
    dateRange: {
      start: '',
      end: ''
    },
    filters: {
      centerId: 'all',
      serviceId: 'all',
      status: 'all',
      employeeId: 'all'
    }
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    report_type: 'custom',
    query_definition: '',
    parameters: {}
  });

  const [customQuery, setCustomQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any[]>([]);

  const reportTypes = [
    { value: 'bookings', label: 'Reservas' },
    { value: 'revenue', label: 'Ingresos' },
    { value: 'clients', label: 'Clientes' },
    { value: 'services', label: 'Servicios' },
    { value: 'employees', label: 'Empleados' }
  ];

  const handleGenerateReport = async () => {
    const filters = {
      startDate: reportForm.dateRange.start,
      endDate: reportForm.dateRange.end,
      ...Object.fromEntries(
        Object.entries(reportForm.filters).filter(([key, value]) => 
          value && value !== 'all'
        )
      )
    };

    await generateReport(
      reportForm.type as any,
      filters,
      reportForm.name,
      reportForm.description
    );

    setShowReportDialog(false);
    resetReportForm();
  };

  const handleCreateTemplate = async () => {
    await createTemplate(templateForm);
    setShowTemplateDialog(false);
    resetTemplateForm();
  };

  const handleExecuteCustomQuery = async () => {
    try {
      const results = await executeCustomQuery({ query: customQuery });
      setQueryResults(results);
    } catch (error) {
      console.error('Error executing query:', error);
    }
  };

  const resetReportForm = () => {
    setReportForm({
      type: 'bookings',
      name: '',
      description: '',
      dateRange: { start: '', end: '' },
      filters: { centerId: 'all', serviceId: 'all', status: 'all', employeeId: 'all' }
    });
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      report_type: 'custom',
      query_definition: '',
      parameters: {}
    });
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'bookings': return <Calendar className="w-4 h-4" />;
      case 'revenue': return <BarChart className="w-4 h-4" />;
      case 'clients': return <PieChart className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary">Reportes Avanzados</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Generar Reporte
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generar Nuevo Reporte</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reportType">Tipo de Reporte</Label>
                    <Select 
                      value={reportForm.type} 
                      onValueChange={(value) => setReportForm({ ...reportForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="reportName">Nombre del Reporte</Label>
                    <Input
                      id="reportName"
                      value={reportForm.name}
                      onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })}
                      placeholder="Ej: Reporte mensual de reservas"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    placeholder="Descripción del reporte..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Fecha Inicio</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={reportForm.dateRange.start}
                      onChange={(e) => setReportForm({ 
                        ...reportForm, 
                        dateRange: { ...reportForm.dateRange, start: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Fecha Fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={reportForm.dateRange.end}
                      onChange={(e) => setReportForm({ 
                        ...reportForm, 
                        dateRange: { ...reportForm.dateRange, end: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Estado</Label>
                    <Select 
                      value={reportForm.filters.status} 
                      onValueChange={(value) => setReportForm({ 
                        ...reportForm, 
                        filters: { ...reportForm.filters, status: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="completed">Completado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                        <SelectItem value="no_show">No show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleGenerateReport} className="w-full" disabled={loading}>
                  {loading ? 'Generando...' : 'Generar Reporte'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <FileText className="w-4 h-4 mr-2" />
                Nueva Plantilla
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Plantilla de Reporte</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="templateName">Nombre de la Plantilla</Label>
                    <Input
                      id="templateName"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="templateType">Tipo</Label>
                    <Select 
                      value={templateForm.report_type} 
                      onValueChange={(value) => setTemplateForm({ ...templateForm, report_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Personalizado</SelectItem>
                        <SelectItem value="standard">Estándar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="templateDescription">Descripción</Label>
                  <Textarea
                    id="templateDescription"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="queryDefinition">Definición de Consulta (JSON)</Label>
                  <Textarea
                    id="queryDefinition"
                    value={templateForm.query_definition}
                    onChange={(e) => setTemplateForm({ ...templateForm, query_definition: e.target.value })}
                    placeholder='{"tables": ["bookings"], "fields": ["*"], "filters": {}}'
                    rows={6}
                  />
                </div>

                <Button onClick={handleCreateTemplate} className="w-full" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Plantilla'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reports">Reportes</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="custom">Consulta SQL</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reportes Generados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                      {getReportTypeIcon(report.type)}
                      <div>
                        <h3 className="font-medium">{report.name}</h3>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{report.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(report.generatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedReport(report)}
                        className="flex-1 sm:flex-none"
                      >
                        Ver Detalles
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => exportReport(report)}
                        className="flex-1 sm:flex-none"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Exportar
                      </Button>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay reportes generados. Crea tu primer reporte usando el botón "Generar Reporte".
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas de Reportes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <Badge variant="outline" className="mt-1">{template.report_type}</Badge>
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                        Usar Plantilla
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay plantillas creadas. Crea tu primera plantilla usando el botón "Nueva Plantilla".
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Consulta SQL Personalizada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customQuery">Consulta SQL</Label>
                <Textarea
                  id="customQuery"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="SELECT * FROM bookings WHERE booking_datetime >= '2024-01-01'"
                  rows={6}
                  className="font-mono"
                />
              </div>
              
              <Button onClick={handleExecuteCustomQuery} disabled={loading || !customQuery.trim()}>
                {loading ? 'Ejecutando...' : 'Ejecutar Consulta'}
              </Button>

              {queryResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Resultados ({queryResults.length} filas)</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(queryResults[0] || {}).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryResults.slice(0, 100).map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value: any, cellIndex) => (
                              <TableCell key={cellIndex}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {queryResults.length > 100 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Mostrando primeras 100 filas de {queryResults.length} total
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tendencias de Reservas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart className="w-12 h-12 mx-auto mb-2" />
                    <p>Gráfico de tendencias</p>
                    <p className="text-sm">(Se mostraría aquí con datos reales)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Servicios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 mx-auto mb-2" />
                    <p>Gráfico circular</p>
                    <p className="text-sm">(Se mostraría aquí con datos reales)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ingresos Mensuales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <LineChart className="w-12 h-12 mx-auto mb-2" />
                    <p>Gráfico de líneas</p>
                    <p className="text-sm">(Se mostraría aquí con datos reales)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métricas Clave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tasa de ocupación</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Ticket promedio</span>
                    <span className="font-medium">$45.50</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Clientes recurrentes</span>
                    <span className="font-medium">67%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tasa de no-show</span>
                    <span className="font-medium">12%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Report Details Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedReport.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedReport.description}</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Tipo:</span>
                  <p>{selectedReport.type}</p>
                </div>
                <div>
                  <span className="font-medium">Generado:</span>
                  <p>{formatDate(selectedReport.generatedAt)}</p>
                </div>
                <div>
                  <span className="font-medium">Registros:</span>
                  <p>{selectedReport.data?.length || 0}</p>
                </div>
                <div>
                  <span className="font-medium">Filtros:</span>
                  <p>{Object.keys(selectedReport.filters || {}).length}</p>
                </div>
              </div>

              {selectedReport.data && selectedReport.data.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(selectedReport.data[0]).map((key) => (
                          <TableHead key={key}>{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReport.data.slice(0, 10).map((row: any, index: number) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value: any, cellIndex) => (
                            <TableCell key={cellIndex}>
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {selectedReport.data.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Mostrando primeras 10 filas de {selectedReport.data.length} total
                    </p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdvancedReports;