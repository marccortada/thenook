import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Database, 
  Filter, 
  Play, 
  Save, 
  Settings2, 
  Table, 
  Users, 
  DollarSign,
  Clock,
  MapPin,
  FileText,
  Download
} from 'lucide-react';
import { useCenters, useServices, useEmployees } from '@/hooks/useDatabase';
import { useToast } from '@/hooks/use-toast';

interface CustomField {
  id: string;
  name: string;
  table: string;
  displayName: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  category: string;
}

interface CustomFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in';
  value: any;
  label: string;
}

interface CustomReportConfig {
  name: string;
  description: string;
  selectedFields: string[];
  filters: CustomFilter[];
  groupBy?: string;
  orderBy?: string;
  orderDirection: 'asc' | 'desc';
}

interface CustomReportBuilderProps {
  onGenerate: (config: CustomReportConfig) => Promise<void>;
  loading: boolean;
}

const CustomReportBuilder: React.FC<CustomReportBuilderProps> = ({ onGenerate, loading }) => {
  const { toast } = useToast();
  const { centers } = useCenters();
  const { services } = useServices(); 
  const { employees } = useEmployees();

  const [config, setConfig] = useState<CustomReportConfig>({
    name: '',
    description: '',
    selectedFields: [],
    filters: [],
    orderDirection: 'desc'
  });

  const [activeTab, setActiveTab] = useState('fields');

  // Campos disponibles organizados por categorías
  const availableFields: CustomField[] = [
    // Reservas
    { id: 'booking_datetime', name: 'booking_datetime', table: 'bookings', displayName: 'Fecha y Hora', type: 'date', category: 'Reservas' },
    { id: 'booking_status', name: 'status', table: 'bookings', displayName: 'Estado', type: 'select', category: 'Reservas' },
    { id: 'booking_duration', name: 'duration_minutes', table: 'bookings', displayName: 'Duración (min)', type: 'number', category: 'Reservas' },
    { id: 'booking_price', name: 'total_price_cents', table: 'bookings', displayName: 'Precio Total', type: 'number', category: 'Reservas' },
    { id: 'booking_payment_status', name: 'payment_status', table: 'bookings', displayName: 'Estado de Pago', type: 'select', category: 'Reservas' },
    { id: 'booking_channel', name: 'channel', table: 'bookings', displayName: 'Canal de Reserva', type: 'select', category: 'Reservas' },
    { id: 'booking_notes', name: 'notes', table: 'bookings', displayName: 'Notas', type: 'text', category: 'Reservas' },

    // Clientes
    { id: 'client_name', name: 'first_name,last_name', table: 'profiles', displayName: 'Nombre del Cliente', type: 'text', category: 'Clientes' },
    { id: 'client_email', name: 'email', table: 'profiles', displayName: 'Email del Cliente', type: 'text', category: 'Clientes' },
    { id: 'client_phone', name: 'phone', table: 'profiles', displayName: 'Teléfono del Cliente', type: 'text', category: 'Clientes' },
    { id: 'client_role', name: 'role', table: 'profiles', displayName: 'Tipo de Cliente', type: 'select', category: 'Clientes' },

    // Servicios
    { id: 'service_name', name: 'name', table: 'services', displayName: 'Nombre del Servicio', type: 'text', category: 'Servicios' },
    { id: 'service_type', name: 'type', table: 'services', displayName: 'Tipo de Servicio', type: 'select', category: 'Servicios' },
    { id: 'service_price', name: 'price_cents', table: 'services', displayName: 'Precio del Servicio', type: 'number', category: 'Servicios' },
    { id: 'service_duration', name: 'duration_minutes', table: 'services', displayName: 'Duración del Servicio', type: 'number', category: 'Servicios' },

    // Centros
    { id: 'center_name', name: 'name', table: 'centers', displayName: 'Nombre del Centro', type: 'text', category: 'Centros' },
    { id: 'center_address', name: 'address', table: 'centers', displayName: 'Dirección del Centro', type: 'text', category: 'Centros' },

    // Empleados
    { id: 'employee_name', name: 'first_name,last_name', table: 'employees', displayName: 'Nombre del Empleado', type: 'text', category: 'Empleados' },
  ];

  const fieldCategories = [...new Set(availableFields.map(f => f.category))];

  const getFieldIcon = (category: string) => {
    switch (category) {
      case 'Reservas': return <Calendar className="h-4 w-4" />;
      case 'Clientes': return <Users className="h-4 w-4" />;
      case 'Servicios': return <Settings2 className="h-4 w-4" />;
      case 'Centros': return <MapPin className="h-4 w-4" />;
      case 'Empleados': return <Users className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const toggleField = (fieldId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedFields: prev.selectedFields.includes(fieldId)
        ? prev.selectedFields.filter(f => f !== fieldId)
        : [...prev.selectedFields, fieldId]
    }));
  };

  const addFilter = () => {
    const newFilter: CustomFilter = {
      field: '',
      operator: 'equals',
      value: '',
      label: ''
    };
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  };

  const updateFilter = (index: number, updates: Partial<CustomFilter>) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { ...filter, ...updates } : filter
      )
    }));
  };

  const removeFilter = (index: number) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  };

  const handleGenerate = async () => {
    if (config.selectedFields.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un campo para el reporte",
        variant: "destructive",
      });
      return;
    }

    if (!config.name.trim()) {
      toast({
        title: "Error", 
        description: "Ingresa un nombre para el reporte",
        variant: "destructive",
      });
      return;
    }

    await onGenerate(config);
  };

  const getFilterOperatorOptions = (fieldType: string) => {
    const baseOperators = [
      { value: 'equals', label: 'Igual a' },
      { value: 'contains', label: 'Contiene' }
    ];

    if (fieldType === 'number' || fieldType === 'date') {
      baseOperators.push(
        { value: 'greater', label: 'Mayor que' },
        { value: 'less', label: 'Menor que' },
        { value: 'between', label: 'Entre' }
      );
    }

    if (fieldType === 'select') {
      baseOperators.push({ value: 'in', label: 'En lista' });
    }

    return baseOperators;
  };

  const renderFilterValue = (filter: CustomFilter, index: number) => {
    const field = availableFields.find(f => f.id === filter.field);
    if (!field) return null;

    switch (field.type) {
      case 'date':
        return (
          <Input
            type="date"
            value={filter.value || ''}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={filter.value || ''}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            placeholder="Valor numérico"
          />
        );
      case 'select':
        if (field.id === 'center_name') {
          return (
            <Select value={filter.value || ''} onValueChange={(value) => updateFilter(index, { value })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar centro" />
              </SelectTrigger>
              <SelectContent>
                {centers.map(center => (
                  <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        if (field.id === 'service_name') {
          return (
            <Select value={filter.value || ''} onValueChange={(value) => updateFilter(index, { value })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map(service => (
                  <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        // Fallback para otros campos de tipo select
        return (
          <Input
            value={filter.value || ''}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            placeholder="Valor"
          />
        );
      default:
        return (
          <Input
            value={filter.value || ''}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            placeholder="Valor de búsqueda"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Constructor de Reportes Personalizados</h2>
        <p className="text-muted-foreground">
          Crea reportes personalizados seleccionando campos y aplicando filtros
        </p>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Configuración del Reporte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="report-name">Nombre del Reporte</Label>
              <Input
                id="report-name"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Ventas por servicio marzo 2024"
              />
            </div>
            <div>
              <Label htmlFor="order-direction">Ordenar por</Label>
              <Select 
                value={config.orderDirection} 
                onValueChange={(value: 'asc' | 'desc') => setConfig(prev => ({ ...prev, orderDirection: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascendente</SelectItem>
                  <SelectItem value="desc">Descendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="report-description">Descripción (Opcional)</Label>
            <Textarea
              id="report-description"
              value={config.description}
              onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe qué información contiene este reporte..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Builder */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fields" className="flex items-center">
            <Table className="h-4 w-4 mr-2" />
            Campos ({config.selectedFields.length})
          </TabsTrigger>
          <TabsTrigger value="filters" className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filtros ({config.filters.length})
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Vista Previa
          </TabsTrigger>
        </TabsList>

        {/* Fields Tab */}
        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Campos</CardTitle>
              <CardDescription>
                Elige los campos que quieres incluir en tu reporte
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fieldCategories.map(category => (
                <div key={category} className="space-y-3 mb-6">
                  <div className="flex items-center space-x-2">
                    {getFieldIcon(category)}
                    <h4 className="font-medium">{category}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-6">
                    {availableFields
                      .filter(field => field.category === category)
                      .map(field => (
                        <div key={field.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={field.id}
                            checked={config.selectedFields.includes(field.id)}
                            onCheckedChange={() => toggleField(field.id)}
                          />
                          <Label htmlFor={field.id} className="text-sm">
                            {field.displayName}
                          </Label>
                        </div>
                      ))}
                  </div>
                  <Separator />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filters Tab */}
        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Filtros del Reporte</CardTitle>
                  <CardDescription>
                    Aplica filtros para refinar los datos de tu reporte
                  </CardDescription>
                </div>
                <Button onClick={addFilter} variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Agregar Filtro
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {config.filters.length === 0 ? (
                <div className="text-center py-8">
                  <Filter className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No hay filtros configurados</p>
                  <p className="text-sm text-muted-foreground">Agrega filtros para refinar tu reporte</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {config.filters.map((filter, index) => (
                    <div key={index} className="flex items-center space-x-2 p-4 border rounded-lg">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                        {/* Field Selection */}
                        <Select 
                          value={filter.field} 
                          onValueChange={(value) => {
                            const field = availableFields.find(f => f.id === value);
                            updateFilter(index, { 
                              field: value, 
                              label: field?.displayName || '',
                              value: '' // Reset value when field changes
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar campo" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.map(field => (
                              <SelectItem key={field.id} value={field.id}>
                                {field.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Operator Selection */}
                        <Select 
                          value={filter.operator} 
                          onValueChange={(value: any) => updateFilter(index, { operator: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getFilterOperatorOptions(
                              availableFields.find(f => f.id === filter.field)?.type || 'text'
                            ).map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Value Input */}
                        <div className="md:col-span-2">
                          {renderFilterValue(filter, index)}
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => removeFilter(index)} 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Reporte</CardTitle>
              <CardDescription>
                Revisa la configuración antes de generar el reporte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Información General</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nombre:</strong> {config.name || 'Sin nombre'}</p>
                    <p><strong>Descripción:</strong> {config.description || 'Sin descripción'}</p>
                    <p><strong>Orden:</strong> {config.orderDirection === 'asc' ? 'Ascendente' : 'Descendente'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Campos Seleccionados ({config.selectedFields.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {config.selectedFields.length > 0 ? (
                      config.selectedFields.map(fieldId => {
                        const field = availableFields.find(f => f.id === fieldId);
                        return (
                          <Badge key={fieldId} variant="secondary">
                            {field?.displayName}
                          </Badge>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">Ningún campo seleccionado</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Filtros Aplicados ({config.filters.length})</h4>
                {config.filters.length > 0 ? (
                  <div className="space-y-2">
                    {config.filters.map((filter, index) => (
                      <div key={index} className="text-sm flex items-center space-x-2">
                        <Badge variant="outline">{filter.label || 'Campo'}</Badge>
                        <span>{getFilterOperatorOptions('text').find(op => op.value === filter.operator)?.label}</span>
                        <Badge>{filter.value || 'Sin valor'}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin filtros aplicados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button 
          onClick={handleGenerate} 
          disabled={loading || config.selectedFields.length === 0}
          className="flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Generar Reporte
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CustomReportBuilder;