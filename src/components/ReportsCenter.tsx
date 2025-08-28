import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Calendar, Filter, BarChart3, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Report {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  status: 'completed' | 'generating' | 'error';
  fileUrl?: string;
}

const ReportsCenter = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    reportType: 'all',
    center: 'all'
  });

  // Datos de ejemplo para los reportes
  useEffect(() => {
    setReports([
      {
        id: '1',
        name: 'Reporte de Ventas - Enero 2024',
        type: 'ventas',
        generatedAt: '2024-01-31T10:30:00Z',
        status: 'completed',
        fileUrl: '#'
      },
      {
        id: '2',
        name: 'Análisis de Clientes - Enero 2024',
        type: 'clientes',
        generatedAt: '2024-01-31T09:15:00Z',
        status: 'completed',
        fileUrl: '#'
      },
      {
        id: '3',
        name: 'Reporte de Servicios - Febrero 2024',
        type: 'servicios',
        generatedAt: '2024-02-01T14:20:00Z',
        status: 'generating'
      }
    ]);
  }, []);

  const handleGenerateReport = () => {
    setLoading(true);
    
    // Simulación de generación de reporte
    setTimeout(() => {
      const newReport: Report = {
        id: Date.now().toString(),
        name: `Reporte Custom - ${new Date().toLocaleDateString()}`,
        type: filters.reportType,
        generatedAt: new Date().toISOString(),
        status: 'completed',
        fileUrl: '#'
      };
      
      setReports(prev => [newReport, ...prev]);
      setLoading(false);
      toast.success('Reporte generado exitosamente');
    }, 2000);
  };

  const handleDownload = (report: Report) => {
    toast.success(`Descargando: ${report.name}`);
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'generating': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: Report['status']) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'generating': return 'Generando...';
      case 'error': return 'Error';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generar Reporte</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Generar Nuevo Reporte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">Fecha desde</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">Fecha hasta</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Reporte</Label>
                  <Select value={filters.reportType} onValueChange={(value) => setFilters(prev => ({ ...prev, reportType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ventas">Ventas</SelectItem>
                      <SelectItem value="clientes">Clientes</SelectItem>
                      <SelectItem value="servicios">Servicios</SelectItem>
                      <SelectItem value="empleados">Empleados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Centro</Label>
                  <Select value={filters.center} onValueChange={(value) => setFilters(prev => ({ ...prev, center: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona centro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los centros</SelectItem>
                      <SelectItem value="madrid-centro">Madrid Centro</SelectItem>
                      <SelectItem value="madrid-norte">Madrid Norte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleGenerateReport} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Generando...' : 'Generar Reporte'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Historial de Reportes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay reportes generados aún</p>
                  <p className="text-sm">Genera tu primer reporte en la pestaña anterior</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{report.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Tipo: {report.type}</span>
                          <span>Generado: {new Date(report.generatedAt).toLocaleDateString()}</span>
                          <span className={getStatusColor(report.status)}>
                            {getStatusText(report.status)}
                          </span>
                        </div>
                      </div>
                      {report.status === 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => handleDownload(report)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Descargar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsCenter;