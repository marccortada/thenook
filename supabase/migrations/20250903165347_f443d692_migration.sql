-- Add discount fields to packages table if they don't exist
DO $$ 
BEGIN
    -- Check if has_discount column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'packages' 
                   AND column_name = 'has_discount' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.packages ADD COLUMN has_discount BOOLEAN DEFAULT false;
    END IF;
    
    -- Check if discount_price_cents column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'packages' 
                   AND column_name = 'discount_price_cents' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.packages ADD COLUMN discount_price_cents INTEGER DEFAULT 0;
    END IF;
END $$;