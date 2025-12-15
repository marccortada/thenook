import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Check, X } from "lucide-react";

export default function PaymentSetupSuccess() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [centerData, setCenterData] = useState({
    name: 'The Nook Madrid',
    phone: '911 481 474',
    email: 'reservas@thenookmadrid.com',
    address: 'Calle Zurbarán 10 bajo derecha, Madrid 28010'
  });
  const [bookingCenter, setBookingCenter] = useState<{ name?: string; address?: string } | null>(null);

  // Stripe pasa el session_id en la URL, necesitamos obtener el setup_intent desde la sesión
  const sessionId = searchParams.get('session_id');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    console.log('[PaymentSetupSuccess] Component mounted/updated');
    console.log('[PaymentSetupSuccess] sessionId:', sessionId);
    console.log('[PaymentSetupSuccess] errorParam:', errorParam);
    console.log('[PaymentSetupSuccess] errorDescription:', errorDescription);
    console.log('[PaymentSetupSuccess] all search params:', Object.fromEntries(searchParams.entries()));
    
    // Si hay un parámetro de error en la URL, mostrar error directamente
    if (errorParam || errorDescription) {
      console.log('[PaymentSetupSuccess] Error detected in URL, showing error message');
      setLoading(false);
      setSuccess(false);
      const errorMsg = errorDescription || errorParam || 'Hubo un error al procesar tu tarjeta. Por favor, intenta de nuevo o contáctanos.';
      setErrorMessage(errorMsg);
      loadCenterData();
      return;
    }
    
    if (sessionId) {
      console.log('[PaymentSetupSuccess] sessionId found, calling confirmPaymentMethod');
      confirmPaymentMethod();
    } else {
      console.log('[PaymentSetupSuccess] No sessionId found in URL');
      // Si no hay session_id en la URL, mostrar error
      setLoading(false);
      setSuccess(false);
      setErrorMessage('No se encontró información de la sesión en la URL. Si cancelaste el proceso, puedes intentar de nuevo. Si el problema persiste, por favor contáctanos.');
      loadCenterData();
    }
  }, [sessionId, errorParam, errorDescription]);

  const fetchBookingCenter = async (intentId: string) => {
    try {
      const { data: intentRow, error: intentErr } = await (supabase as any)
        .from('booking_payment_intents')
        .select('booking_id')
        .eq('stripe_setup_intent_id', intentId)
        .maybeSingle();
      if (intentErr || !intentRow?.booking_id) {
        // Si no hay reserva, cargar centro por defecto
        loadCenterData();
        return;
      }

      const { data: booking, error: bookErr } = await (supabase as any)
        .from('bookings')
        .select('centers(name, address_zurbaran, address_concha_espina), center_id')
        .eq('id', intentRow.booking_id)
        .maybeSingle();
      if (bookErr || !booking) {
        // Si no hay reserva, cargar centro por defecto
        loadCenterData();
        return;
      }

      // Usar el centro de la reserva
      if (booking.center_id) {
        await loadCenterData(booking.center_id);
      }

      const c = booking.centers;
      const isZurbaran = (c?.name || '').toLowerCase().includes('zurbar');
      const address = isZurbaran ? (c?.address_zurbaran || '') : (c?.address_concha_espina || '');
      setBookingCenter({ name: c?.name, address });
      // Si tenemos dirección desde la reserva, sobreescribir centerData visible
      if (address) {
        setCenterData((prev) => ({ ...prev, name: c?.name || prev.name, address }));
      }
    } catch (e) {
      // Si hay error, cargar centro por defecto
      loadCenterData();
    }
  };

  const loadCenterData = async (centerId?: string) => {
    try {
      let query = supabase
        .from('centers')
        .select('name, address, phone, email')
        .eq('active', true);

      // Si hay un center_id específico, usarlo; si no, usar el primero
      if (centerId) {
        query = query.eq('id', centerId);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) {
        console.error('Error loading center data:', error);
        return;
      }

      if (data) {
        setCenterData({
          name: data.name || 'The Nook Madrid',
          phone: data.phone || '911 481 474',
          email: data.email || 'reservas@thenookmadrid.com',
          address: data.address || 'Calle Zurbarán 10 bajo derecha, Madrid 28010'
        });
      }
    } catch (error) {
      console.error('Error loading center data:', error);
    }
  };

  const confirmPaymentMethod = async () => {
    try {
      console.log('[confirmPaymentMethod] Starting...');
      console.log('[confirmPaymentMethod] sessionId:', sessionId);
      
      if (!sessionId) {
        console.error('[confirmPaymentMethod] No sessionId provided');
        setSuccess(false);
        setErrorMessage('No se encontró el identificador de la sesión en la URL.');
        setLoading(false);
        return;
      }

      let data: any = null;
      let error: any = null;

      try {
        console.log('[confirmPaymentMethod] Invoking confirm-payment-method function...');
        console.log('[confirmPaymentMethod] Request body:', { session_id: sessionId });
        
        // Pasar session_id directamente, la función lo manejará
        const result = await supabase.functions.invoke('confirm-payment-method', {
          body: { session_id: sessionId }
        });
        
        data = result.data;
        error = result.error;
        
        console.log('[confirmPaymentMethod] Function response received');
        console.log('[confirmPaymentMethod] Response data:', JSON.stringify(data, null, 2));
        console.log('[confirmPaymentMethod] Response error:', JSON.stringify(error, null, 2));
      } catch (invokeError: any) {
        console.error('Exception invoking confirm-payment-method:', invokeError);
        console.error('Error details:', {
          message: invokeError.message,
          context: invokeError.context,
          stack: invokeError.stack,
          name: invokeError.name
        });
        
        // Try to extract error message from various possible locations
        let errorMsg = 'Error al confirmar el método de pago. Por favor, intenta de nuevo.';
        
        // Try to get error from context
        if (invokeError?.context) {
          // Try to parse error from context.body
          if (invokeError.context.body) {
            try {
              const parsed = typeof invokeError.context.body === 'string' 
                ? JSON.parse(invokeError.context.body) 
                : invokeError.context.body;
              if (parsed?.error) {
                errorMsg = typeof parsed.error === 'string' ? parsed.error : parsed.error.message || errorMsg;
              } else if (parsed?.message) {
                errorMsg = parsed.message;
              }
            } catch {
              // If parsing fails, try to use the body as string
              if (typeof invokeError.context.body === 'string' && invokeError.context.body.length < 500) {
                errorMsg = invokeError.context.body;
              }
            }
          }
          
          // Try to get error from context.data
          if (invokeError.context.data) {
            try {
              const parsed = typeof invokeError.context.data === 'string' 
                ? JSON.parse(invokeError.context.data) 
                : invokeError.context.data;
              if (parsed?.error) {
                errorMsg = typeof parsed.error === 'string' ? parsed.error : parsed.error.message || errorMsg;
              }
            } catch {
              // Ignore
            }
          }
        }
        
        // Try to get error from message
        if (invokeError?.message && errorMsg === 'Error al confirmar el método de pago. Por favor, intenta de nuevo.') {
          errorMsg = invokeError.message;
        }
        
        error = { message: errorMsg };
      }

      if (error) {
        console.error('Error from confirm-payment-method:', error);
        let errorMsg = 'Error al confirmar el método de pago. Por favor, intenta de nuevo.';
        if (error.message) {
          errorMsg = error.message;
        } else if (error.error) {
          errorMsg = typeof error.error === 'string' ? error.error : error.error.message || errorMsg;
        } else if (typeof error === 'string') {
          errorMsg = error;
        }
        setSuccess(false);
        setErrorMessage(errorMsg);
        setLoading(false);
        return;
      }

      // Verificar que se haya guardado correctamente
      // Si hay payment_method_id, significa que la tarjeta se guardó, incluso si el status no es 'succeeded' todavía
      console.log('[confirmPaymentMethod] Checking response:', {
        success: data?.success,
        status: data?.status,
        payment_method_id: data?.payment_method_id,
        error: data?.error
      });
      
      if (data?.success && (data?.status === 'succeeded' || data?.payment_method_id)) {
        console.log('[confirmPaymentMethod] SUCCESS - Payment method confirmed');
        setSuccess(true);
        
        // Verificar en la base de datos que realmente se guardó
        try {
          const { data: bookingCheck } = await supabase
            .from('bookings')
            .select('id, stripe_payment_method_id, payment_method_status')
            .eq('id', data?.booking_id || '')
            .single();
          
          console.log('[confirmPaymentMethod] Database verification:', bookingCheck);
          
          if (bookingCheck?.stripe_payment_method_id) {
            console.log('[confirmPaymentMethod] Confirmed: Payment method saved in database');
          } else {
            console.warn('[confirmPaymentMethod] WARNING: Payment method not found in database yet');
          }
        } catch (verifyError) {
          console.error('[confirmPaymentMethod] Error verifying in database:', verifyError);
        }
      } else {
        console.error('[confirmPaymentMethod] FAILED - Response indicates failure:', data);
        setSuccess(false);
        setErrorMessage(data?.error || 'La tarjeta no se pudo guardar correctamente. Por favor, intenta de nuevo.');
      }
    } catch (error: any) {
      console.error('Error confirming payment method:', error);
      setSuccess(false);
      setErrorMessage(error?.message || "Error al confirmar el método de pago. Por favor, intenta de nuevo.");
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
            <p className="text-center mt-4 text-muted-foreground">Verificando tarjeta...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
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
        </div>

        {/* Result Card */}
        {success === true ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">
                  Tarjeta guardada correctamente
                </h2>
                <p className="text-green-700 mb-6">
                  Tu tarjeta ha sido registrada con éxito. El administrador realizará el cobro posteriormente.
                </p>
                <Button 
                  onClick={() => window.location.href = 'https://thenook.gnerai.com'}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  Ir a la página de reservas
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : success === false ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <X className="h-10 w-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-red-800 mb-2">
                  Error al guardar la tarjeta
                </h2>
                <div className="text-red-700 mb-6 space-y-3">
                  <p className="font-medium">
                    {errorMessage || 'No se pudo guardar la tarjeta. Por favor, intenta de nuevo.'}
                  </p>
                  <div className="bg-white/50 rounded-lg p-4 mt-4">
                    <p className="text-sm font-semibold text-red-900 mb-2">¿Necesitas ayuda?</p>
                    <p className="text-sm text-red-800 mb-3">
                      Si el problema persiste, por favor contáctanos y te ayudaremos a resolverlo:
                    </p>
                    <div className="text-sm text-red-800 space-y-1">
                      <p>
                        <strong>📧 Email:</strong>{' '}
                        <a href="mailto:reservas@thenookmadrid.com" className="underline hover:text-red-900">
                          reservas@thenookmadrid.com
                        </a>
                      </p>
                      <p>
                        <strong>📞 Teléfono:</strong>{' '}
                        <a href="tel:911481474" className="underline hover:text-red-900">
                          911 481 474
                        </a>
                      </p>
                      <p>
                        <strong>💬 WhatsApp:</strong>{' '}
                        <a href="https://wa.me/34622360922" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-900">
                          +34 622 360 922
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button 
                    onClick={() => window.location.href = 'https://www.thenookmadrid.com/'}
                    className="w-full h-12 text-lg"
                    size="lg"
                    variant="outline"
                  >
                    Ir a la página de inicio
                  </Button>
                  <Button 
                    onClick={() => {
                      const bookingId = searchParams.get('booking_id');
                      if (bookingId) {
                        window.location.href = `/asegurar-reserva?booking_id=${bookingId}`;
                      } else {
                        window.location.href = 'https://www.thenookmadrid.com/';
                      }
                    }}
                    className="w-full h-12 text-lg"
                    size="lg"
                  >
                    Intentar de nuevo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Contact Info */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="text-center text-sm">
              <p className="font-medium mb-2">¿Necesitas ayuda?</p>
              <p className="text-muted-foreground">
                📧 {centerData.email}<br />
                📞 {centerData.phone}<br />
                📍 {bookingCenter?.address || centerData.address}
              </p>
              <p className="text-xs border-t pt-2 mt-3">© THE NOOK Madrid 2025 · Todos los derechos reservados</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
