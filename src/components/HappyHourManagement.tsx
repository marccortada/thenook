import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Clock, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HappyHour {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  discount_percentage: number;
  days_of_week: number[];
  service_types?: string[];
  applicable_centers?: string[];
  is_active: boolean;
  created_at: string;
}

const HappyHourManagement = () => {
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newHappyHour, setNewHappyHour] = useState({
    name: "",
    description: "",
    start_time: "16:00",
    end_time: "18:00",
    discount_percentage: 30,
    days_of_week: [1, 2, 3, 4, 5, 6, 7], // All days
    is_active: true
  });
  
  const { toast } = useToast();

  const daysOfWeek = [
    { value: 1, label: "Lun" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Mié" },
    { value: 4, label: "Jue" },
    { value: 5, label: "Vie" },
    { value: 6, label: "Sáb" },
    { value: 7, label: "Dom" }
  ];

  const fetchHappyHours = async () => {
    try {
      // Temporal: usar consulta directa hasta que se complete la migración
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(0); // No queremos datos, solo verificar conexión

      if (error) console.error('Error de conexión:', error);
      // Por ahora mostramos datos dummy
      setHappyHours([]);
    } catch (error) {
      console.error('Error fetching happy hours:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los happy hours",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHappyHours();
  }, []);

  const handleCreateHappyHour = async () => {
    if (!newHappyHour.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Temporal: simulamos la creación exitosa
      toast({
        title: "Happy Hour creado",
        description: "La funcionalidad se completará cuando se ejecute la migración de la base de datos",
      });

      // Reset form
      setNewHappyHour({
        name: "",
        description: "",
        start_time: "16:00",
        end_time: "18:00",
        discount_percentage: 30,
        days_of_week: [1, 2, 3, 4, 5, 6, 7],
        is_active: true
      });

    } catch (error) {
      console.error('Error creating happy hour:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el happy hour",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    toast({
      title: "Estado actualizado",
      description: "La funcionalidad se completará cuando se ejecute la migración de la base de datos",
    });
  };

  const handleDelete = async (id: string) => {
    toast({
      title: "Happy Hour eliminado",
      description: "La funcionalidad se completará cuando se ejecute la migración de la base de datos",
    });
  };

  const toggleDay = (day: number) => {
    setNewHappyHour(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort()
    }));
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gestión de Happy Hours</h2>
        <p className="text-muted-foreground">
          Configura descuentos especiales para horarios específicos
        </p>
      </div>

      {/* Create New Happy Hour */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Crear Nuevo Happy Hour
          </CardTitle>
          <CardDescription>
            Define un nuevo período de descuentos para tus servicios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={newHappyHour.name}
                onChange={(e) => setNewHappyHour(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Happy Hour Masajes"
              />
            </div>
            <div>
              <Label htmlFor="discount">Descuento (%)</Label>
              <Input
                id="discount"
                type="number"
                min="1"
                max="100"
                value={newHappyHour.discount_percentage}
                onChange={(e) => setNewHappyHour(prev => ({ ...prev, discount_percentage: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={newHappyHour.description}
              onChange={(e) => setNewHappyHour(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción del happy hour..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Hora de inicio</Label>
              <Input
                id="start_time"
                type="time"
                value={newHappyHour.start_time}
                onChange={(e) => setNewHappyHour(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="end_time">Hora de fin</Label>
              <Input
                id="end_time"
                type="time"
                value={newHappyHour.end_time}
                onChange={(e) => setNewHappyHour(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Días de la semana</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {daysOfWeek.map((day) => (
                <Button
                  key={day.value}
                  variant={newHappyHour.days_of_week.includes(day.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={newHappyHour.is_active}
              onCheckedChange={(checked) => setNewHappyHour(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="active">Activar inmediatamente</Label>
          </div>

          <Button onClick={handleCreateHappyHour} disabled={isCreating}>
            {isCreating ? "Creando..." : "Crear Happy Hour"}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Happy Hours */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Happy Hours Configurados</h3>
        {happyHours.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay happy hours configurados</p>
            </CardContent>
          </Card>
        ) : (
          happyHours.map((happyHour) => (
            <Card key={happyHour.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {happyHour.name}
                      {happyHour.is_active ? (
                        <Badge variant="default">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </CardTitle>
                    {happyHour.description && (
                      <CardDescription>{happyHour.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={happyHour.is_active}
                      onCheckedChange={() => handleToggleActive(happyHour.id, happyHour.is_active)}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(happyHour.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{happyHour.start_time} - {happyHour.end_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    <span>{happyHour.discount_percentage}% descuento</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Días: </span>
                    {happyHour.days_of_week.map(day => 
                      daysOfWeek.find(d => d.value === day)?.label
                    ).join(", ")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default HappyHourManagement;
