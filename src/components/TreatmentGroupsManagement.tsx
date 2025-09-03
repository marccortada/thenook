import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Palette, Edit, Save, X } from 'lucide-react';
import { useServices, useLanes, useCenters } from '@/hooks/useDatabase';
import { useTreatmentGroups, CreateTreatmentGroupData } from '@/hooks/useTreatmentGroups';
import { useToast } from '@/hooks/use-toast';

// Colores predefinidos
const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow/Orange
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#6366F1', // Indigo
];

// Grupos predefinidos que coinciden con el modal de reservas
const PREDEFINED_GROUPS = [
  {
    id: 'masajes-individuales',
    name: 'Masajes Individuales',
    color: '#3B82F6',
    description: 'Masajes para una persona'
  },
  {
    id: 'masajes-pareja',
    name: 'Masajes en Pareja', 
    color: '#10B981',
    description: 'Masajes para dos personas'
  },
  {
    id: 'masajes-cuatro-manos',
    name: 'Masajes a Cuatro Manos',
    color: '#F59E0B', 
    description: 'Masajes con cuatro manos'
  },
  {
    id: 'rituales',
    name: 'Rituales',
    color: '#8B5CF6',
    description: 'Rituales y paquetes'
  }
];

const TreatmentGroupsManagement: React.FC = () => {
  const { services } = useServices();
  const { lanes } = useLanes();
  const { centers } = useCenters();
  const { treatmentGroups, createTreatmentGroup, updateTreatmentGroup } = useTreatmentGroups();
  const { toast } = useToast();

  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateTreatmentGroupData>({
    name: '',
    color: PRESET_COLORS[0],
    lane_id: '',
    center_id: '',
    active: true,
  });

  // Clasificar servicios automáticamente usando la misma lógica del modal
  const classifyServices = React.useMemo(() => {
    const classification = {
      'masajes-individuales': [] as any[],
      'masajes-pareja': [] as any[],
      'masajes-cuatro-manos': [] as any[],
      'rituales': [] as any[]
    };

    services.forEach(service => {
      const name = service.name.toLowerCase();
      
      if (name.includes('cuatro manos')) {
        classification['masajes-cuatro-manos'].push(service);
      } else if (name.includes('dos personas') || name.includes('pareja') || name.includes('para dos') || name.includes('2 personas')) {
        classification['masajes-pareja'].push(service);
      } else if (service.type === 'package' || name.includes('ritual')) {
        classification['rituales'].push(service);
      } else {
        classification['masajes-individuales'].push(service);
      }
    });

    return classification;
  }, [services]);

  // Inicializar grupos predefinidos si no existen
  React.useEffect(() => {
    const initializePredefinedGroups = async () => {
      for (const predefinedGroup of PREDEFINED_GROUPS) {
        const existingGroup = treatmentGroups.find(g => g.name === predefinedGroup.name);
        if (!existingGroup) {
          await createTreatmentGroup({
            name: predefinedGroup.name,
            color: predefinedGroup.color,
            active: true,
          });
        }
      }
    };

    if (treatmentGroups.length < PREDEFINED_GROUPS.length) {
      initializePredefinedGroups();
    }
  }, [treatmentGroups, createTreatmentGroup]);

  // Combinar grupos predefinidos con los de la base de datos
  const combinedGroups = React.useMemo(() => {
    return PREDEFINED_GROUPS.map(predefined => {
      const dbGroup = treatmentGroups.find(g => g.name === predefined.name);
      return {
        ...predefined,
        dbGroup,
        lane_id: dbGroup?.lane_id || '',
        center_id: dbGroup?.center_id || '',
      };
    });
  }, [treatmentGroups]);

  const handleEditGroup = (group: any) => {
    setEditingGroup(group.id);
    setFormData({
      name: group.name,
      color: group.dbGroup?.color || group.color,
      lane_id: group.lane_id || '',
      center_id: group.center_id || '',
      active: true,
    });
    setIsDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    try {
      if (!editingGroup) return;

      const group = combinedGroups.find(g => g.id === editingGroup);
      if (!group) return;

      // Convert special values back to empty strings for database
      const dataToSave = {
        ...formData,
        center_id: formData.center_id === 'all' ? '' : formData.center_id,
        lane_id: formData.lane_id === 'none' ? '' : formData.lane_id,
      };

      if (group.dbGroup) {
        // Actualizar grupo existente
        await updateTreatmentGroup(group.dbGroup.id, dataToSave);
      } else {
        // Crear nuevo grupo
        await createTreatmentGroup(dataToSave);
      }

      toast({
        title: 'Éxito',
        description: 'Grupo actualizado correctamente',
      });

      setIsDialogOpen(false);
      setEditingGroup(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el grupo',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      color: PRESET_COLORS[0],
      lane_id: '',
      center_id: '',
      active: true,
    });
    setEditingGroup(null);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Grupos de Tratamientos</h2>
          <p className="text-muted-foreground">
            Organización automática de servicios por categorías con asignación de carriles
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {combinedGroups.map((group) => {
          const groupServices = classifyServices[group.id as keyof typeof classifyServices];
          const assignedLane = lanes.find(l => l.id === group.lane_id);
          const assignedCenter = centers.find(c => c.id === group.center_id);
          
          return (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: group.dbGroup?.color || group.color }}
                  />
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                    {assignedLane && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Carril: {assignedLane.name}
                        </Badge>
                        {assignedCenter && (
                          <Badge variant="secondary" className="text-xs">
                            {assignedCenter.name}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {groupServices.length} servicio{groupServices.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditGroup(group)}
                    className="gap-2 text-xs sm:text-sm"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Editar Grupo</span>
                    <span className="sm:hidden">Editar</span>
                  </Button>
                </div>
              </CardHeader>
              
              {groupServices.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Servicios incluidos:
                    </h4>
                    <div className="grid gap-2">
                      {groupServices.map((service) => (
                        <div 
                          key={service.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{service.name}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {service.duration_minutes} min
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {(service.price_cents / 100).toLocaleString('es-ES', { 
                                  style: 'currency', 
                                  currency: 'EUR' 
                                })}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {service.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
              
              {groupServices.length === 0 && (
                <CardContent className="pt-0">
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">No hay servicios en esta categoría</p>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Palette className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">Clasificación Automática</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Los servicios se organizan automáticamente según su nombre y tipo. 
              Esta organización se mantiene sincronizada con el modal de reservas para los clientes.
              Puedes asignar carriles específicos a cada grupo para optimizar la gestión.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para editar grupo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Editar Grupo de Tratamiento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Grupo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Masajes Relajantes"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color" className="text-sm font-medium">Color</Label>
              <div className="grid grid-cols-5 sm:flex sm:flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 sm:w-8 sm:h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-foreground' : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="center">Centro (Opcional)</Label>
              <Select
                value={formData.center_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, center_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar centro" />
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

            <div className="space-y-2">
              <Label htmlFor="lane">Carril Asignado (Opcional)</Label>
              <Select
                value={formData.lane_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, lane_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar carril" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin carril específico</SelectItem>
                  {lanes.map((lane) => (
                    <SelectItem key={lane.id} value={lane.id}>
                      {lane.name} - {centers.find(c => c.id === lane.center_id)?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog} className="flex-1 order-2 sm:order-1">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSaveGroup} className="flex-1 order-1 sm:order-2">
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreatmentGroupsManagement;