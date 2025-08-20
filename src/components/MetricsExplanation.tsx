import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, BarChart3, TrendingUp, Users, Euro, Calendar, Activity } from "lucide-react";

const MetricsExplanation = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            ¿Qué son las Métricas en Tiempo Real?
          </CardTitle>
          <CardDescription>
            Las métricas son indicadores clave de rendimiento (KPI) que te permiten monitorear 
            el estado de tu negocio en tiempo real y tomar decisiones informadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              <strong>¿Por qué son importantes?</strong><br />
              Te ayudan a identificar tendencias, detectar problemas temprano, optimizar operaciones 
              y mejorar la rentabilidad de tu centro de bienestar.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Reservas Diarias
              </h4>
              <p className="text-sm text-muted-foreground">
                Número total de reservas confirmadas hoy. Te permite ver la demanda diaria 
                y planificar recursos.
              </p>
              <Badge variant="outline">KPI Operacional</Badge>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Euro className="h-4 w-4 text-green-600" />
                Ingresos Diarios
              </h4>
              <p className="text-sm text-muted-foreground">
                Facturación total del día actual. Incluye servicios, bonos y productos vendidos.
              </p>
              <Badge variant="outline">KPI Financiero</Badge>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Nuevos Clientes
              </h4>
              <p className="text-sm text-muted-foreground">
                Clientes que se registraron hoy por primera vez. Mide el crecimiento de tu base de clientes.
              </p>
              <Badge variant="outline">KPI Crecimiento</Badge>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-600" />
                Tasa de Ocupación
              </h4>
              <p className="text-sm text-muted-foreground">
                Porcentaje de tiempo utilizado vs. disponible. Te ayuda a optimizar horarios y recursos.
              </p>
              <Badge variant="outline">KPI Eficiencia</Badge>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Cómo usar las métricas
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Tendencias:</strong> Compara períodos (diario, semanal, mensual)</li>
              <li>• <strong>Alertas:</strong> Define umbrales para recibir notificaciones</li>
              <li>• <strong>Decisiones:</strong> Ajusta precios, horarios o promociones basándote en los datos</li>
              <li>• <strong>Planificación:</strong> Usa históricos para prever demanda futura</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsExplanation;