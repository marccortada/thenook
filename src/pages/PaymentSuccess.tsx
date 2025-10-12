import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const [search] = useSearchParams();
  const sessionId = search.get("session_id");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    document.title = "Pago realizado | The Nook Madrid";
    if (!sessionId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });
        if (error) throw error;
        setResult(data);
        if (data?.paid) toast.success("Pago verificado correctamente");
        else toast.error("El pago no está confirmado todavía");
      } catch (e: any) {
        toast.error(e.message || "Error al verificar el pago");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  return (
    <main className="container mx-auto px-4 py-10">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Pago realizado</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Verificando tu pago...</p>
          ) : (
            <div className="space-y-3">
              {result?.paid ? (
                <>
                  <p className="text-sm text-muted-foreground">¡Gracias! Tu pago se ha completado correctamente.</p>
                  {result?.intent === "gift_cards" && (
                    <>
                      <p className="text-sm font-medium">Se han generado {result?.gift_cards?.length || 0} tarjeta(s) de regalo.</p>
                      <p className="text-sm text-muted-foreground">Recibirás un email con los detalles y códigos de tus tarjetas regalo.</p>
                    </>
                  )}
                  {result?.intent === "package_voucher" && (
                    <>
                      <p className="text-sm font-medium">Se han generado {result?.vouchers?.length || 0} bono(s).</p>
                      <p className="text-sm text-muted-foreground">Recibirás un email con los detalles y códigos de tus bonos.</p>
                    </>
                  )}
                  {result?.intent === "booking_payment" && (
                    <p className="text-sm text-muted-foreground">Tu reserva ha sido confirmada. Recibirás un email de confirmación.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No hemos podido confirmar tu pago.</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button asChild><Link to="/">Volver al inicio</Link></Button>
                <Button variant="outline" asChild><Link to="/tarjetas-regalo">Tarjetas de regalo</Link></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default PaymentSuccess;
