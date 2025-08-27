import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Send, Download, Eye, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const InvoiceManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const sendTestInvoice = async () => {
    setLoading(true);
    try {
      // Get a recent booking to test with
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !bookings || bookings.length === 0) {
        toast({
          title: "Error",
          description: "No hay reservas disponibles para enviar factura de prueba.",
          variant: "destructive",
        });
        return;
      }

      const { data, error: invoiceError } = await supabase.functions
        .invoke('send-booking-invoice', {
          body: { booking_id: bookings[0].id }
        });

      if (invoiceError) {
        throw invoiceError;
      }

      toast({
        title: "✅ Factura enviada",
        description: "Se ha enviado una factura de prueba correctamente.",
      });

    } catch (error) {
      console.error('Error sending test invoice:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la factura de prueba.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Gestión de Facturas</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <Send className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Facturas Enviadas</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Este Mes</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <Eye className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <Download className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Acciones Rápidas</h3>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={sendTestInvoice}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>{loading ? 'Enviando...' : 'Enviar Factura de Prueba'}</span>
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📧 Sistema Automático de Facturas</h4>
            <p className="text-sm text-blue-800 mb-3">
              Las facturas se envían automáticamente cuando se confirma una reserva de masaje. 
              Cada factura incluye:
            </p>
            <ul className="text-sm text-blue-800 space-y-1 ml-4">
              <li>• Logo personalizado de The Nook Madrid</li>
              <li>• Detalles completos de la reserva</li>
              <li>• Información de contacto del centro</li>
              <li>• Políticas de cancelación y modificación</li>
              <li>• Instrucciones de preparación</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceManagement;