import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Palette, Edit, Save, X } from 'lucide-react';
import { useServices, useLanes, useCenters } from '@/hooks/useDatabase';
import { useTreatmentGroups, CreateTreatmentGroupData } from '@/hooks/useTreatmentGroups';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Colores específicos solicitados: azul, verde, naranja, lila
const PRESET_COLORS = [
  '#3B82F6', // Azul
  '#10B981', // Verde 
  '#F97316', // Naranja
  '#8B5CF6', // Lila
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
  const { services, refetch: refetchServices } = useServices();
  const { lanes } = useLanes();
  const { centers } = useCenters();
  const { treatmentGroups, createTreatmentGroup, updateTreatmentGroup, fetchTreatmentGroups } = useTreatmentGroups();
  const { toast } = useToast();

  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [serviceModalPosition, setServiceModalPosition] = useState({ top: 0, left: 0 });
  const [formData, setFormData] = useState<CreateTreatmentGroupData>({
    name: '',
    color: PRESET_COLORS[0],
    lane_id: '',
    lane_ids: [] as string[], // Nuevo array para múltiples carriles
    center_id: '',
    active: true,
  });
  const [serviceFormData, setServiceFormData] = useState({
    color: PRESET_COLORS[0],
    lane_ids: [] as string[], // Cambiar a array para múltiples carriles
    center_id: '',
    group_id: ''
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
        lane_ids: dbGroup?.lane_ids || [],
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
      lane_ids: group.lane_ids || [],
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
        name: formData.name,
        color: formData.color,
        center_id: formData.center_id === 'all' ? null : formData.center_id,
        lane_ids: formData.lane_ids || [],
        active: formData.active,
      };

      if (group.dbGroup) {
        // Actualizar grupo existente
        await updateTreatmentGroup(group.dbGroup.id, dataToSave);
      } else {
        // Crear nuevo grupo
        await createTreatmentGroup(dataToSave);
      }

      // Refrescar datos para asegurar que se ven los cambios
      await fetchTreatmentGroups();

      toast({
        title: 'Éxito',
        description: 'Grupo actualizado correctamente',
      });

      setIsDialogOpen(false);
      setEditingGroup(null);
      resetForm();
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
      lane_ids: [],
      center_id: '',
      active: true,
    });
    setEditingGroup(null);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  // Funciones para editar servicios
  const handleEditService = (service: any) => {
    setServiceFormData({
      color: service.color || PRESET_COLORS[0],
      lane_ids: service.lane_ids || [],
      center_id: service.center_id || '',
      group_id: service.group_id || ''
    });
    setEditingService(service);
    setIsServiceDialogOpen(true);
  };

  const handleSaveService = async () => {
    try {
      if (!editingService) return;

      console.log('Saving service with data:', serviceFormData);
      console.log('Original service:', editingService);

      const updateData: any = {};
      
      // Actualizar color si ha cambiado
      if (serviceFormData.color !== editingService.color) {
        updateData.color = serviceFormData.color;
        console.log('Color changed from', editingService.color, 'to', serviceFormData.color);
      }
      
      // Actualizar lane_ids si ha cambiado
      if (JSON.stringify(serviceFormData.lane_ids) !== JSON.stringify(editingService.lane_ids || [])) {
        updateData.lane_ids = serviceFormData.lane_ids;
        console.log('Lane IDs changed from', editingService.lane_ids, 'to', serviceFormData.lane_ids);
      }
      
      // Actualizar center_id si ha cambiado
      if (serviceFormData.center_id !== editingService.center_id) {
        updateData.center_id = serviceFormData.center_id || null;
        console.log('Center ID changed from', editingService.center_id, 'to', serviceFormData.center_id);
      }
      
      // Actualizar group_id si ha cambiado
      if (serviceFormData.group_id && serviceFormData.group_id !== editingService.group_id) {
        updateData.group_id = serviceFormData.group_id;
        console.log('Group ID changed from', editingService.group_id, 'to', serviceFormData.group_id);
      }

      console.log('Update data to send:', updateData);

      if (Object.keys(updateData).length > 0) {
        const { data, error } = await supabase.from('services')
          .update(updateData)
          .eq('id', editingService.id)
          .select('*')
          .single();

        if (error) {
          console.error('Database update error:', error);
          toast({ title: 'Error', description: `No se pudo actualizar el servicio: ${error.message}`, variant: 'destructive' });
          return;
        }

        console.log('Service updated successfully:', data);
      }

      toast({ 
        title: 'Servicio actualizado', 
        description: `Color y carriles asignados correctamente. Los cambios se reflejarán inmediatamente.` 
      });
      
      // Actualizar los datos inmediatamente sin recargar la página
      console.log('Refetching services...');
      await refetchServices();
      console.log('Services refetched successfully');
      
      setIsServiceDialogOpen(false);
      setEditingService(null);
    } catch (err) {
      console.error('Error in handleSaveService:', err);
      toast({ title: 'Error', description: 'Error inesperado al actualizar el servicio', variant: 'destructive' });
    }
  };

  const closeServiceDialog = () => {
    setIsServiceDialogOpen(false);
    setEditingService(null);
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

      <Accordion type="multiple" className="space-y-4">
        {combinedGroups.map((group) => {
          const groupServices = classifyServices[group.id as keyof typeof classifyServices];
          const assignedLane = lanes.find(l => l.id === group.lane_id);
          const assignedCenter = centers.find(c => c.id === group.center_id);
          
          return (
            <AccordionItem key={group.id} value={group.id} className="border rounded-lg overflow-hidden treatment-group-item">
              <Card className="border-0 shadow-none">
                <AccordionTrigger className="hover:no-underline px-6 py-4">
                  <div className="flex items-center gap-3 w-full">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: group.dbGroup?.color || group.color }}
                    />
                    <div className="flex-1 text-left">
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
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {groupServices.length} servicio{groupServices.length !== 1 ? 's' : ''}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          
                          // Obtener el elemento del grupo
                          const button = e.currentTarget;
                          const groupCard = button.closest('.treatment-group-item');
                          if (!groupCard) return;
                          
                          const cardRect = groupCard.getBoundingClientRect();
                          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                          const windowHeight = window.innerHeight;
                          const windowWidth = window.innerWidth;
                          
                          // Dimensiones del modal
                          const modalWidth = Math.min(600, windowWidth - 40);
                          const modalHeight = Math.min(500, windowHeight - 80);
                          
                          // Centrar horizontalmente
                          let left = (windowWidth - modalWidth) / 2;
                          
                          // Posicionar verticalmente cerca del elemento clickeado pero visible
                          let top = cardRect.top + scrollTop - 50;
                          
                          // Ajustar si se sale de la pantalla verticalmente
                          const minTop = scrollTop + 20;
                          const maxTop = scrollTop + windowHeight - modalHeight - 20;
                          
                          if (top < minTop) {
                            top = minTop;
                          } else if (top > maxTop) {
                            top = maxTop;
                          }
                          
                          // Asegurar que no se salga horizontalmente
                          if (left < 20) left = 20;
                          if (left + modalWidth > windowWidth - 20) left = windowWidth - modalWidth - 20;
                          
                          setModalPosition({ top, left });
                          handleEditGroup(group);
                        }}
                        className="gap-2 text-xs sm:text-sm"
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent>
                  {groupServices.length > 0 ? (
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                          Servicios incluidos:
                        </h4>
                         <div className="grid gap-2">
                           {groupServices.map((service) => (
                             <div 
                               key={service.id}
                               className="service-item flex items-center justify-between p-3 rounded-lg border bg-card/50"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div 
                                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                                    style={{ backgroundColor: service.color || '#3B82F6' }}
                                    title={`Color: ${service.color || '#3B82F6'}`}
                                  />
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
                                      {service.lane_ids && service.lane_ids.length > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          {service.lane_ids.length} carril{service.lane_ids.length !== 1 ? 'es' : ''}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   
                                   // Obtener el elemento del servicio
                                   const button = e.currentTarget;
                                   const serviceItem = button.closest('.service-item');
                                   if (!serviceItem) return;
                                   
                                   const itemRect = serviceItem.getBoundingClientRect();
                                   const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                                   const windowHeight = window.innerHeight;
                                   const windowWidth = window.innerWidth;
                                   
                                   // Dimensiones del modal
                                   const modalWidth = Math.min(800, windowWidth - 40);
                                   const modalHeight = Math.min(600, windowHeight - 80);
                                   
                                   // Centrar horizontalmente
                                   let left = (windowWidth - modalWidth) / 2;
                                   
                                   // Posicionar verticalmente cerca del elemento clickeado pero visible
                                   let top = itemRect.top + scrollTop - 50;
                                   
                                   // Ajustar si se sale de la pantalla verticalmente
                                   const minTop = scrollTop + 20;
                                   const maxTop = scrollTop + windowHeight - modalHeight - 20;
                                   
                                   if (top < minTop) {
                                     top = minTop;
                                   } else if (top > maxTop) {
                                     top = maxTop;
                                   }
                                   
                                   // Asegurar que no se salga horizontalmente
                                   if (left < 20) left = 20;
                                   if (left + modalWidth > windowWidth - 20) left = windowWidth - modalWidth - 20;
                                   
                                   setServiceModalPosition({ top, left });
                                   handleEditService(service);
                                 }}
                                 className="text-xs px-2 py-1"
                               >
                                 <Edit className="w-3 h-3 mr-1" />
                                 Editar
                               </Button>
                             </div>
                           ))}
                         </div>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="pt-0 pb-4">
                      <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">No hay servicios en esta categoría</p>
                      </div>
                    </CardContent>
                  )}
                </AccordionContent>
              </Card>
            </AccordionItem>
          );
        })}
      </Accordion>

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

      {/* Modal para editar grupo */}
      {isDialogOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeDialog}
          />
          
          {/* Modal */}
          <div 
            className="fixed z-50 bg-white rounded-lg shadow-2xl border"
            style={{
              top: `${modalPosition.top}px`,
              left: `${modalPosition.left}px`,
              width: `${Math.min(600, window.innerWidth - 40)}px`,
              maxHeight: `${Math.min(500, window.innerHeight - 80)}px`,
              overflowY: 'auto'
            }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Editar Grupo de Tratamiento</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeDialog}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
              
              {/* Content */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">Nombre del Grupo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Masajes Relajantes"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Color</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? 'border-foreground' : 'border-border'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Centro (Opcional)</Label>
                  <Select
                    value={formData.center_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, center_id: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar centro" />
                    </SelectTrigger>
                    <SelectContent 
                      className="z-[70] bg-background border shadow-lg" 
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      avoidCollisions={true}
                      collisionPadding={20}
                    >
                      <SelectItem value="all">Todos los centros</SelectItem>
                      {centers.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Carriles Asignados (Múltiple selección)</Label>
                  <div className="mt-1 space-y-2">
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[40px]">
                      {(!formData.lane_ids || formData.lane_ids.length === 0) ? (
                        <span className="text-muted-foreground text-sm">Sin carriles específicos</span>
                      ) : (
                        formData.lane_ids.map(laneId => {
                          const lane = lanes.find(l => l.id === laneId);
                          const center = centers.find(c => c.id === lane?.center_id);
                          return lane ? (
                            <Badge key={laneId} variant="secondary" className="text-xs">
                              {lane.name} - {center?.name}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-1 hover:bg-transparent"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  lane_ids: prev.lane_ids?.filter(id => id !== laneId) || []
                                }))}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </Badge>
                          ) : null;
                        })
                      )}
                    </div>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value === 'none') {
                          setFormData(prev => ({ ...prev, lane_ids: [] }));
                        } else if (value && (!formData.lane_ids || !formData.lane_ids.includes(value))) {
                          setFormData(prev => ({
                            ...prev,
                            lane_ids: [...(prev.lane_ids || []), value]
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Añadir carril" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[70] bg-background border shadow-lg" 
                        position="popper"
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        avoidCollisions={true}
                        collisionPadding={20}
                      >
                        <SelectItem value="none">Limpiar todos los carriles</SelectItem>
                        {lanes.filter(lane => !formData.lane_ids?.includes(lane.id)).map((lane) => (
                          <SelectItem key={lane.id} value={lane.id}>
                            {lane.name} - {centers.find(c => c.id === lane.center_id)?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={closeDialog}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveGroup}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal para editar servicio */}
      {isServiceDialogOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeServiceDialog}
          />
          
          {/* Modal */}
          <div 
            className="fixed z-[60] bg-white rounded-lg shadow-2xl border"
            style={{
              top: `${serviceModalPosition.top}px`,
              left: `${serviceModalPosition.left}px`,
              width: `${Math.min(800, window.innerWidth - 40)}px`,
              maxHeight: `${Math.min(600, window.innerHeight - 80)}px`,
              overflowY: 'auto'
            }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Editar Servicio</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeServiceDialog}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
              
              {/* Content */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Color del Servicio</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          serviceFormData.color === color ? 'border-foreground' : 'border-border'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setServiceFormData(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Centro</Label>
                  <Select
                    value={serviceFormData.center_id || 'all'}
                    onValueChange={(value) => setServiceFormData(prev => ({ ...prev, center_id: value === 'all' ? '' : value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar centro" />
                    </SelectTrigger>
                    <SelectContent 
                      className="z-[80] bg-background border shadow-lg" 
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      avoidCollisions={true}
                      collisionPadding={20}
                    >
                      <SelectItem value="all">Todos los centros</SelectItem>
                      {centers.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Carriles Asignados (Múltiple selección)</Label>
                  <div className="mt-1 space-y-2">
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[40px]">
                      {serviceFormData.lane_ids.length === 0 ? (
                        <span className="text-muted-foreground text-sm">Sin carriles específicos</span>
                      ) : (
                        serviceFormData.lane_ids.map(laneId => {
                          const lane = lanes.find(l => l.id === laneId);
                          const center = centers.find(c => c.id === lane?.center_id);
                          return lane ? (
                            <Badge key={laneId} variant="secondary" className="text-xs">
                              {lane.name} - {center?.name}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-1 hover:bg-transparent"
                                onClick={() => setServiceFormData(prev => ({
                                  ...prev,
                                  lane_ids: prev.lane_ids.filter(id => id !== laneId)
                                }))}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </Badge>
                          ) : null;
                        })
                      )}
                    </div>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value === 'none') {
                          setServiceFormData(prev => ({ ...prev, lane_ids: [] }));
                        } else if (value && !serviceFormData.lane_ids.includes(value)) {
                          setServiceFormData(prev => ({
                            ...prev,
                            lane_ids: [...prev.lane_ids, value]
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Añadir carril" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[80] bg-background border shadow-lg" 
                        position="popper"
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        avoidCollisions={true}
                        collisionPadding={20}
                      >
                        <SelectItem value="none">Limpiar todos los carriles</SelectItem>
                        {lanes.filter(lane => !serviceFormData.lane_ids.includes(lane.id)).map((lane) => (
                          <SelectItem key={lane.id} value={lane.id}>
                            {lane.name} - {centers.find(c => c.id === lane.center_id)?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Grupo de Tratamiento</Label>
                  <Select
                    value={serviceFormData.group_id || 'none'}
                    onValueChange={(value) => setServiceFormData(prev => ({ ...prev, group_id: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent 
                      className="z-[80] bg-background border shadow-lg" 
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      avoidCollisions={true}
                      collisionPadding={20}
                    >
                      <SelectItem value="none">Sin grupo específico</SelectItem>
                      {combinedGroups.map((group) => (
                        group.dbGroup?.id ? (
                          <SelectItem key={group.id} value={group.dbGroup.id}>
                            {group.name}
                          </SelectItem>
                        ) : null
                      )).filter(Boolean)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={closeServiceDialog}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveService}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TreatmentGroupsManagement;