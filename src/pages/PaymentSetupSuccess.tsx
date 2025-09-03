import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, Calendar, CreditCard, Clock, User } from "lucide-react";

export default function PaymentSetupSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  const setupIntentId = searchParams.get('setup_intent');

  useEffect(() => {
    if (setupIntentId) {
      confirmPaymentMethod();
    } else {
      setLoading(false);
    }
  }, [setupIntentId]);

  const confirmPaymentMethod = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('confirm-payment-method', {
        body: { setup_intent_id: setupIntentId }
      });

      if (error) throw error;

      setConfirmed(true);
      toast({
        title: "¡Éxito!",
        description: "Tu método de pago ha sido configurado correctamente",
      });
    } catch (error: any) {
      console.error('Error confirming payment method:', error);
      toast({
        title: "Error",
        description: error.message || "Error al confirmar el método de pago",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <p className="text-center mt-4 text-muted-foreground">Confirmando método de pago...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img
              src="/lovable-uploads/475dc4d6-6d6b-4357-a8b5-4611869beb43.png"
              alt="The Nook Madrid"
              className="h-12 w-auto md:h-16"
              loading="lazy"
            />
          </div>
          <p className="text-muted-foreground">Confirmación de pago</p>
        </div>

        {/* Success Card */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-800">¡Reserva Asegurada!</CardTitle>
            <CardDescription className="text-green-600">
              Tu método de pago ha sido configurado correctamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Tarjeta guardada de forma segura</p>
                  <p className="text-sm text-muted-foreground">
                    Protegida con encriptación de grado bancario
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">No se ha realizado ningún cargo</p>
                  <p className="text-sm text-muted-foreground">
                    El pago se procesará el día de tu cita
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Recordatorio automático</p>
                  <p className="text-sm text-muted-foreground">
                    Te enviaremos un recordatorio 24h antes
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Próximos pasos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Recibirás un recordatorio</p>
                  <p className="text-sm text-muted-foreground">
                    Te enviaremos un email 24 horas antes de tu cita
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Disfruta de tu tratamiento</p>
                  <p className="text-sm text-muted-foreground">
                    Llega unos minutos antes para prepararte
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Pago automático</p>
                  <p className="text-sm text-muted-foreground">
                    Se procesará el pago una vez completado el servicio
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/')}
            className="w-full h-12 text-lg"
            size="lg"
          >
            Volver al inicio
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.print()}
            className="w-full"
          >
            Imprimir confirmación
          </Button>
        </div>

        {/* Contact Info */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="text-center text-sm">
              <p className="font-medium mb-2">¿Necesitas ayuda?</p>
              <p className="text-muted-foreground">
                📧 reservas@thenookmadrid.com<br />
                📞 +34 XXX XXX XXX
              </p>
              <p className="text-xs border-t pt-2 mt-3">
                © GnerAI 2025 · Todos los derechos reservados
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}