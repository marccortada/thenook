import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useEmployees, useCenters } from "@/hooks/useDatabase";
import { useEmployeeManagement, WorkingHours, EmployeeDetails } from "@/hooks/useEmployeeManagement";
import { Plus, MapPin, Phone, Mail, Calendar, Users, Clock, Edit, TrendingUp, DollarSign, Star, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EmployeeManagement = () => {
  const { toast } = useToast();
  const { centers } = useCenters();
  const { employees, loading, refetch } = useEmployees();
  const [selectedCenter, setSelectedCenter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    centerId: "",
    specialties: [] as string[],
  });
  
  const {
    selectedEmployee,
    setSelectedEmployee,
    getEmployeeMetrics,
    updateEmployeeWorkingHours,
    updateEmployeeStatus,
    updateEmployeeSpecialties,
    isEmployeeAvailable,
    getEmployeeStatusText,
    defaultWorkingHours,
    loading: managementLoading
  } = useEmployeeManagement();

  const availableSpecialties = [
    "Masaje Relajante",
    "Masaje Deportivo", 
    "Masaje Terapéutico",
    "Tratamiento Facial",
    "Reflexología",
    "Aromaterapia",
    "Drenaje Linfático",
    "Masaje de Parejas"
  ];

  const filteredEmployees = selectedCenter && selectedCenter !== "all"
    ? employees.filter(emp => emp.center_id === selectedCenter)
    : employees;

  const handleCreateEmployee = async () => {
    try {
      if (!newEmployee.firstName || !newEmployee.lastName || !newEmployee.email || !newEmployee.centerId) {
        toast({
          title: "Error",
          description: "Por favor completa todos los campos obligatorios",
          variant: "destructive",
        });
        return;
      }

      // First create the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert([{
          email: newEmployee.email,
          first_name: newEmployee.firstName,
          last_name: newEmployee.lastName,
          phone: newEmployee.phone,
          role: 'employee'
        }])
        .select()
        .single();

      if (profileError) {
        console.error('Error creating profile:', profileError);
        throw profileError;
      }

      // Then create the employee record
      const { error: employeeError } = await supabase
        .from('employees')
        .insert([{
          profile_id: profile?.id,
          center_id: newEmployee.centerId,
          specialties: newEmployee.specialties,
          active: true
        }]);

      if (employeeError) {
        console.error('Error creating employee:', employeeError);
        throw employeeError;
      }

      // Log the activity
      try {
        await supabase.rpc('log_activity', {
          p_user_id: null, // Will be handled by the function
          p_action: 'create',
          p_entity_type: 'employee',
          p_entity_id: profile?.id,
          p_new_values: {
            name: `${newEmployee.firstName} ${newEmployee.lastName}`,
            email: newEmployee.email,
            center_id: newEmployee.centerId,
            specialties: newEmployee.specialties
          }
        });
      } catch (logError) {
        console.warn('Could not log activity:', logError);
      }

      toast({
        title: "Empleado Creado",
        description: `${newEmployee.firstName} ${newEmployee.lastName} ha sido añadido exitosamente`,
      });

      setNewEmployee({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        centerId: "",
        specialties: [],
      });
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error creating employee:', error);
      toast({
        title: "Error",
        description: `No se pudo crear el empleado: ${error?.message || 'Error desconocido'}`,
        variant: "destructive",
      });
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setNewEmployee(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const getEmployeeInitials = (employee: any) => {
    const firstName = employee.profiles?.first_name || "";
    const lastName = employee.profiles?.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getEmployeeFullName = (employee: any) => {
    const firstName = employee.profiles?.first_name || "";
    const lastName = employee.profiles?.last_name || "";
    return `${firstName} ${lastName}`.trim();
  };

  const getCenterName = (centerId: string) => {
    const center = centers.find(c => c.id === centerId);
    return center?.name || "Centro no encontrado";
  };

  const handleViewEmployee = (employee: any) => {
    const employeeDetails: EmployeeDetails = {
      ...employee,
      working_hours: defaultWorkingHours, // Por ahora usamos horarios por defecto
      hire_date: employee.created_at || new Date().toISOString(),
      notes: "" // Por ahora sin notas
    };
    setSelectedEmployee(employeeDetails);
    setIsDetailDialogOpen(true);
  };

  const handleUpdateWorkingHours = async (workingHours: WorkingHours) => {
    if (selectedEmployee) {
      await updateEmployeeWorkingHours(selectedEmployee.id, workingHours);
    }
  };

  const handleUpdateSpecialties = async (specialties: string[]) => {
    if (selectedEmployee) {
      await updateEmployeeSpecialties(selectedEmployee.id, specialties);
    }
  };

  const handleToggleEmployeeStatus = async (active: boolean) => {
    if (selectedEmployee) {
      await updateEmployeeStatus(selectedEmployee.id, active);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando empleados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Empleados</h2>
          <p className="text-muted-foreground">Administra tu equipo de trabajo</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Añadir Empleado</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Empleado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input
                    id="firstName"
                    value={newEmployee.firstName}
                    onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Apellidos *</Label>
                  <Input
                    id="lastName"
                    value={newEmployee.lastName}
                    onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                    placeholder="Apellidos"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="empleado@thenook.es"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  placeholder="+34 600 000 000"
                />
              </div>
              
              <div>
                <Label htmlFor="center">Centro *</Label>
                <Select value={newEmployee.centerId} onValueChange={(value) => setNewEmployee({ ...newEmployee, centerId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un centro" />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Especialidades</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableSpecialties.map((specialty) => (
                    <Button
                      key={specialty}
                      type="button"
                      variant={newEmployee.specialties.includes(specialty) ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => toggleSpecialty(specialty)}
                    >
                      {specialty}
                    </Button>
                  ))}
                </div>
              </div>
              
              <Button onClick={handleCreateEmployee} className="w-full">
                Crear Empleado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="centerFilter">Centro:</Label>
        </div>
        <Select value={selectedCenter} onValueChange={setSelectedCenter}>
          <SelectTrigger className="w-48">
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Empleados</p>
                <p className="text-2xl font-bold">{filteredEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Disponibles Hoy</p>
                <p className="text-2xl font-bold">{filteredEmployees.filter(emp => emp.active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">En Sesión</p>
                <p className="text-2xl font-bold">3</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredEmployees.map((employee) => {
          const employeeDetails: EmployeeDetails = {
            ...employee,
            working_hours: defaultWorkingHours, // Por ahora usamos horarios por defecto
            hire_date: employee.created_at || new Date().toISOString(),
            notes: "" // Por ahora sin notas
          };
          
          return (
            <Card key={employee.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewEmployee(employee)}>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getEmployeeInitials(employee)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm sm:text-base truncate">
                        {getEmployeeFullName(employee)}
                      </h3>
                      <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-8 sm:w-8 p-0 flex-shrink-0">
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{getCenterName(employee.center_id)}</span>
                      </div>
                      
                      {employee.profiles?.email && (
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                          <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{employee.profiles.email}</span>
                        </div>
                      )}
                      
                      {employee.profiles?.phone && (
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{employee.profiles.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    {employee.specialties && employee.specialties.length > 0 && (
                      <div className="mt-2 sm:mt-3 flex flex-wrap gap-1">
                        {employee.specialties.slice(0, 2).map((specialty) => (
                          <Badge key={specialty} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                        {employee.specialties.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{employee.specialties.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-2 sm:mt-3 flex items-center justify-between">
                      <Badge 
                        variant={employee.active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {employee.active ? "Disponible" : "No disponible"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay empleados</h3>
          <p className="text-muted-foreground mb-4">
            {selectedCenter ? "No hay empleados en este centro" : "Aún no tienes empleados registrados"}
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Añadir Primer Empleado
          </Button>
        </div>
      )}

      {/* Employee Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {selectedEmployee && getEmployeeInitials(selectedEmployee)}
                </AvatarFallback>
              </Avatar>
              {selectedEmployee && getEmployeeFullName(selectedEmployee)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmployee && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Resumen</TabsTrigger>
                <TabsTrigger value="schedule">Horarios</TabsTrigger>
                <TabsTrigger value="specialties">Especialidades</TabsTrigger>
                <TabsTrigger value="metrics">Métricas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Información Personal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedEmployee.profiles?.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedEmployee.profiles?.phone || "No especificado"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{getCenterName(selectedEmployee.center_id)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Desde: {new Date(selectedEmployee.hire_date).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Estado Actual</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Estado:</span>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={selectedEmployee.active}
                            onCheckedChange={handleToggleEmployeeStatus}
                            disabled={managementLoading}
                          />
                          <Badge variant={selectedEmployee.active ? "default" : "secondary"}>
                            {selectedEmployee.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Disponibilidad:</span>
                        <Badge variant={isEmployeeAvailable(selectedEmployee) ? "default" : "secondary"}>
                          {getEmployeeStatusText(selectedEmployee)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Especialidades:</span>
                        <span className="text-sm">{selectedEmployee.specialties.length}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Horarios de Trabajo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WorkingHoursEditor
                      workingHours={selectedEmployee.working_hours}
                      onUpdate={handleUpdateWorkingHours}
                      loading={managementLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="specialties" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Especialidades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SpecialtiesEditor
                      specialties={selectedEmployee.specialties}
                      availableSpecialties={availableSpecialties}
                      onUpdate={handleUpdateSpecialties}
                      loading={managementLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="metrics" className="space-y-4">
                <EmployeeMetricsView
                  employeeId={selectedEmployee.id}
                  getEmployeeMetrics={getEmployeeMetrics}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Working Hours Editor Component
const WorkingHoursEditor = ({ workingHours, onUpdate, loading }: {
  workingHours: WorkingHours;
  onUpdate: (hours: WorkingHours) => void;
  loading: boolean;
}) => {
  const [localHours, setLocalHours] = useState(workingHours);
  
  const days = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];

  const handleSave = () => {
    onUpdate(localHours);
  };

  return (
    <div className="space-y-4">
      {days.map(day => (
        <div key={day.key} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Switch
              checked={localHours[day.key]?.enabled || false}
              onCheckedChange={(enabled) => 
                setLocalHours(prev => ({
                  ...prev,
                  [day.key]: { ...prev[day.key], enabled }
                }))
              }
            />
            <Label className="w-20">{day.label}</Label>
          </div>
          
          {localHours[day.key]?.enabled && (
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={localHours[day.key]?.start || '09:00'}
                onChange={(e) => 
                  setLocalHours(prev => ({
                    ...prev,
                    [day.key]: { ...prev[day.key], start: e.target.value }
                  }))
                }
                className="w-24"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="time"
                value={localHours[day.key]?.end || '18:00'}
                onChange={(e) => 
                  setLocalHours(prev => ({
                    ...prev,
                    [day.key]: { ...prev[day.key], end: e.target.value }
                  }))
                }
                className="w-24"
              />
            </div>
          )}
        </div>
      ))}
      
      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? "Guardando..." : "Guardar Horarios"}
      </Button>
    </div>
  );
};

// Specialties Editor Component
const SpecialtiesEditor = ({ specialties, availableSpecialties, onUpdate, loading }: {
  specialties: string[];
  availableSpecialties: string[];
  onUpdate: (specialties: string[]) => void;
  loading: boolean;
}) => {
  const [localSpecialties, setLocalSpecialties] = useState(specialties);

  const toggleSpecialty = (specialty: string) => {
    setLocalSpecialties(prev => 
      prev.includes(specialty) 
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    );
  };

  const handleSave = () => {
    onUpdate(localSpecialties);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {availableSpecialties.map(specialty => (
          <Button
            key={specialty}
            variant={localSpecialties.includes(specialty) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSpecialty(specialty)}
            className="justify-start"
          >
            {specialty}
          </Button>
        ))}
      </div>
      
      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? "Guardando..." : "Guardar Especialidades"}
      </Button>
    </div>
  );
};

// Employee Metrics View Component
const EmployeeMetricsView = ({ employeeId, getEmployeeMetrics }: {
  employeeId: string;
  getEmployeeMetrics: (id: string) => any;
}) => {
  const metrics = getEmployeeMetrics(employeeId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reservas Totales</p>
              <p className="text-2xl font-bold">{metrics.totalBookings}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Activity className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completadas</p>
              <p className="text-2xl font-bold">{metrics.completedBookings}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ingresos</p>
              <p className="text-2xl font-bold">{metrics.revenue}€</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valoración</p>
              <p className="text-2xl font-bold">{metrics.averageRating}/5</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Esta Semana</p>
              <p className="text-2xl font-bold">{metrics.thisWeekBookings}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Este Mes</p>
              <p className="text-2xl font-bold">{metrics.thisMonthBookings}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeManagement;