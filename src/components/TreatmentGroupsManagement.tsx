import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppModal from "@/components/ui/app-modal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Palette, Edit, Save, X, Plus, Sparkles } from 'lucide-react';
import { useServices, useLanes, useCenters } from '@/hooks/useDatabase';
import { useTreatmentGroups, CreateTreatmentGroupData } from '@/hooks/useTreatmentGroups';
import { useToast } from '@/hooks/use-toast';
import { useViewportPositioning } from '@/hooks/useViewportPositioning';
import { supabase } from '@/integrations/supabase/client';

// Colores disponibles para el admin
const PRESET_COLORS = [
  '#3B82F6', // Azul
  '#10B981', // Verde 
  '#F97316', // Naranja
  '#8B5CF6', // Lila
  '#EF4444', // Rojo
  '#F59E0B', // Amarillo
  '#EC4899', // Rosa
  '#06B6D4', // Cyan
  '#84CC16', // Lima
  '#6366F1', // Índigo
  '#8B5A2B', // Marrón
  '#6B7280', // Gris
  '#DC2626', // Rojo oscuro
  '#059669', // Verde oscuro
  '#7C3AED', // Púrpura
  '#0EA5E9', // Azul claro
  '#F472B6', // Rosa claro
  '#FCD34D', // Amarillo claro
  '#34D399', // Verde claro
  '#A78BFA', // Púrpura claro
];

// Grupos predefinidos que coinciden con el modal de reservas
const PREDEFINED_GROUPS = [
  {
    id: 'masajes-individuales',
    name: 'Masaje Individual',
    color: '#3B82F6',
    description: 'Masajes para una persona'
  },
  {
    id: 'masajes-pareja',
    name: 'Masaje para Dos', 
    color: '#10B981',
    description: 'Masajes para dos personas'
  },
  {
    id: 'masajes-cuatro-manos',
    name: 'Masaje a Cuatro Manos',
    color: '#F59E0B', 
    description: 'Masajes con cuatro manos'
  },
  {
    id: 'rituales',
    name: 'Rituales',
    color: '#8B5CF6',
    description: 'Rituales individuales'
  },
  {
    id: 'rituales-pareja',
    name: 'Rituales para Dos',
    color: '#EC4899',
    description: 'Rituales para dos personas'
  },
  {
    id: 'promos-ultimo-minuto',
    name: 'Promociones reservas último minuto',
    color: '#F97316',
    description: 'Promociones especiales de último minuto'
  },
  {
    id: 'promos-vigentes',
    name: 'Promociones vigentes',
    color: '#22C55E',
    description: 'Promociones activas actualmente'
  }
];

