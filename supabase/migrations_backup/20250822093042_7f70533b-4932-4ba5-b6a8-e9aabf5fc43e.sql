-- Eliminar el campo expiry_date de client_packages ya que los bonos no caducan
ALTER TABLE public.client_packages DROP COLUMN IF EXISTS expiry_date;

-- Eliminar la función de expiración de paquetes ya que no es necesaria
DROP FUNCTION IF EXISTS public.get_expiring_packages(integer);

-- Eliminar la función de notificaciones de expiración ya que no es necesaria  
DROP FUNCTION IF EXISTS public.create_package_expiry_notifications();