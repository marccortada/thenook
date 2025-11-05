-- Ensure required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla de clientes (idempotente)
CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text,
  email text UNIQUE,
  telefono text,
  stripe_customer_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de reservas (idempotente)
CREATE TABLE IF NOT EXISTS public.reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  servicio_id text,
  fecha timestamptz,
  importe_total integer NOT NULL,
  importe_penalizacion integer DEFAULT 0,
  stripe_payment_intent_id text,
  stripe_setup_intent_id text,
  stripe_payment_method_id text,
  stripe_customer_id text,
  amount_capturable integer DEFAULT 0,
  estado_reserva text CHECK (estado_reserva in ('pendiente','retenido','capturado_total','capturado_parcial','cancelado')) DEFAULT 'pendiente',
  importe_capturado integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Logs de pagos (idempotente)
CREATE TABLE IF NOT EXISTS public.logs_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid REFERENCES public.reservas(id) ON DELETE CASCADE,
  evento text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Índices idempotentes
CREATE INDEX IF NOT EXISTS idx_reservas_pi ON public.reservas(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente ON public.reservas(cliente_id);

-- Updated_at trigger helper (reuse if exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reservas_updated_at'
  ) THEN
    CREATE TRIGGER trg_reservas_updated_at
    BEFORE UPDATE ON public.reservas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

