import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, Plus, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { useInventoryManagement } from '@/hooks/useInventoryManagement';

const InventoryManagement = () => {
  const {
    categories,
    suppliers,
    items,
    movements,
    lowStockAlerts,
    loading,
    createItem,
    updateItem,
    createMovement,
    getInventoryStats,
    resolveLowStockAlert
  } = useInventoryManagement();

  const [activeTab, setActiveTab] = useState('items');
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const [itemForm, setItemForm] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    supplier_id: '',
    unit_type: 'units',
    current_stock: 0,
    min_stock: 10,
    max_stock: 100,
    unit_cost: 0,
    selling_price: 0,
    location: '',
    center_id: null,
    is_active: true
  });

  const [movementForm, setMovementForm] = useState({
    item_id: '',
    movement_type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: 0,
    reason: '',
    unit_cost: 0,
    notes: ''
  });

  const loadStats = async () => {
    const inventoryStats = await getInventoryStats();
    setStats(inventoryStats);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleCreateItem = async () => {
    if (editingItem) {
      await updateItem(editingItem.id, itemForm);
    } else {
      await createItem(itemForm);
    }
    resetItemForm();
    setShowItemDialog(false);
    setEditingItem(null);
    loadStats();
  };

  const handleCreateMovement = async () => {
    await createMovement(movementForm);
    resetMovementForm();
    setShowMovementDialog(false);
    loadStats();
  };

  const resetItemForm = () => {
    setItemForm({
      name: '',
      sku: '',
      description: '',
      category_id: '',
      supplier_id: '',
      unit_type: 'units',
      current_stock: 0,
      min_stock: 10,
      max_stock: 100,
      unit_cost: 0,
      selling_price: 0,
      location: '',
      center_id: null
    });
  };

  const resetMovementForm = () => {
    setMovementForm({
      item_id: '',
      movement_type: 'in',
      quantity: 0,
      reason: '',
      unit_cost: 0,
      notes: ''
    });
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setItemForm({ ...item });
    setShowItemDialog(true);
  };

  const getStockLevelColor = (item: any) => {
    if (item.current_stock <= 0) return 'text-destructive';
    if (item.current_stock <= item.min_stock) return 'text-warning';
    return 'text-success';
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'out': return <TrendingDown className="w-4 h-4 text-destructive" />;
      case 'adjustment': return <Zap className="w-4 h-4 text-warning" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary">Gestión de Inventario</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Editar Producto' : 'Nuevo Producto'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={itemForm.sku}
                      onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="currentStock">Stock Actual</Label>
                    <Input
                      id="currentStock"
                      type="number"
                      value={itemForm.current_stock}
                      onChange={(e) => setItemForm({ ...itemForm, current_stock: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="minStock">Stock Mínimo</Label>
                    <Input
                      id="minStock"
                      type="number"
                      value={itemForm.min_stock}
                      onChange={(e) => setItemForm({ ...itemForm, min_stock: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxStock">Stock Máximo</Label>
                    <Input
                      id="maxStock"
                      type="number"
                      value={itemForm.max_stock}
                      onChange={(e) => setItemForm({ ...itemForm, max_stock: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unitCost">Costo Unitario</Label>
                    <Input
                      id="unitCost"
                      type="number"
                      step="0.01"
                      value={itemForm.unit_cost}
                      onChange={(e) => setItemForm({ ...itemForm, unit_cost: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sellingPrice">Precio de Venta</Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      value={itemForm.selling_price}
                      onChange={(e) => setItemForm({ ...itemForm, selling_price: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <Button onClick={handleCreateItem} className="w-full">
                  {editingItem ? 'Actualizar' : 'Crear'} Producto
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Package className="w-4 h-4 mr-2" />
                Registrar Movimiento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Movimiento de Inventario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="item">Producto</Label>
                  <Select 
                    value={movementForm.item_id} 
                    onValueChange={(value) => setMovementForm({ ...movementForm, item_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} (Stock: {item.current_stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="movementType">Tipo de Movimiento</Label>
                    <Select 
                      value={movementForm.movement_type} 
                      onValueChange={(value) => setMovementForm({ ...movementForm, movement_type: value })}
                    >
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
                  
                  <div>
                    <Label htmlFor="quantity">Cantidad</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={movementForm.quantity}
                      onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reason">Motivo</Label>
                  <Input
                    id="reason"
                    value={movementForm.reason}
                    onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                    placeholder="Compra, venta, ajuste, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={movementForm.notes}
                    onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                  />
                </div>

                <Button onClick={handleCreateMovement} className="w-full">
                  Registrar Movimiento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Productos</p>
                  <p className="text-2xl font-bold">{stats.totalItems}</p>
                </div>
                <Package className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stock Bajo</p>
                  <p className="text-2xl font-bold text-warning">{stats.lowStockItems}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">${stats.totalValue?.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stock Promedio</p>
                  <p className="text-2xl font-bold">{stats.averageStock?.toFixed(0)}</p>
                </div>
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">Productos</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Productos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="hidden sm:table-cell">SKU</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="hidden md:table-cell">Min/Max</TableHead>
                      <TableHead className="hidden lg:table-cell">Precio</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} onClick={() => openEditDialog(item)} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground sm:hidden">{item.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{item.sku}</TableCell>
                        <TableCell>
                          <span className={getStockLevelColor(item)}>
                            {item.current_stock}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {item.min_stock} / {item.max_stock}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          ${item.selling_price?.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.current_stock <= item.min_stock ? 'destructive' : 'default'}>
                            {item.current_stock <= 0 ? 'Agotado' : 
                             item.current_stock <= item.min_stock ? 'Stock Bajo' : 'Normal'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Últimos Movimientos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead className="hidden md:table-cell">Motivo</TableHead>
                      <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <p className="font-medium">{movement.inventory_items?.name}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovementIcon(movement.movement_type)}
                            <span className="capitalize">{movement.movement_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{movement.quantity}</TableCell>
                        <TableCell className="hidden md:table-cell">{movement.reason}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {new Date(movement.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Stock Bajo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockAlerts.map((alert) => (
                  <div key={alert.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                      <div>
                        <p className="font-medium">{alert.inventory_items?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock actual: {alert.inventory_items?.current_stock} | 
                          Mínimo: {alert.inventory_items?.min_stock}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Badge variant={alert.alert_level === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.alert_level === 'critical' ? 'Crítico' : 'Bajo'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resolveLowStockAlert(alert.id)}
                        className="w-full sm:w-auto"
                      >
                        Resolver
                      </Button>
                    </div>
                  </div>
                ))}
                {lowStockAlerts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay alertas de stock bajo actualmente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryManagement;