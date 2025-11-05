import { supabase } from '@/integrations/supabase/client';

export interface ChargeResult {
  ok: boolean;
  status?: string;
  payment_intent?: string;
  error?: string;
  requires_action?: boolean;
}

const inFlight = new Set<string>();

export async function chargeBooking(bookingId: string): Promise<ChargeResult> {
  if (!bookingId) return { ok: false, error: 'bookingId requerido' };
  if (inFlight.has(bookingId)) return { ok: false, error: 'Cobro ya en curso' };

  const idempotencyKey = crypto?.randomUUID ? crypto.randomUUID() : `${bookingId}-${Date.now()}`;
  inFlight.add(bookingId);
  console.info('[chargeBooking] start', { bookingId, idempotencyKey });
  try {
    // Try Supabase Edge Function first
    try {
      const { data, error } = await (supabase as any).functions.invoke('charge-booking', {
        body: { booking_id: bookingId }
      });
      if (error) return { ok: false, error: error.message };
      const status = data?.status || data?.paymentIntent?.status;
      const ok = data?.ok === true && status === 'succeeded';
      return { ok, status, payment_intent: data?.payment_intent || data?.paymentIntent?.id, error: data?.error, requires_action: !!data?.requires_action };
    } catch (_) {}

    // Fallback to direct URL if configured
    const url = (import.meta as any)?.env?.VITE_EDGE_CHARGE_URL as string | undefined;
    if (!url) return { ok: false, error: 'No se pudo invocar el endpoint de cobro' };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ booking_id: bookingId }),
      credentials: 'include'
    });
    const json = await resp.json().catch(() => ({}));
    const status = json?.status || json?.paymentIntent?.status;
    const ok = json?.ok === true && status === 'succeeded';
    return { ok, status, payment_intent: json?.payment_intent || json?.paymentIntent?.id, error: json?.error, requires_action: !!json?.requires_action };
  } finally {
    inFlight.delete(bookingId);
    console.info('[chargeBooking] end', { bookingId });
  }
}
