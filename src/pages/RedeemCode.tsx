import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
export default function RedeemCode() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    document.title = "Canjear código | The Nook Madrid";
  }, []);

  const handleRedeem = async () => {
    if (!code) {
      toast({ title: 'Falta código', description: 'Introduce el código a canjear', variant: 'destructive' });
      return;
    }
    if (amount !== undefined && amount < 0) {
      toast({ title: 'Importe inválido', description: 'El importe debe ser mayor o igual a 0', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc('redeem_voucher_code', {
        p_code: code.trim(),
        p_booking_id: bookingId || null,
        p_amount_cents: amount && amount > 0 ? amount : null,
        p_notes: notes || null
      });
      if (error) throw error;
      const kind = data?.kind || ((amount && amount > 0) ? 'gift_card' : 'package');
      toast({ title: 'Canjeado', description: kind === 'gift_card' ? 'Saldo descontado de la tarjeta' : 'Sesión descontada del bono' });

      if (kind === 'package' && data?.client_package_id) {
        try {
          await supabase.functions.invoke('send-voucher-remaining', {
            body: { client_package_id: data.client_package_id },
          });
        } catch (notifyErr) {
          console.warn('No se pudo notificar al cliente:', notifyErr);
        }
      }

      setCode(""); setAmount(undefined); setNotes("");
    } catch (e:any) {
      toast({ title: 'Error', description: e.message || 'No se pudo canjear', variant: 'destructive' });
    } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Canjear Código - The Nook Madrid
          </h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Canjear código</h1>
          <Button variant="outline" onClick={() => navigate('/panel-gestion-nook-madrid-2024')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Salir
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Introduce el código del bono o tarjeta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Código</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD1234" />
            </div>
            <div>
              <label className="text-sm font-medium">Reserva (opcional, UUID)</label>
              <Input value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="UUID de la reserva" />
            </div>
            <div>
              <label className="text-sm font-medium">Notas (opcional)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones del canje" />
            </div>
            <div className="border-t pt-4">
              <div className="text-sm mb-2 font-semibold">Importe (solo si es tarjeta regalo)</div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium">Importe (céntimos)</label>
                  <Input type="number" value={amount ?? ''} onChange={(e) => setAmount(e.target.value === '' ? undefined : parseInt(e.target.value || '0', 10))} placeholder="Ej. 5000 (50,00€)" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Solo introduce el código. Detectamos automáticamente si es bono o tarjeta.</div>
              <Button onClick={handleRedeem} disabled={loading}>Canjear</Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  );
}
