-- Create table for inventory categories
CREATE TABLE public.inventory_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for suppliers
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for inventory items
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  unit_type VARCHAR(50) NOT NULL DEFAULT 'units', -- units, ml, gr, kg, etc
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_stock DECIMAL(10,2),
  unit_cost DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  location VARCHAR(255),
  expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for inventory movements
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('purchase', 'sale', 'adjustment', 'transfer', 'expired', 'damaged', 'service_use')),
  reference_id UUID, -- Can reference purchase orders, bookings, etc
  reference_type VARCHAR(50), -- 'purchase_order', 'booking', 'manual'
  notes TEXT,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for purchase orders
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'partial', 'cancelled')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for purchase order items
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  quantity_ordered DECIMAL(10,2) NOT NULL,
  quantity_received DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for low stock alerts
CREATE TABLE public.low_stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('low', 'critical', 'out_of_stock')),
  notified_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_categories
CREATE POLICY "Staff can view all categories" 
ON public.inventory_categories 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can manage categories" 
ON public.inventory_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create policies for suppliers
CREATE POLICY "Staff can view all suppliers" 
ON public.suppliers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can manage suppliers" 
ON public.suppliers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create policies for inventory_items
CREATE POLICY "Staff can view all inventory items" 
ON public.inventory_items 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can manage inventory items" 
ON public.inventory_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create policies for inventory_movements
CREATE POLICY "Staff can view all movements" 
ON public.inventory_movements 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can create movements" 
ON public.inventory_movements 
FOR INSERT 
WITH CHECK ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) 
  AND performed_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create policies for purchase_orders
CREATE POLICY "Staff can view all purchase orders" 
ON public.purchase_orders 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can manage purchase orders" 
ON public.purchase_orders 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create policies for purchase_order_items
CREATE POLICY "Staff can view all purchase order items" 
ON public.purchase_order_items 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can manage purchase order items" 
ON public.purchase_order_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create policies for low_stock_alerts
CREATE POLICY "Staff can view all alerts" 
ON public.low_stock_alerts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can manage alerts" 
ON public.low_stock_alerts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_categories_updated_at
  BEFORE UPDATE ON public.inventory_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update inventory stock after movement
CREATE OR REPLACE FUNCTION public.update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current stock based on movement
  IF NEW.movement_type = 'in' THEN
    UPDATE public.inventory_items 
    SET current_stock = current_stock + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE public.inventory_items 
    SET current_stock = current_stock - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE public.inventory_items 
    SET current_stock = NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  
  -- Check for low stock and create alert
  INSERT INTO public.low_stock_alerts (item_id, alert_level)
  SELECT 
    ii.id,
    CASE 
      WHEN ii.current_stock <= 0 THEN 'out_of_stock'
      WHEN ii.current_stock <= (ii.min_stock * 0.5) THEN 'critical'
      WHEN ii.current_stock <= ii.min_stock THEN 'low'
    END as alert_level
  FROM public.inventory_items ii
  WHERE ii.id = NEW.item_id 
    AND ii.current_stock <= ii.min_stock
    AND NOT EXISTS (
      SELECT 1 FROM public.low_stock_alerts 
      WHERE item_id = ii.id AND resolved_at IS NULL
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update stock after movement
CREATE TRIGGER update_stock_after_movement
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_stock();

-- Create function to generate purchase order number
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  po_number TEXT;
BEGIN
  -- Get next sequential number
  SELECT COALESCE(
    (SELECT MAX(CAST(REGEXP_REPLACE(order_number, '^PO-', '') AS INTEGER)) + 1
     FROM public.purchase_orders 
     WHERE order_number ~ '^PO-[0-9]+$'), 
    1000
  ) INTO next_number;
  
  po_number := 'PO-' || next_number;
  
  RETURN po_number;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX idx_inventory_items_category ON public.inventory_items(category_id);
CREATE INDEX idx_inventory_items_supplier ON public.inventory_items(supplier_id);
CREATE INDEX idx_inventory_items_center ON public.inventory_items(center_id);
CREATE INDEX idx_inventory_items_sku ON public.inventory_items(sku);
CREATE INDEX idx_inventory_movements_item ON public.inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_date ON public.inventory_movements(created_at);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_order_items_order ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_low_stock_alerts_item ON public.low_stock_alerts(item_id);
CREATE INDEX idx_low_stock_alerts_resolved ON public.low_stock_alerts(resolved_at);

-- Insert default categories
INSERT INTO public.inventory_categories (name, description, color) VALUES
('Productos de Cuidado', 'Cremas, aceites, productos para tratamientos', '#10B981'),
('Suministros Desechables', 'Toallas, guantes, papel, etc.', '#F59E0B'),
('Equipamiento', 'Herramientas y equipos de trabajo', '#6366F1'),
('Limpieza', 'Productos de limpieza y desinfección', '#EF4444'),
('Oficina', 'Suministros administrativos', '#8B5CF6');

-- Insert sample data
INSERT INTO public.suppliers (name, contact_person, email, phone, address) VALUES
('Distribuidora Wellness S.A.', 'María García', 'ventas@wellness.com', '+34 900 123 456', 'Calle Mayor 123, Madrid'),
('Suministros Spa Pro', 'Carlos López', 'pedidos@spapro.es', '+34 900 654 321', 'Av. Constitución 45, Barcelona'),
('EcoClean Solutions', 'Ana Martínez', 'info@ecoclean.com', '+34 900 789 012', 'Plaza España 12, Valencia');