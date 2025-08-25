import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Users,
  Edit,
  Save,
  X
} from 'lucide-react';
import { useCenters, useEmployees } from '@/hooks/useDatabase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CenterDetails {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  active: boolean;
  working_hours: {
    [key: string]: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
}

const defaultWorkingHours = {
  monday: { enabled: true, start: '09:00', end: '18:00' },
  tuesday: { enabled: true, start: '09:00', end: '18:00' },
  wednesday: { enabled: true, start: '09:00', end: '18:00' },
  thursday: { enabled: true, start: '09:00', end: '18:00' },
  friday: { enabled: true, start: '09:00', end: '18:00' },
  saturday: { enabled: true, start: '10:00', end: '16:00' },
  sunday: { enabled: false, start: '10:00', end: '16:00' }
};

const CenterManagement = () => {
  const { centers, loading, refetch } = useCenters();
  const { employees } = useEmployees();
  const { toast } = useToast();
  
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [centerDetails, setCenterDetails] = useState<CenterDetails | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  
  const [newCenterForm, setNewCenterForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });

  const dayNames = {
    monday: 'Lunes',
    tuesday: 'Martes', 
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  useEffect(() => {
    if (selectedCenter) {
      fetchCenterDetails(selectedCenter);
    }
  }, [selectedCenter]);

  const fetchCenterDetails = async (centerId: string) => {
    try {
      const { data, error } = await supabase
        .from('centers')
        .select('*')
        .eq('id', centerId)
        .single();

      if (error) throw error;

      setCenterDetails({
        ...data,
        working_hours: (data.working_hours as any) || defaultWorkingHours
      });
    } catch (error) {
      console.error('Error fetching center details:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles del centro.",
        variant: "destructive",
      });
    }
  };

  const handleCreateCenter = async () => {
    try {
      const { error } = await supabase
        .from('centers')
        .insert([{
          ...newCenterForm,
          working_hours: defaultWorkingHours,
          active: true
        }]);

      if (error) throw error;

      toast({
        title: "Centro creado",
        description: "El nuevo centro ha sido creado exitosamente.",
      });

      setShowCreateDialog(false);
      setNewCenterForm({ name: '', address: '', phone: '', email: '' });
      refetch();
    } catch (error) {
      console.error('Error creating center:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el centro.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateWorkingHours = async () => {
    if (!centerDetails) return;

    try {
      const { error } = await supabase
        .from('centers')
        .update({ working_hours: centerDetails.working_hours })
        .eq('id', centerDetails.id);

      if (error) throw error;

      toast({
        title: "Horarios actualizados",
        description: "Los horarios del centro han sido guardados.",
      });

      setEditingHours(false);
    } catch (error) {
      console.error('Error updating working hours:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los horarios.",
        variant: "destructive",
      });
    }
  };

  const centerEmployees = employees.filter(emp => emp.center_id === selectedCenter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Centros</h2>
          <p className="text-muted-foreground">
            Configura información, horarios y personal de cada centro
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Centro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Centro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del centro</Label>
                <Input
                  id="name"
                  value={newCenterForm.name}
                  onChange={(e) => setNewCenterForm({ ...newCenterForm, name: e.target.value })}
                  placeholder="Ej: The Nook Madrid Centro"
                />
              </div>
              <div>
                <Label htmlFor="address">Dirección</Label>
                <Textarea
                  id="address"
                  value={newCenterForm.address}
                  onChange={(e) => setNewCenterForm({ ...newCenterForm, address: e.target.value })}
                  placeholder="Dirección completa del centro"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={newCenterForm.phone}
                    onChange={(e) => setNewCenterForm({ ...newCenterForm, phone: e.target.value })}
                    placeholder="+34 600 000 000"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCenterForm.email}
                    onChange={(e) => setNewCenterForm({ ...newCenterForm, email: e.target.value })}
                    placeholder="centro@thenook.es"
                  />
                </div>
              </div>
              <Button onClick={handleCreateCenter} className="w-full">
                Crear Centro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Center Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Centro</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCenter} onValueChange={setSelectedCenter}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un centro para gestionar" />
            </SelectTrigger>
            <SelectContent>
              {centers.map((center) => (
                <SelectItem key={center.id} value={center.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {center.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Center Details */}
      {centerDetails && (
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="schedule">Horarios</TabsTrigger>
            <TabsTrigger value="staff">Personal</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Información del Centro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Nombre</Label>
                    <p className="text-base">{centerDetails.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                    <Badge variant={centerDetails.active ? 'default' : 'secondary'}>
                      {centerDetails.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Dirección</Label>
                    <p className="text-base">{centerDetails.address || 'No especificada'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <p className="text-base">{centerDetails.phone || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="text-base">{centerDetails.email || 'No especificado'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Horarios de Apertura
                  </CardTitle>
                  <Button
                    variant={editingHours ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (editingHours) {
                        handleUpdateWorkingHours();
                      } else {
                        setEditingHours(true);
                      }
                    }}
                  >
                    {editingHours ? (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(centerDetails.working_hours).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium w-20">{dayNames[day as keyof typeof dayNames]}</span>
                        <Badge variant={hours.enabled ? 'default' : 'secondary'}>
                          {hours.enabled ? 'Abierto' : 'Cerrado'}
                        </Badge>
                      </div>
                      {editingHours ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={hours.enabled}
                            onChange={(e) => {
                              setCenterDetails({
                                ...centerDetails,
                                working_hours: {
                                  ...centerDetails.working_hours,
                                  [day]: { ...hours, enabled: e.target.checked }
                                }
                              });
                            }}
                            className="rounded"
                          />
                          {hours.enabled && (
                            <>
                              <Input
                                type="time"
                                value={hours.start}
                                onChange={(e) => {
                                  setCenterDetails({
                                    ...centerDetails,
                                    working_hours: {
                                      ...centerDetails.working_hours,
                                      [day]: { ...hours, start: e.target.value }
                                    }
                                  });
                                }}
                                className="w-24"
                              />
                              <span>-</span>
                              <Input
                                type="time"
                                value={hours.end}
                                onChange={(e) => {
                                  setCenterDetails({
                                    ...centerDetails,
                                    working_hours: {
                                      ...centerDetails.working_hours,
                                      [day]: { ...hours, end: e.target.value }
                                    }
                                  });
                                }}
                                className="w-24"
                              />
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {hours.enabled ? `${hours.start} - ${hours.end}` : 'Cerrado'}
                        </div>
                      )}
                    </div>
                  ))}
                  {editingHours && (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingHours(false);
                          fetchCenterDetails(centerDetails.id);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Personal del Centro ({centerEmployees.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Especialidades</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {centerEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            {employee.profiles?.first_name} {employee.profiles?.last_name}
                          </TableCell>
                          <TableCell>{employee.profiles?.email || 'N/A'}</TableCell>
                          <TableCell>{employee.profiles?.phone || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {employee.specialties?.map((specialty, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {specialty}
                                </Badge>
                              )) || 'Ninguna'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={employee.active ? 'default' : 'secondary'}>
                              {employee.active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {centerEmployees.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No hay personal asignado a este centro.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default CenterManagement;