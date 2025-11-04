import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export type MessageKind = 'reminder' | 'followup' | 'upsell';

export interface MessageContext {
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  centerName?: string | null;
  centerAddress?: string | null;
  serviceName?: string | null;
  bookingDate?: Date;
  paymentUrl?: string | null;
  bookingManageUrl?: string | null;
}

export const buildMapUrl = (address?: string | null) =>
  address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : '';

export function buildMessage(kind: MessageKind, ctx: MessageContext, lang: 'es' | 'en' = 'es') {
  const date = ctx.bookingDate ? format(ctx.bookingDate, "d 'de' MMMM yyyy", { locale: es }) : '';
  const hour = ctx.bookingDate ? format(ctx.bookingDate, 'HH:mm', { locale: es }) : '';
  const name = ctx.clientName || '';
  const service = ctx.serviceName || 'tu tratamiento';
  const center = ctx.centerName || 'The Nook Madrid';
  const address = ctx.centerAddress || '';
  const mapLink = buildMapUrl(address);
  const pay = ctx.paymentUrl || '';
  const manage = ctx.bookingManageUrl || '';

  if (lang === 'en') {
    switch (kind) {
      case 'reminder':
        return `Hi ${name || 'there'}, this is a reminder of your ${service} on ${date} at ${hour} in ${center}${address ? ` (${address})` : ''}. ${mapLink ? `Location: ${mapLink}. ` : ''}${pay ? `If pending, you can pay here: ${pay}. ` : ''}${manage ? `Manage your booking: ${manage}. ` : ''}See you soon!`;
      case 'followup':
        return `Hi ${name || 'there'}, thanks for your visit for ${service} on ${date}. How did you feel? Your feedback helps us improve. ${manage ? `Book your next session: ${manage}` : ''}`;
      default:
        return `Hi ${name || 'there'}, since you enjoyed ${service}, we recommend our vouchers/gift cards for your next visits. ${manage ? `Book here: ${manage}. ` : ''}If you prefer, ask us for the best option for you.`;
    }
  }

  // Spanish (default)
  switch (kind) {
    case 'reminder':
      return `Hola ${name || ''}, te recordamos tu cita de ${service} el ${date} a las ${hour} en ${center}${address ? ` (${address})` : ''}. ${mapLink ? `Ubicación: ${mapLink}. ` : ''}${pay ? `Si está pendiente, puedes pagar aquí: ${pay}. ` : ''}${manage ? `Gestiona tu cita: ${manage}. ` : ''}¡Te esperamos!`;
    case 'followup':
      return `Hola ${name || ''}, gracias por tu visita de ${service} el ${date}. ¿Cómo te sentiste? Tu opinión nos ayuda mucho. ${manage ? `Puedes reservar la próxima sesión aquí: ${manage}` : ''}`;
    default:
      return `Hola ${name || ''}, por ser cliente habitual de ${service}, te dejamos una opción de bono/tarjeta regalo para tus próximas visitas. ${manage ? `Reserva aquí: ${manage}. ` : ''}Si lo prefieres, consúltanos y te aconsejamos.`;
  }
}

export function buildWhatsAppUrl(phone: string, text: string) {
  const normalized = phone.replace(/[^0-9+]/g, '');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function buildMailtoUrl(email: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

