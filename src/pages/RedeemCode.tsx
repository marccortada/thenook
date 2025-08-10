import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function RedeemCode() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    document.title = "Canjear código | The Nook Madrid";
  }, []);

  const redeemPackage = async () => {
    if (!code) return;
    try {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc('redeem_voucher_code', {
        p_code: code.trim(),
        p_booking_id: bookingId || null,
        p_amount_cents: null,
        p_notes: notes || null
      });
      if (error) throw error;
      toast({ title: 'Canjeado', description: 'Sesión descontada del bono' });
      setCode(""); setAmount(undefined); setNotes("");
    } catch (e:any) {
      toast({ title: 'Error', description: e.message || 'No se pudo canjear', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const redeemGiftCard = async () => {
    if (!code || !amount || amount <= 0) {
      toast({ title: 'Falta importe', description: 'Introduce un importe en céntimos (>0)', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc('redeem_voucher_code', {
        p_code: code.trim(),
        p_booking_id: bookingId || null,
        p_amount_cents: amount,
        p_notes: notes || null
      });
      if (error) throw error;
      toast({ title: 'Canjeado', description: 'Saldo descontado de la tarjeta' });
      setCode(""); setAmount(undefined); setNotes("");
    } catch (e:any) {
      toast({ title: 'Error', description: e.message || 'No se pudo canjear', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Canjear código</h1>
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
              <div className="text-sm mb-2 font-semibold">Canje de tarjeta regalo (saldo)</div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium">Importe (céntimos)</label>
                  <Input type="number" value={amount ?? ''} onChange={(e) => setAmount(parseInt(e.target.value || '0', 10))} placeholder="Ej. 5000 (50,00€)" />
                </div>
                <Button onClick={redeemGiftCard} disabled={loading}>Canjear saldo</Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Para bonos de sesiones usa el botón de la derecha.</div>
              <Button onClick={redeemPackage} disabled={loading} variant="secondary">Canjear 1 sesión</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
