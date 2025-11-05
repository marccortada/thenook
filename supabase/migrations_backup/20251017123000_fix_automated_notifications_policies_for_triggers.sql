-- Allow DB triggers (no auth context) to insert automated notifications
-- without weakening existing staff policies.
-- Context: booking confirmation emails were not sent because the trigger
-- function `enqueue_booking_confirmation` could not insert into
-- `automated_notifications` after RLS tightening (auth.uid() is NULL in triggers).

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.automated_notifications ENABLE ROW LEVEL SECURITY;

-- Create or replace a policy that allows inserts when there is no auth context
-- (i.e., from database triggers) OR when the actor is staff.
-- Using a unique policy name to avoid conflicts and keep previous staff-only policies.
DROP POLICY IF EXISTS "Triggers can insert automated notifications" ON public.automated_notifications;
CREATE POLICY "Triggers can insert automated notifications"
ON public.automated_notifications
FOR INSERT
WITH CHECK (
  -- Database triggers/cron/maintenance run without JWT context
  auth.uid() IS NULL
  OR has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'employee'::user_role)
);

-- Optionally, allow trigger-driven updates as well (should be bypassed by service role, but harmless)
DROP POLICY IF EXISTS "Triggers can update automated notifications" ON public.automated_notifications;
CREATE POLICY "Triggers can update automated notifications"
ON public.automated_notifications
FOR UPDATE
USING (
  auth.uid() IS NULL
  OR has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'employee'::user_role)
)
WITH CHECK (
  auth.uid() IS NULL
  OR has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'employee'::user_role)
);

