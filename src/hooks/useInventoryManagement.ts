import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category_id?: string;
  supplier_id?: string;
  unit_type: string;
  current_stock: number;
  min_stock: number;
  max_stock?: number;
  unit_cost?: number;
  selling_price?: number;
  location?: string;
  expiry_date?: string;
  is_active: boolean;
  center_id?: string;
  created_at: string;
  updated_at: string;
  category?: InventoryCategory;
  supplier?: Supplier;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reason: 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'expired' | 'damaged' | 'service_use';
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  performed_by?: string;
  created_at: string;
  item?: InventoryItem;
  performer?: any;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  status: 'draft' | 'sent' | 'received' | 'partial' | 'cancelled';
  order_date: string;
  expected_date?: string;
  received_date?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  center_id?: string;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
  item?: InventoryItem;
}

export interface LowStockAlert {
  id: string;
  item_id: string;
  alert_level: 'low' | 'critical' | 'out_of_stock';
  notified_at?: string;
  resolved_at?: string;
  created_at: string;
  item?: InventoryItem;
}

export const useInventoryManagement = () => {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching categories';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching suppliers';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Fetch inventory items
  const fetchItems = async (centerId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('inventory_items')
        .select(`
          *,
          category:inventory_categories(*),
          supplier:suppliers(*)
        `)
        .order('name');

      if (centerId) {
        query = query.eq('center_id', centerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching items';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch inventory movements
  const fetchMovements = async (itemId?: string, limit = 100) => {
    try {
      let query = supabase
        .from('inventory_movements')
        .select(`
          *,
          item:inventory_items(name, sku),
          performer:profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMovements((data || []) as InventoryMovement[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching movements';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          items:purchase_order_items(*, item:inventory_items(name, sku))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchaseOrders((data || []) as PurchaseOrder[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching purchase orders';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Fetch low stock alerts
  const fetchLowStockAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('low_stock_alerts')
        .select(`
          *,
          item:inventory_items(*, category:inventory_categories(*))
        `)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLowStockAlerts((data || []) as LowStockAlert[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching alerts';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Create inventory item
  const createItem = async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([item])
        .select()
        .single();

      if (error) throw error;

      await fetchItems();
      toast({
        title: "Producto creado",
        description: "El producto se ha creado exitosamente",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating item';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Update inventory item
  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchItems();
      toast({
        title: "Producto actualizado",
        description: "El producto se ha actualizado exitosamente",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating item';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Create inventory movement
  const createMovement = async (movement: Omit<InventoryMovement, 'id' | 'created_at'>) => {
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      const { data, error } = await supabase
        .from('inventory_movements')
        .insert([{ ...movement, performed_by: profile.id }])
        .select()
        .single();

      if (error) throw error;

      await fetchItems();
      await fetchMovements();
      toast({
        title: "Movimiento registrado",
        description: "El movimiento de inventario se ha registrado exitosamente",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating movement';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Create purchase order
  const createPurchaseOrder = async (order: Omit<PurchaseOrder, 'id' | 'order_number' | 'created_at' | 'updated_at'>) => {
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Generate order number
      const { data: orderNumber } = await supabase.rpc('generate_po_number');

      const { data, error } = await supabase
        .from('purchase_orders')
        .insert([{ 
          ...order, 
          order_number: orderNumber,
          created_by: profile.id 
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchPurchaseOrders();
      toast({
        title: "Orden de compra creada",
        description: `Orden ${orderNumber} creada exitosamente`,
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating purchase order';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Add item to purchase order
  const addItemToPurchaseOrder = async (purchaseOrderId: string, item: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .insert([{ ...item, purchase_order_id: purchaseOrderId }])
        .select()
        .single();

      if (error) throw error;

      await fetchPurchaseOrders();
      toast({
        title: "Producto agregado",
        description: "El producto se ha agregado a la orden de compra",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error adding item to purchase order';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Receive purchase order items
  const receivePurchaseOrderItems = async (purchaseOrderId: string, items: { id: string; quantity_received: number }[]) => {
    try {
      // Update purchase order items
      for (const item of items) {
        await supabase
          .from('purchase_order_items')
          .update({ quantity_received: item.quantity_received })
          .eq('id', item.id);
      }

      // Create inventory movements for received items
      const { data: poItems } = await supabase
        .from('purchase_order_items')
        .select('*, item:inventory_items(*)')
        .eq('purchase_order_id', purchaseOrderId)
        .in('id', items.map(i => i.id));

      if (poItems) {
        for (const poItem of poItems) {
          const receivedItem = items.find(i => i.id === poItem.id);
          if (receivedItem && receivedItem.quantity_received > 0) {
            await createMovement({
              item_id: poItem.item_id,
              movement_type: 'in',
              quantity: receivedItem.quantity_received,
              unit_cost: poItem.unit_cost,
              total_cost: receivedItem.quantity_received * poItem.unit_cost,
              reason: 'purchase',
              reference_id: purchaseOrderId,
              reference_type: 'purchase_order',
              notes: `Recepción de orden ${purchaseOrderId}`
            });
          }
        }
      }

      await fetchPurchaseOrders();
      toast({
        title: "Productos recibidos",
        description: "Los productos se han recibido y el inventario se ha actualizado",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error receiving items';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Resolve low stock alert
  const resolveLowStockAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('low_stock_alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      await fetchLowStockAlerts();
      toast({
        title: "Alerta resuelta",
        description: "La alerta de stock bajo se ha marcado como resuelta",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error resolving alert';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Get inventory stats
  const getInventoryStats = async () => {
    try {
      const { data: items } = await supabase
        .from('inventory_items')
        .select('current_stock, min_stock, unit_cost, selling_price');

      if (!items) return null;

      const totalItems = items.length;
      const lowStockItems = items.filter(item => item.current_stock <= item.min_stock).length;
      const totalValue = items.reduce((sum, item) => sum + (item.current_stock * (item.unit_cost || 0)), 0);
      const averageStock = items.reduce((sum, item) => sum + item.current_stock, 0) / totalItems;

      return {
        totalItems,
        lowStockItems,
        totalValue,
        averageStock,
        stockPercentage: totalItems > 0 ? ((totalItems - lowStockItems) / totalItems) * 100 : 0
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching stats';
      setError(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
    fetchItems();
    fetchMovements();
    fetchPurchaseOrders();
    fetchLowStockAlerts();
  }, []);

  return {
    categories,
    suppliers,
    items,
    movements,
    purchaseOrders,
    lowStockAlerts,
    loading,
    error,
    fetchCategories,
    fetchSuppliers,
    fetchItems,
    fetchMovements,
    fetchPurchaseOrders,
    fetchLowStockAlerts,
    createItem,
    updateItem,
    createMovement,
    createPurchaseOrder,
    addItemToPurchaseOrder,
    receivePurchaseOrderItems,
    resolveLowStockAlert,
    getInventoryStats,
  };
};