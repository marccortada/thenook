-- First, let's see the current enum values for payment_status and booking_status
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('payment_status', 'booking_status')
ORDER BY t.typname, e.enumsortorder;