// Función para normalizar labels (igual que en AdvancedCalendarView)
const normalizeLabel = (label?: string) =>
  (label ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Función base para calcular el label de un centro (sin lógica de duplicados)
const computeBaseCenterLabel = (center?: { name?: string | null; address?: string | null; address_zurbaran?: string | null; address_concha_espina?: string | null }): string => {
  if (!center) return 'Sin centro asignado';
  
  const name = center.name?.toLowerCase() || '';
  const address = center.address?.toLowerCase() || '';
  const combined = `${name} ${address}`;

  if (
    combined.includes('zurbar') ||
    combined.includes('28010') ||
    center.address_zurbaran
  ) {
    return 'Zurbarán';
  }

  if (
    combined.includes('concha') ||
    combined.includes('espina') ||
    combined.includes('principe de vergara') ||
    combined.includes('príncipe de vergara') ||
    combined.includes('vergara') ||
    combined.includes('28002') ||
    center.address_concha_espina
  ) {
    return 'Concha Espina';
  }

  return center.name?.split('-').pop()?.trim() || center.name || center.address || 'Centro';
};

// Función para obtener un nombre único del centro basado en su dirección
const computeFriendlyCenterName = (center?: { name?: string | null; address?: string | null; address_zurbaran?: string | null; address_concha_espina?: string | null; id?: string }, allCenters?: any[]): string => {
  if (!center) return 'Sin centro asignado';
  
  let label = computeBaseCenterLabel(center);

  // Si hay 2 centros y ambos tienen el mismo nombre, asignar nombres únicos
  if (allCenters && allCenters.length === 2 && center.id) {
    const entries = allCenters.map((c) => ({
      id: c.id,
      label: computeBaseCenterLabel(c),
    }));

    if (entries.length === 2) {
      const [first, second] = entries;
      if (normalizeLabel(first.label) === normalizeLabel(second.label)) {
        // Asignar nombres únicos basándose en la dirección
        const firstCenter = allCenters.find(c => c.id === first.id);
        const secondCenter = allCenters.find(c => c.id === second.id);
        
        const firstAddr = ((firstCenter?.address?.toLowerCase() || '') + (firstCenter?.address_zurbaran || '')).toLowerCase();
        const secondAddr = ((secondCenter?.address?.toLowerCase() || '') + (secondCenter?.address_concha_espina || '')).toLowerCase();
        
        if (firstAddr.includes('zurbar') || firstAddr.includes('28010')) {
          if (center.id === first.id) return 'Zurbarán';
          if (center.id === second.id) return 'Concha Espina';
        } else if (secondAddr.includes('zurbar') || secondAddr.includes('28010')) {
          if (center.id === second.id) return 'Zurbarán';
          if (center.id === first.id) return 'Concha Espina';
        } else {
          // Fallback: asignar por orden
          if (center.id === first.id) return 'Zurbarán';
          if (center.id === second.id) return 'Concha Espina';
        }
      }
    }
  }

  return label;
};

const TreatmentGroupsManagement: React.FC = () => {
  const { services, refetch: refetchServices } = useServices();
  const { lanes } = useLanes();
  const { centers } = useCenters();
  const { treatmentGroups, createTreatmentGroup, updateTreatmentGroup, fetchTreatmentGroups, loading: groupsLoading } = useTreatmentGroups();
  const { toast } = useToast();
  const didInit = React.useRef(false);
  
  // Estado para el centro seleccionado para filtrar carriles
  const [filterCenterId, setFilterCenterId] = useState<string>('');

  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPositionCalculated, setIsPositionCalculated] = useState(false); // legacy, not used for AppModal
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedGroupForService, setSelectedGroupForService] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 }); // legacy, not used for AppModal

  const baseSelectClass =
    "flex h-12 w-full rounded-2xl border border-border/60 bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 text-sm font-semibold text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

  // Hook para posicionamiento del modal
  const serviceModalRef = useViewportPositioning(isServiceDialogOpen, 150);
  const [formData, setFormData] = useState<CreateTreatmentGroupData>({
    name: '',
    color: PRESET_COLORS[0],
    lane_id: '',
    lane_ids: [] as string[], // Nuevo array para múltiples carriles
    center_id: '',
    active: true,
  });
  const [serviceFormData, setServiceFormData] = useState<{
    name: string;
    description: string;
    type: 'massage' | 'treatment' | 'package';
    duration_minutes: number;
    price_cents: number;
    active: boolean;
    center_id: string;
    has_discount: boolean;
    discount_price_cents: number;
    show_online: boolean;
  }>({
    name: '',
    description: '',
    type: 'massage',
    duration_minutes: 60,
    price_cents: 5000,
    active: true,
    center_id: '',
    has_discount: false,
    discount_price_cents: 0,
    show_online: true
  });

  // Clasificar servicios automáticamente usando la misma lógica del modal
  const classifyServices = React.useMemo(() => {
    const classification = {
      'masajes-individuales': [] as any[],
      'masajes-pareja': [] as any[],
      'masajes-cuatro-manos': [] as any[],
      'rituales': [] as any[],
      'rituales-pareja': [] as any[],
      // Los grupos de promociones no clasifican nada automáticamente;
      // el admin decide qué servicios van dentro.
      'promos-ultimo-minuto': [] as any[],
      'promos-vigentes': [] as any[]
    };

    services.forEach(service => {
      const name = service.name.toLowerCase();
      
      if (name.includes('cuatro manos')) {
        classification['masajes-cuatro-manos'].push(service);
      } else if (name.includes('ritual') && (name.includes('dos personas') || name.includes('pareja') || name.includes('para dos') || name.includes('2 personas'))) {
        // Rituales para dos personas van a rituales-pareja
        classification['rituales-pareja'].push(service);
      } else if (name.includes('dos personas') || name.includes('pareja') || name.includes('para dos') || name.includes('2 personas')) {
        // Masajes para dos personas van a masajes-pareja
        classification['masajes-pareja'].push(service);
      } else if (service.type === 'package' || name.includes('ritual')) {
        // Rituales individuales van a rituales
        classification['rituales'].push(service);
      } else {
        classification['masajes-individuales'].push(service);
      }
    });

    return classification;
  }, [services]);

  // Inicializar grupos predefinidos y asignar servicios automáticamente
  React.useEffect(() => {
    // Only run initialization once and wait for data to load
    if (didInit.current || groupsLoading || services.length === 0) {
      return;
    }

    const initializePredefinedGroups = async () => {
      // Create a set of existing group names for efficient lookup
      const existingNames = new Set(treatmentGroups.map(g => g.name.toLowerCase()));
      
      for (const predefinedGroup of PREDEFINED_GROUPS) {
        if (!existingNames.has(predefinedGroup.name.toLowerCase())) {
          console.log(`Creating missing group: ${predefinedGroup.name}`);
          try {
            const newGroup = await createTreatmentGroup({
              name: predefinedGroup.name,
              color: predefinedGroup.color,
              active: true,
            });
            
            if (newGroup) {
              // Auto-assign services to this group
              await assignServicesToGroup(predefinedGroup.id, newGroup.id);
            }
          } catch (error) {
            console.log(`Group ${predefinedGroup.name} might already exist, continuing...`);
          }
        }
      }
    };

    const assignServicesToGroup = async (groupType: string, groupId: string) => {
      const servicesToAssign = classifyServices[groupType as keyof typeof classifyServices];
      
      for (const service of servicesToAssign) {
        if (!service.group_id) {
          try {
            await supabase
              .from('services')
              .update({ group_id: groupId })
              .eq('id', service.id);
            console.log(`✅ Servicio "${service.name}" asignado al grupo "${groupType}"`);
          } catch (error) {
            console.error(`Error asignando servicio ${service.name}:`, error);
          }
        }
      }
    };

    // Auto-assign any unassigned services to appropriate groups
    const autoAssignServices = async () => {
      for (const predefinedGroup of PREDEFINED_GROUPS) {
        const existingGroup = treatmentGroups.find(g => g.name === predefinedGroup.name);
        if (existingGroup) {
          await assignServicesToGroup(predefinedGroup.id, existingGroup.id);
        }
      }
    };

    const runInitialization = async () => {
      didInit.current = true;
      
      if (treatmentGroups.length < PREDEFINED_GROUPS.length) {
        await initializePredefinedGroups();
      }
      
      await autoAssignServices();
    };

    runInitialization();
  }, [treatmentGroups, createTreatmentGroup, services, groupsLoading, classifyServices]);

  // Combinar grupos predefinidos con los de la base de datos
  const combinedGroups = React.useMemo(() => {
    const combined = PREDEFINED_GROUPS.map(predefined => {
      // Encontrar el registro más reciente por nombre (para evitar duplicados)
      const dbGroup = treatmentGroups
        .filter(g => g.name === predefined.name)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
      
      const result = {
        ...predefined,
        dbGroup,
        lane_id: dbGroup?.lane_id || '',
        lane_ids: dbGroup?.lane_ids || [],
        center_id: dbGroup?.center_id || '',
      };
      
      console.log(`=== combinedGroups for ${predefined.name} ===`);
      console.log('Predefined:', predefined);
      console.log('dbGroup found (most recent):', dbGroup);
      console.log('Result:', result);
      
      return result;
    });
    
    console.log('=== All combined groups ===', combined);
    return combined;
  }, [treatmentGroups]);

  const handleEditGroup = (group: any, event: React.MouseEvent) => {
    
    event.preventDefault();
    event.stopPropagation();
    
    // Usar el botón como referencia para el posicionamiento
    const buttonElement = event.currentTarget as HTMLElement;
    const buttonRect = buttonElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    // Dimensiones del modal
    const modalWidth = Math.min(600, windowWidth - 40);
    const modalHeight = Math.min(500, windowHeight - 80);
    
    // Calcular posición
    let top = buttonRect.top + scrollTop - 50;
    let left = (windowWidth - modalWidth) / 2;
    
    // Ajustar verticalmente para que esté siempre visible
    const viewportTop = scrollTop + 20;
    const viewportBottom = scrollTop + windowHeight - 20;
    
    if (top < viewportTop) {
      top = viewportTop;
    } else if (top + modalHeight > viewportBottom) {
      top = viewportBottom - modalHeight;
    }
    
    // Asegurar que no se salga horizontalmente
    if (left < 20) left = 20;
    if (left + modalWidth > windowWidth - 20) left = windowWidth - modalWidth - 20;
    
    
    // Establecer la posición calculada
    setModalPosition({ top, left });
    setIsPositionCalculated(true);
    
    const centerId = group.center_id || '';
    setEditingGroup(group.id);
    setFormData({
      name: group.name,
      color: group.dbGroup?.color || group.color,
      lane_id: group.lane_id || '',
      lane_ids: group.lane_ids || [],
      center_id: centerId,
      active: true,
    });
    
    // Establecer el filtro de centro para mostrar solo los carriles de ese centro
    setFilterCenterId(centerId === 'all' ? '' : centerId);
    
    
    // Abrir el modal solo después de calcular la posición
    setIsDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    try {
      if (!editingGroup) return;

      const group = combinedGroups.find(g => g.id === editingGroup);
      if (!group) return;

      console.log('Guardando grupo con formData:', formData);

      // Convert special values back to empty strings for database
      const dataToSave = {
        name: formData.name,
        color: formData.color,
        center_id: formData.center_id === 'all' ? null : (formData.center_id || null),
        lane_ids: formData.lane_ids || [],
        active: formData.active,
      };

      console.log('Data to save:', dataToSave);

      if (group.dbGroup) {
        // Actualizar grupo existente
        console.log('Updating existing group:', group.dbGroup.id);
        await updateTreatmentGroup(group.dbGroup.id, dataToSave);
      } else {
        // Crear nuevo grupo
        console.log('Creating new group');
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
      console.error('Error guardando grupo:', error);
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
    setIsPositionCalculated(false);
    resetForm();
  };

  const handleAddService = (groupId: string) => {
    setSelectedGroupForService(groupId);
    setIsServiceDialogOpen(true);
  };

  const handleNewGroup = (event?: React.MouseEvent) => {
    // Evitar navegación accidental si el botón estuviera dentro de un <a> o <form>
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setEditingGroup(null);
    setFormData({
      name: '',
      color: PRESET_COLORS[0],
      lane_id: '',
      lane_ids: [],
      center_id: '',
      active: true,
    });
    // Resetear el filtro de centro al crear un nuevo grupo
    setFilterCenterId('');
    // AppModal se centra solo; no necesitamos cálculos
    setIsPositionCalculated(true);
    setIsDialogOpen(true);
  };

  const handleCreateService = async () => {
    try {
      if (!serviceFormData.name || !serviceFormData.duration_minutes || !serviceFormData.price_cents) {
        toast({ 
          title: 'Campos requeridos', 
          description: 'Nombre, duración y precio son obligatorios', 
          variant: 'destructive' 
        });
        return;
      }

      const group = combinedGroups.find(g => g.id === selectedGroupForService);
      if (!group?.dbGroup) {
        toast({ 
          title: 'Error', 
          description: 'Grupo no encontrado o no inicializado', 
          variant: 'destructive' 
        });
        return;
      }

      const { error } = await supabase.from('services').insert({
        name: serviceFormData.name,
        description: serviceFormData.description || null,
        type: serviceFormData.type,
        duration_minutes: serviceFormData.duration_minutes,
        price_cents: serviceFormData.price_cents,
        active: serviceFormData.active,
        has_discount: serviceFormData.has_discount,
        discount_price_cents: serviceFormData.discount_price_cents,
        show_online: serviceFormData.show_online,
        center_id: serviceFormData.center_id || null,
        group_id: group.dbGroup.id
      });

      if (error) {
        toast({ 
          title: 'Error', 
          description: `No se pudo crear el servicio: ${error.message}`, 
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Creado', 
          description: 'Servicio creado exitosamente' 
        });
        setServiceFormData({
          name: '',
          description: '',
          type: 'massage',
          duration_minutes: 60,
          price_cents: 5000,
          active: true,
          center_id: '',
          has_discount: false,
          discount_price_cents: 0,
          show_online: true
        });
        setIsServiceDialogOpen(false);
        setSelectedGroupForService(null);
        refetchServices();
      }
    } catch (err) {
      console.error('Error creating service:', err);
      toast({ 
        title: 'Error', 
        description: 'Error inesperado al crear el servicio', 
        variant: 'destructive' 
      });
    }
  };

  const closeServiceDialog = () => {
    setIsServiceDialogOpen(false);
    setSelectedGroupForService(null);
    setServiceFormData({
      name: '',
      description: '',
      type: 'massage',
      duration_minutes: 60,
      price_cents: 5000,
      active: true,
      center_id: '',
      has_discount: false,
      discount_price_cents: 0,
      show_online: true
    });
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
        <Button 
          type="button"
          onClick={handleNewGroup}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Grupo
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-4">
        {combinedGroups.map((group) => {
          // Por defecto, usamos la clasificación automática por tipo
          let groupServices = classifyServices[group.id as keyof typeof classifyServices] || [];

          // EXCEPCIÓN: para los grupos de promociones usamos SIEMPRE los servicios
          // cuyo group_id apunte a ese grupo en la base de datos
          if (group.id === 'promos-ultimo-minuto' || group.id === 'promos-vigentes') {
            if (group.dbGroup?.id) {
              groupServices = services.filter(
                (service: any) => service.group_id === group.dbGroup.id
              );
            } else {
              groupServices = [];
            }
          }

          const assignedLane = lanes.find(l => l.id === group.lane_id);
          const assignedCenter = centers.find(c => c.id === group.center_id);
          
          return (
            <AccordionItem key={group.id} value={group.id} className="border rounded-lg treatment-group-item">
              <Card className="border-0 shadow-none">
                <AccordionTrigger className="hover:no-underline px-4 py-3 sm:px-6 sm:py-4">
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
                        onClick={(e) => handleEditGroup(group, e)}
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
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Servicios incluidos:
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddService(group.id)}
                            className="gap-2 text-xs"
                          >
                            <Plus className="w-3 h-3" />
                            Agregar Masaje
                          </Button>
                        </div>
                         <div className="grid gap-2">
                           {groupServices.map((service) => (
                             <div 
                               key={service.id}
                               className="service-item flex items-center justify-between p-3 rounded-lg border bg-card/50"
                              >
                                 <div className="flex items-center gap-3 flex-1">
                                   <div 
                                     className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                                     style={{ backgroundColor: group.dbGroup?.color || group.color || '#3B82F6' }}
                                     title={`Color del grupo: ${group.dbGroup?.color || group.color || '#3B82F6'}`}
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
                                        {service.lane_ids && Array.isArray(service.lane_ids) && service.lane_ids.length > 0 && (
                                          <Badge variant="outline" className="text-xs">
                                            {service.lane_ids.length} carril{service.lane_ids.length !== 1 ? 'es' : ''}
                                          </Badge>
                                        )}
                                     </div>
                                   </div>
                                 </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="pt-0 pb-4">
                      <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm mb-3">No hay servicios en esta categoría</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddService(group.id)}
                          className="gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          Agregar Primer Masaje
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </AccordionContent>
              </Card>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Modal para editar grupo */}
      {isDialogOpen && (
        <>
          <AppModal open={true} onClose={closeDialog} maxWidth={500} mobileMaxWidth={350} maxHeight={600}>
            <div className={`p-4 sm:p-6`}>
              {/* Header */}
              <div className={`flex items-center justify-between mb-4 sm:mb-6`}>
                <h3 className={`font-semibold text-lg sm:text-xl`}>Editar Grupo de Tratamiento</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeDialog}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
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
                  <select
                    className={`${baseSelectClass} mt-1`}
                    value={formData.center_id}
                    onChange={(e) => {
                      const newCenterId = e.target.value;
                      setFormData(prev => ({ ...prev, center_id: newCenterId }));
                      // Actualizar el filtro de carriles cuando se cambia el centro
                      setFilterCenterId(newCenterId === 'all' ? '' : newCenterId);
                    }}
                  >
                    <option value="">
                      Seleccionar centro
                    </option>
                    <option value="all">Todos los centros</option>
                      {centers
                      .filter(center => center.id && center.id.trim() !== '')
                      .map(center => (
                        <option key={center.id} value={center.id}>
                          {computeFriendlyCenterName(center, centers)}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Carriles Asignados (Múltiple selección)</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Los servicios de este grupo solo se podrán reservar en los carriles que selecciones aquí. Si no seleccionas ningún carril, el sistema usará cualquier carril disponible.
                  </p>
                  <div className="mt-1 space-y-2">
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[40px]">
                      {(!formData.lane_ids || formData.lane_ids.length === 0) ? (
                        <span className="text-muted-foreground text-sm">Sin carriles específicos</span>
                      ) : (
                        formData.lane_ids.map(laneId => {
                          const lane = lanes.find(l => l.id === laneId);
                          if (!lane) return null;
                          
                          const center = centers.find(c => c.id === lane.center_id);
                          const centerName = computeFriendlyCenterName(center, centers);
                          const laneDisplayName = lane.name.replace(/ra[ií]l/gi, 'Carril');
                          // Mostrar el nombre del carril con el nombre específico del centro
                          const displayName = lane.center_id && center
                            ? `${laneDisplayName} - ${centerName}`
                            : `${laneDisplayName} (${centerName})`;
                          return (
                            <Badge key={laneId} variant="secondary" className="text-xs">
                              {displayName}
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
                          );
                        })
                      )}
                    </div>
                    <select
                      className={baseSelectClass}
                      value=""
                      onChange={(e) => {
                        const value = e.target.value;
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
                      <option value="" disabled>
                        Añadir carril
                      </option>
                      <option value="none">Limpiar todos los carriles</option>
                      {lanes
                        .filter(lane => {
                          // Filtrar por centro seleccionado si hay uno
                          if (filterCenterId && lane.center_id !== filterCenterId) {
                            return false;
                          }
                          return lane.id && lane.id.trim() !== '' && !formData.lane_ids?.includes(lane.id);
                        })
                        .sort((a, b) => {
                          // Ordenar primero por nombre de centro, luego por nombre de carril
                          const centerA = centers.find(c => c.id === a.center_id);
                          const centerB = centers.find(c => c.id === b.center_id);
                          const centerNameA = computeFriendlyCenterName(centerA, centers);
                          const centerNameB = computeFriendlyCenterName(centerB, centers);
                          
                          if (centerNameA !== centerNameB) {
                            return centerNameA.localeCompare(centerNameB);
                          }
                          return a.name.localeCompare(b.name);
                        })
                        .map(lane => {
                          const center = centers.find(c => c.id === lane.center_id);
                          const centerName = computeFriendlyCenterName(center, centers);
                          const laneDisplayName = lane.name.replace(/ra[ií]l/gi, 'Carril');
                          // Mostrar el nombre del carril con el nombre específico del centro
                          const displayName = lane.center_id && center
                            ? `${laneDisplayName} - ${centerName}`
                            : `${laneDisplayName} (${centerName})`;
                          return (
                            <option key={lane.id} value={lane.id}>
                              {displayName}
                            </option>
                          );
                        })}
                    </select>
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
          </AppModal>
        </>
      )}

      {/* Modal para agregar nuevo servicio */}
      {isServiceDialogOpen && (
        <>
          <AppModal open={true} onClose={closeServiceDialog} maxWidth={500} mobileMaxWidth={350} maxHeight={600}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Agregar Nuevo Masaje</h3>
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
                  <Label htmlFor="service-name" className="text-sm font-medium">Nombre del Masaje</Label>
                  <Input
                    id="service-name"
                    value={serviceFormData.name}
                    onChange={(e) => setServiceFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Masaje Relajante"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="service-description" className="text-sm font-medium">Descripción</Label>
                  <Textarea
                    id="service-description"
                    value={serviceFormData.description}
                    onChange={(e) => setServiceFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del masaje..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="service-duration" className="text-sm font-medium">Duración (minutos)</Label>
                    <Input
                      id="service-duration"
                      type="number"
                      value={serviceFormData.duration_minutes}
                      onChange={(e) => setServiceFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                      placeholder="60"
                      className="mt-1"
                      min="15"
                      max="300"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="service-price" className="text-sm font-medium">Precio (€)</Label>
                    <Input
                      id="service-price"
                      type="number"
                      step="0.01"
                      value={serviceFormData.price_cents / 100}
                      onChange={(e) => setServiceFormData(prev => ({ ...prev, price_cents: Math.round((parseFloat(e.target.value) || 0) * 100) }))}
                      placeholder="50.00"
                      className="mt-1"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Tipo de Servicio</Label>
                  <select
                    className={`${baseSelectClass} mt-1`}
                    value={serviceFormData.type}
                    onChange={(e) =>
                      setServiceFormData(prev => ({
                        ...prev,
                        type: e.target.value as 'massage' | 'treatment' | 'package',
                      }))
                    }
                  >
                    {['massage', 'treatment', 'package'].map(option => (
                      <option key={option} value={option}>
                        {option === 'massage'
                          ? 'Masaje'
                          : option === 'treatment'
                          ? 'Tratamiento'
                          : 'Paquete'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Centro (Opcional)</Label>
                  <select
                    className={`${baseSelectClass} mt-1`}
                    value={serviceFormData.center_id || 'all_centers'}
                    onChange={(e) =>
                      setServiceFormData(prev => ({
                        ...prev,
                        center_id: e.target.value === 'all_centers' ? '' : e.target.value,
                      }))
                    }
                  >
                    <option value="all_centers">Todos los centros</option>
                    {centers
                      .filter(center => center.id && center.id.trim() !== '')
                      .map(center => (
                        <option key={center.id} value={center.id}>
                          {computeFriendlyCenterName(center, centers)}
                        </option>
                      ))}
                  </select>
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
                    onClick={handleCreateService}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Masaje
                  </Button>
                </div>
              </div>
            </div>
          </AppModal>
        </>
      )}

    </div>
  );
};

export default TreatmentGroupsManagement;
