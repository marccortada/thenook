Stripe – Autorización manual + guardado de tarjeta

Variables de entorno (Supabase → Settings → Secrets)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET (de Stripe CLI o del endpoint en el Dashboard)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- (opcional) RESEND_API_KEY

Migración
- Archivo: supabase/migrations/20251028120000_reservas_stripe_schema.sql (tablas clientes, reservas, logs_pagos)

Funciones Edge
- stripe-webhook-reservas: procesa eventos Stripe y sincroniza reservas/logs
- capture-payment: endpoint Admin para capturar total o parcial

Config (supabase/config.toml)
- Añadidas secciones para ambas funciones con verify_jwt=false

Crear PaymentIntent (≤7 días) con retención manual y guardado de tarjeta

const pi = await stripe.paymentIntents.create({
  amount: importe_total,          // céntimos
  currency: 'eur',
  customer: stripe_customer_id,   // de la tabla clientes
  payment_method: payment_method_id, // del Payment Element
  capture_method: 'manual',
  confirm: true,
  setup_future_usage: 'off_session', // guarda tarjeta para cargos futuros
  metadata: { reserva_id }
}, { idempotencyKey: `reserva-${reserva_id}-${importe_total}` });
// Persistir pi.id en reservas.stripe_payment_intent_id

Para reservas >7–30 días
- Usa SetupIntent para guardar la tarjeta y crear PI el día de la cita (flag de “extended authorizations”).

Confirmación en el front (Payment Element)

stripe.confirmPayment({
  elements,
  redirect: 'if_required',
  confirmParams: {
    payment_method_data: { billing_details: { email: userEmail } }
  }
});

Capturar (Admin)
POST supabase.functions.invoke('capture-payment', { body: { reserva_id, amount_to_capture }})
- amount_to_capture en céntimos, opcional (omitido = total)
- Actualiza reservas.estado_reserva a capturado_total o capturado_parcial

Probar con Stripe CLI
1) stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook-reservas \
   --events payment_intent.amount_capturable_updated,payment_intent.succeeded,payment_intent.canceled,payment_method.attached
2) Caso 1: crear PI con capture_method=manual → ver estado 'retenido' y amount_capturable
3) Caso 2: capturar parcial (amount_to_capture < importe_total) → 'capturado_parcial'
4) Caso 3: capturar total → 'capturado_total'
5) Caso 4: cancelar PI → 'cancelado'

Notas
- No se guardan PAN; solo IDs de Stripe (customer, payment_method, payment_intent)
- setup_future_usage='off_session' + capture_method='manual' asegura que se guarde la tarjeta y permite capturar más tarde sin fricción.
- Si expira la retención (7 días tarjetas UE típicamente), usar el payment_method guardado para crear un nuevo PaymentIntent off_session.

