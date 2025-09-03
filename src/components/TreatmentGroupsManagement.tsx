import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Palette } from 'lucide-react';
import { useServices } from '@/hooks/useDatabase';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Grupos de Tratamientos</h2>
          <p className="text-muted-foreground">
            Organización automática de servicios por categorías
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {PREDEFINED_GROUPS.map((group) => {
          const groupServices = classifyServices[group.id as keyof typeof classifyServices];
          
          return (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: group.color }}
                  />
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {groupServices.length} servicio{groupServices.length !== 1 ? 's' : ''}
                  </Badge>
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
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TreatmentGroupsManagement;