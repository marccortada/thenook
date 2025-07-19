import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Package, ShoppingCart, TrendingDown, TrendingUp, Plus, Edit, Eye, AlertCircle, Boxes, Users } from 'lucide-react';
import { useInventoryManagement } from '@/hooks/useInventoryManagement';
import { useToast } from '@/hooks/use-toast';

const InventoryManagement = () => {
  const {
    categories,
    suppliers,
    items,
    movements,
    purchaseOrders,
    lowStockAlerts,
    loading,
    createItem,
    updateItem,
    createMovement,
    createPurchaseOrder,
    resolveLowStockAlert,
    getInventoryStats
  } = useInventoryManagement();

  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('items');
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  // Form state for new/edit item
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    sku: '',
    category_id: '',
    supplier_id: '',
    unit_type: 'units',
    current_stock: 0,
    min_stock: 0,
    max_stock: '',
    unit_cost: '',
    selling_price: '',
    location: '',
    expiry_date: '',
    is_active: true
  });

  // Form state for movement
  const [movementForm, setMovementForm] = useState({
    item_id: '',
    movement_type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: 0,
    unit_cost: '',
    reason: 'adjustment' as const,
    notes: ''
  });

  useEffect(() => {
    loadStats();
  }, [items]);

  const loadStats = async () => {
    try {
      const statsData = await getInventoryStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCreateItem = async () => {
    try {
      const itemData = {
        ...itemForm,
        max_stock: movementForm.unit_cost ? parseFloat(itemForm.max_stock) : undefined,
        unit_cost: itemForm.unit_cost ? parseFloat(itemForm.unit_cost) : undefined,
        selling_price: itemForm.selling_price ? parseFloat(itemForm.selling_price) : undefined,
        expiry_date: itemForm.expiry_date || undefined
      };
      
      await createItem(itemData);
      setShowItemDialog(false);
      resetItemForm();
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem) return;
    
    try {
      const itemData = {
        ...itemForm,
        max_stock: itemForm.max_stock ? parseFloat(itemForm.max_stock) : undefined,
        unit_cost: itemForm.unit_cost ? parseFloat(itemForm.unit_cost) : undefined,
        selling_price: itemForm.selling_price ? parseFloat(itemForm.selling_price) : undefined,
        expiry_date: itemForm.expiry_date || undefined
      };
      
      await updateItem(editingItem.id, itemData);
      setShowItemDialog(false);
      setEditingItem(null);
      resetItemForm();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleCreateMovement = async () => {
    try {
      const movementData = {
        ...movementForm,
        unit_cost: movementForm.unit_cost ? parseFloat(movementForm.unit_cost) : undefined,
        total_cost: movementForm.unit_cost ? movementForm.quantity * parseFloat(movementForm.unit_cost) : undefined
      };
      
      await createMovement(movementData);
      setShowMovementDialog(false);
      resetMovementForm();
    } catch (error) {
      console.error('Error creating movement:', error);
    }
  };

  const resetItemForm = () => {
    setItemForm({
      name: '',
      description: '',
      sku: '',
      category_id: '',
      supplier_id: '',
      unit_type: 'units',
      current_stock: 0,
      min_stock: 0,
      max_stock: '',
      unit_cost: '',
      selling_price: '',
      location: '',
      expiry_date: '',
      is_active: true
    });
  };

  const resetMovementForm = () => {
    setMovementForm({
      item_id: '',
      movement_type: 'in',
      quantity: 0,
      unit_cost: '',
      reason: 'adjustment',
      notes: ''
    });
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      sku: item.sku || '',
      category_id: item.category_id || '',
      supplier_id: item.supplier_id || '',
      unit_type: item.unit_type,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      max_stock: item.max_stock?.toString() || '',
      unit_cost: item.unit_cost?.toString() || '',
      selling_price: item.selling_price?.toString() || '',
      location: item.location || '',
      expiry_date: item.expiry_date || '',
      is_active: item.is_active
    });
    setShowItemDialog(true);
  };

  const getStockLevelColor = (item: any) => {
    if (item.current_stock <= 0) return 'text-red-600';
    if (item.current_stock <= item.min_stock) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStockLevelIcon = (item: any) => {
    if (item.current_stock <= 0) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (item.current_stock <= item.min_stock) return <TrendingDown className="h-4 w-4 text-yellow-600" />;
    return <TrendingUp className="h-4 w-4 text-green-600" />;
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Inventario</h1>
          <p className="text-muted-foreground">
            Control completo de stock, movimientos y compras
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => { resetMovementForm(); }}>
                <Package className="h-4 w-4 mr-2" />
                Movimiento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nuevo Movimiento de Inventario</DialogTitle>
                <DialogDescription>
                  Registra entrada, salida o ajuste de stock
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="item">Producto</Label>
                  <Select value={movementForm.item_id} onValueChange={(value) => setMovementForm(prev => ({ ...prev, item_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.sku}) - Stock: {item.current_stock}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="movement_type">Tipo</Label>
                    <Select value={movementForm.movement_type} onValueChange={(value: any) => setMovementForm(prev => ({ ...prev, movement_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">Entrada</SelectItem>
                        <SelectItem value="out">Salida</SelectItem>
                        <SelectItem value="adjustment">Ajuste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Cantidad</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={movementForm.quantity}
                      onChange={(e) => setMovementForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reason">Motivo</Label>
                  <Select value={movementForm.reason} onValueChange={(value: any) => setMovementForm(prev => ({ ...prev, reason: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">Compra</SelectItem>
                      <SelectItem value="sale">Venta</SelectItem>
                      <SelectItem value="adjustment">Ajuste</SelectItem>
                      <SelectItem value="expired">Vencido</SelectItem>
                      <SelectItem value="damaged">Dañado</SelectItem>
                      <SelectItem value="service_use">Uso en Servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="unit_cost">Costo Unitario</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    value={movementForm.unit_cost}
                    onChange={(e) => setMovementForm(prev => ({ ...prev, unit_cost: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={movementForm.notes}
                    onChange={(e) => setMovementForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowMovementDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateMovement}>
                  Registrar Movimiento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetItemForm(); setEditingItem(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Editar Producto' : 'Nuevo Producto'}
                </DialogTitle>
                <DialogDescription>
                  Configure la información del producto de inventario
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={itemForm.name}
                      onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nombre del producto"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={itemForm.sku}
                      onChange={(e) => setItemForm(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="Código único"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={itemForm.description}
                    onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select value={itemForm.category_id} onValueChange={(value) => setItemForm(prev => ({ ...prev, category_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="supplier">Proveedor</Label>
                    <Select value={itemForm.supplier_id} onValueChange={(value) => setItemForm(prev => ({ ...prev, supplier_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="unit_type">Unidad</Label>
                    <Select value={itemForm.unit_type} onValueChange={(value) => setItemForm(prev => ({ ...prev, unit_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="units">Unidades</SelectItem>
                        <SelectItem value="ml">Mililitros</SelectItem>
                        <SelectItem value="gr">Gramos</SelectItem>
                        <SelectItem value="kg">Kilogramos</SelectItem>
                        <SelectItem value="l">Litros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="current_stock">Stock Actual</Label>
                    <Input
                      id="current_stock"
                      type="number"
                      value={itemForm.current_stock}
                      onChange={(e) => setItemForm(prev => ({ ...prev, current_stock: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="min_stock">Stock Mínimo</Label>
                    <Input
                      id="min_stock"
                      type="number"
                      value={itemForm.min_stock}
                      onChange={(e) => setItemForm(prev => ({ ...prev, min_stock: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="max_stock">Stock Máximo</Label>
                    <Input
                      id="max_stock"
                      type="number"
                      value={itemForm.max_stock}
                      onChange={(e) => setItemForm(prev => ({ ...prev, max_stock: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="unit_cost">Costo Unitario</Label>
                    <Input
                      id="unit_cost"
                      type="number"
                      step="0.01"
                      value={itemForm.unit_cost}
                      onChange={(e) => setItemForm(prev => ({ ...prev, unit_cost: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="selling_price">Precio Venta</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      value={itemForm.selling_price}
                      onChange={(e) => setItemForm(prev => ({ ...prev, selling_price: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="location">Ubicación</Label>
                    <Input
                      id="location"
                      value={itemForm.location}
                      onChange={(e) => setItemForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Ej: Estante A-1"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="expiry_date">Fecha Vencimiento</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={itemForm.expiry_date}
                      onChange={(e) => setItemForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowItemDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={editingItem ? handleEditItem : handleCreateItem}>
                  {editingItem ? 'Actualizar' : 'Crear'} Producto
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
              <Boxes className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground">Productos registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Requieren reposición</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.totalValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Valor del inventario</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Saludable</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.stockPercentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Por encima del mínimo</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Productos</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
          <TabsTrigger value="alerts">Alertas de Stock</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventario de Productos</CardTitle>
              <CardDescription>
                Gestiona todos los productos del inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>
                        {item.category && (
                          <Badge variant="outline" style={{ backgroundColor: item.category.color + '20', color: item.category.color }}>
                            {item.category.name}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStockLevelIcon(item)}
                          <span className={getStockLevelColor(item)}>
                            {item.current_stock} {item.unit_type}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Min: {item.min_stock}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.unit_cost ? `€${item.unit_cost}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos de Inventario</CardTitle>
              <CardDescription>
                Historial de entradas, salidas y ajustes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {new Date(movement.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {movement.item?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          movement.movement_type === 'in' ? 'default' : 
                          movement.movement_type === 'out' ? 'destructive' : 'secondary'
                        }>
                          {movement.movement_type === 'in' ? 'Entrada' : 
                           movement.movement_type === 'out' ? 'Salida' : 'Ajuste'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={movement.movement_type === 'in' ? 'text-green-600' : 'text-red-600'}>
                          {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell>{movement.reason}</TableCell>
                      <TableCell>
                        {movement.performer ? 
                          `${movement.performer.first_name} ${movement.performer.last_name}` : 
                          '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Stock Bajo</CardTitle>
              <CardDescription>
                Productos que requieren reposición
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <div className="font-medium">{alert.item?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Stock actual: {alert.item?.current_stock} {alert.item?.unit_type} • 
                          Mínimo: {alert.item?.min_stock}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getAlertLevelColor(alert.alert_level)}>
                        {alert.alert_level === 'critical' ? 'Crítico' : 
                         alert.alert_level === 'low' ? 'Bajo' : 'Sin Stock'}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => resolveLowStockAlert(alert.id)}>
                        Marcar Resuelto
                      </Button>
                    </div>
                  </div>
                ))}
                {lowStockAlerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay alertas de stock bajo activas
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proveedores</CardTitle>
              <CardDescription>
                Gestión de proveedores registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.contact_person}</TableCell>
                      <TableCell>{supplier.email}</TableCell>
                      <TableCell>{supplier.phone}</TableCell>
                      <TableCell>
                        <Badge variant={supplier.is_active ? "default" : "secondary"}>
                          {supplier.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryManagement;