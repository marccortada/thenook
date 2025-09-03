import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Palette } from 'lucide-react';
import { useTreatmentGroups, CreateTreatmentGroupData } from '@/hooks/useTreatmentGroups';
import { useCenters, useServices } from '@/hooks/useDatabase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Colores predefinidos para los grupos
const PRESET_COLORS = [
  '#10B981', // Green
  '#F59E0B', // Yellow  
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#6366F1', // Indigo
];

const TreatmentGroupsManagement: React.FC = () => {
  const { treatmentGroups, loading, createTreatmentGroup, updateTreatmentGroup, deleteTreatmentGroup } = useTreatmentGroups();
  const { centers } = useCenters();
  const { services, refetch: refetchServices } = useServices();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [formData, setFormData] = useState<CreateTreatmentGroupData>({
    name: '',
    color: PRESET_COLORS[0],
    lane_id: '',
    center_id: '',
    active: true,
  });

  // Obtener carriles disponibles
  const [lanes, setLanes] = useState<any[]>([]);
  
  React.useEffect(() => {
    const fetchLanes = async () => {
      const { data } = await supabase
        .from('lanes')
        .select('*')
        .eq('active', true)
        .order('name');
      setLanes(data || []);
    };
    fetchLanes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del grupo es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    let success = null;
    
    if (editingGroup) {
      success = await updateTreatmentGroup(editingGroup.id, formData);
    } else {
      success = await createTreatmentGroup(formData);
    }

    if (success !== null) {
      setIsCreateDialogOpen(false);
      setEditingGroup(null);
      setFormData({
        name: '',
        color: PRESET_COLORS[0],
        lane_id: '',
        center_id: '',
        active: true,
      });
    }
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      color: group.color,
      lane_id: group.lane_id || '',
      center_id: group.center_id || '',
      active: group.active,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este grupo? Los servicios asociados quedarán sin grupo.')) {
      return;
    }
    await deleteTreatmentGroup(groupId);
  };

  // Obtener servicios por grupo
  const getServicesInGroup = (groupId: string) => {
    return services.filter((service: any) => service.group_id === groupId);
  };

  const assignServiceToGroup = async (serviceId: string, groupId: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ group_id: groupId })
        .eq('id', serviceId);

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo asignar el servicio al grupo',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Éxito',
        description: 'Servicio asignado al grupo correctamente',
      });
      
      refetchServices();
    } catch (error) {
      console.error('Error assigning service to group:', error);
    }
  };

  if (loading) {
    return <div>Cargando grupos de tratamientos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Grupos de Tratamientos</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingGroup(null);
              setFormData({
                name: '',
                color: PRESET_COLORS[0],
                lane_id: '',
                center_id: '',
                active: true,
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Editar Grupo' : 'Crear Nuevo Grupo'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Grupo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Masajes Relajantes"
                  required
                />
              </div>
              
              <div>
                <Label>Color del Grupo</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-8 mt-2"
                />
              </div>

              <div>
                <Label htmlFor="center">Centro</Label>
                <Select
                  value={formData.center_id}
                  onValueChange={(value) => setFormData({ ...formData, center_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar centro (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los centros</SelectItem>
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="lane">Carril Asignado</Label>
                <Select
                  value={formData.lane_id}
                  onValueChange={(value) => setFormData({ ...formData, lane_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar carril (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin carril específico</SelectItem>
                    {lanes
                      .filter(lane => !formData.center_id || lane.center_id === formData.center_id)
                      .map((lane) => (
                        <SelectItem key={lane.id} value={lane.id}>
                          {lane.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingGroup ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {treatmentGroups.map((group) => {
          const servicesInGroup = getServicesInGroup(group.id);
          
          return (
            <Card key={group.id} className="border-l-4" style={{ borderLeftColor: group.color }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    {group.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(group)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(group.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {group.lanes?.name && (
                    <div>
                      <strong>Carril:</strong> {group.lanes.name}
                    </div>
                  )}
                  <div>
                    <strong>Servicios:</strong> {servicesInGroup.length}
                  </div>
                  {servicesInGroup.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {servicesInGroup.slice(0, 3).map((service) => (
                        <Badge key={service.id} variant="secondary" className="text-xs">
                          {service.name}
                        </Badge>
                      ))}
                      {servicesInGroup.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{servicesInGroup.length - 3} más
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Servicios sin grupo */}
      <Card>
        <CardHeader>
          <CardTitle>Servicios sin Grupo Asignado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {services
              .filter((service: any) => !service.group_id)
              .map((service: any) => (
                <div key={service.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{service.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({service.duration_minutes} min)
                    </span>
                  </div>
                  <Select
                    onValueChange={(groupId) => assignServiceToGroup(service.id, groupId)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Asignar a grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {treatmentGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: group.color }}
                            />
                            {group.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            {services.filter((service: any) => !service.group_id).length === 0 && (
              <p className="text-muted-foreground text-sm">
                Todos los servicios tienen un grupo asignado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TreatmentGroupsManagement;