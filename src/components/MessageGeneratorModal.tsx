import { useEffect, useMemo, useState } from 'react';
import AppModal from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { buildMailtoUrl, buildMessage, buildWhatsAppUrl, MessageContext, MessageKind } from '@/lib/messageTemplates';

type Props = {
  open: boolean;
  onClose: () => void;
  ctx: MessageContext & { bookingId?: string; totalPriceCents?: number };
};

export default function MessageGeneratorModal({ open, onClose, ctx }: Props) {
  const { toast } = useToast();
  const [kind, setKind] = useState<MessageKind>('reminder');
  const [lang, setLang] = useState<'es' | 'en'>(() => (navigator?.language?.startsWith('en') ? 'en' : 'es'));
  const [includePayment, setIncludePayment] = useState(false);
  const [includeMap, setIncludeMap] = useState(true);
  const [improve, setImprove] = useState<boolean>(() => localStorage.getItem('nook_ai_messages_enabled') === '1');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(ctx.paymentUrl || null);

  // Compose message base
  const baseMessage = useMemo(() => {
    const buildCtx: MessageContext = {
      ...ctx,
      paymentUrl: includePayment ? paymentUrl : null,
      centerAddress: includeMap ? ctx.centerAddress : null,
    };
    return buildMessage(kind, buildCtx, lang);
  }, [kind, lang, includePayment, includeMap, paymentUrl, ctx]);

  useEffect(() => { setText(baseMessage); }, [baseMessage]);

  const requestPaymentLink = async () => {
    try {
      setLoading(true);
      const amount = ctx.totalPriceCents && ctx.totalPriceCents > 0 ? ctx.totalPriceCents : 0;
      const { data, error } = await (supabase as any).functions.invoke('create-checkout', {
        body: { intent: 'booking_payment', booking_payment: { booking_id: ctx.bookingId, amount_cents: amount }, currency: 'eur' }
      });
      const checkoutUrl: string | null = data?.url || (data?.client_secret ? `https://checkout.stripe.com/c/pay/${data.client_secret}` : null);
      if (error || !checkoutUrl) throw new Error(error?.message || 'No se pudo generar el link de pago');
      setPaymentUrl(checkoutUrl);
      setIncludePayment(true);
      toast({ title: 'Link de pago generado', description: checkoutUrl });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo generar el link', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const improveWithAI = async () => {
    if (!improve) return;
    try {
      setLoading(true);
      const { data, error } = await (supabase as any).functions.invoke('rewrite-message', {
        body: { text, tone: 'amable', language: lang }
      });
      if (error || !data?.result) throw new Error(error?.message || 'No disponible');
      setText(data.result as string);
    } catch (e: any) {
      toast({ title: 'IA no disponible', description: 'Usando plantilla estándar', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const copy = async () => { try { await navigator.clipboard.writeText(text); toast({ title: 'Copiado', description: 'Mensaje copiado al portapapeles' }); } catch {} };

  const openWhatsApp = () => {
    const phone = ctx.clientPhone || '';
    if (!phone) { toast({ title: 'Sin teléfono', description: 'No hay teléfono del cliente', variant: 'destructive' }); return; }
    const url = buildWhatsAppUrl(phone, text);
    window.open(url, '_blank');
  };

  const openEmail = () => {
    const email = ctx.clientEmail || '';
    if (!email) { toast({ title: 'Sin email', description: 'No hay email del cliente', variant: 'destructive' }); return; }
    const subject = kind === 'reminder' ? (lang === 'en' ? 'Appointment reminder' : 'Recordatorio de cita') :
                    kind === 'followup' ? (lang === 'en' ? 'Thanks for your visit' : 'Gracias por tu visita') :
                    (lang === 'en' ? 'Gift cards & vouchers' : 'Tarjetas regalo y bonos');
    window.open(buildMailtoUrl(email, subject, text), '_blank');
  };

  return (
    <AppModal open={open} onClose={onClose} maxWidth={640} mobileMaxWidth={380}>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Generar mensaje</h3>
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={improve} onChange={(e) => { setImprove(e.target.checked); localStorage.setItem('nook_ai_messages_enabled', e.target.checked ? '1' : '0'); }} />
              Mejorar con IA
            </label>
            <select value={lang} onChange={(e) => setLang(e.target.value as any)} className="border rounded px-2 py-1">
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
          </div>
        </div>

        <Tabs value={kind} onValueChange={(v) => setKind(v as MessageKind)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="reminder">Recordatorio</TabsTrigger>
            <TabsTrigger value="followup">Seguimiento</TabsTrigger>
            <TabsTrigger value="upsell">Upsell</TabsTrigger>
          </TabsList>
          <TabsContent value="reminder" />
          <TabsContent value="followup" />
          <TabsContent value="upsell" />
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={includeMap} onChange={(e) => setIncludeMap(e.target.checked)} /> Incluir mapa/dirección</label>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={includePayment} onChange={(e) => setIncludePayment(e.target.checked)} /> Incluir enlace de pago</label>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={requestPaymentLink} disabled={loading}>Generar link de pago</Button>
          <Button variant="outline" size="sm" onClick={improveWithAI} disabled={loading || !improve}>Mejorar texto</Button>
        </div>

        <div>
          <Label className="text-sm">Mensaje</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="mt-1" />
        </div>

        <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
          <Button variant="outline" onClick={copy}>Copiar</Button>
          <Button variant="outline" onClick={openEmail}>Abrir Email</Button>
          <Button onClick={openWhatsApp}>Abrir WhatsApp</Button>
        </div>
      </div>
    </AppModal>
  );
}

