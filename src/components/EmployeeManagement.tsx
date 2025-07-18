import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEmployees, useCenters } from "@/hooks/useDatabase";
import { Plus, MapPin, Phone, Mail, Calendar, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EmployeeManagement = () => {
  const { toast } = useToast();
  const { centers } = useCenters();
  const { employees, loading, refetch } = useEmployees();
  const [selectedCenter, setSelectedCenter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    centerId: "",
    specialties: [] as string[],
  });

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

  const filteredEmployees = selectedCenter 
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

      if (profileError) throw profileError;

      // Then create the employee record
      const { error: employeeError } = await supabase
        .from('employees')
        .insert([{
          profile_id: profile.id,
          center_id: newEmployee.centerId,
          specialties: newEmployee.specialties,
          active: true
        }]);

      if (employeeError) throw employeeError;

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
      toast({
        title: "Error",
        description: "No se pudo crear el empleado. Inténtalo de nuevo.",
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
            <SelectItem value="">Todos los centros</SelectItem>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getEmployeeInitials(employee)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">
                    {getEmployeeFullName(employee)}
                  </h3>
                  
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="truncate">{getCenterName(employee.center_id)}</span>
                    </div>
                    
                    {employee.profiles?.email && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 mr-1" />
                        <span className="truncate">{employee.profiles.email}</span>
                      </div>
                    )}
                    
                    {employee.profiles?.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="h-3 w-3 mr-1" />
                        <span>{employee.profiles.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  {employee.specialties && employee.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
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
                  
                  <div className="mt-3 flex items-center justify-between">
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
        ))}
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
    </div>
  );
};

export default EmployeeManagement;