import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInternalCodes, InternalCode } from '@/hooks/useInternalCodes';
import { Plus, Edit, Trash2, Hash, Tag, Calendar, User, Search, Filter } from 'lucide-react';

const InternalCodesManagement = () => {
  const {
    codes,
    assignments,
    loading,
    createCode,
    updateCode,
    deleteCode,
    assignCode,
    unassignCode,
    searchEntitiesByCodes,
    getCodesByCategory,
    getAvailableCategories
  } = useInternalCodes();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<InternalCode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const createTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [createModalLayout, setCreateModalLayout] = useState({
    top: 0,
    left: 0,
    width: 520,
    maxHeight: 600,
  });

  const [newCode, setNewCode] = useState({
    code: '',
    name: '',
    description: '',
    color: '#3B82F6',
    category: 'general'
  });

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'client', label: 'Cliente' },
    { value: 'employee', label: 'Empleado' },
    { value: 'service', label: 'Servicio' },
    { value: 'booking', label: 'Reserva' }
  ];

  const colorOptions = [
    { value: '#EF4444', label: 'Rojo' },
    { value: '#F59E0B', label: 'Naranja' },
    { value: '#EAB308', label: 'Amarillo' },
    { value: '#10B981', label: 'Verde' },
    { value: '#06B6D4', label: 'Cian' },
    { value: '#3B82F6', label: 'Azul' },
    { value: '#8B5CF6', label: 'Violeta' },
    { value: '#EC4899', label: 'Rosa' },
    { value: '#6B7280', label: 'Gris' }
  ];

  const filteredCodes = codes.filter(code => {
    const matchesCategory = selectedCategory === 'all' || code.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateCode = async () => {
    try {
      await createCode(newCode);
      setNewCode({
        code: '',
        name: '',
        description: '',
        color: '#3B82F6',
        category: 'general'
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEditCode = (code: InternalCode) => {
    setSelectedCode(code);
    setIsEditDialogOpen(true);
  };

  const handleUpdateCode = async () => {
    if (!selectedCode) return;
    
    try {
      await updateCode(selectedCode.id, {
        name: selectedCode.name,
        description: selectedCode.description,
        color: selectedCode.color,
        category: selectedCode.category
      });
      setIsEditDialogOpen(false);
      setSelectedCode(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este código?')) {
      await deleteCode(id);
    }
  };

  const getUsageDescription = (code: InternalCode) => {
    if (code.usage_count === 0) return 'Sin uso';
    return `${code.usage_count} uso${code.usage_count > 1 ? 's' : ''}`;
  };

  const getLastUsedDescription = (code: InternalCode) => {
    if (!code.last_used) return 'Nunca usado';
    return `Último uso: ${new Date(code.last_used).toLocaleDateString()}`;
  };

  const updateCreateModalLayout = (trigger?: HTMLElement | null) => {
    if (typeof window === 'undefined') return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const width = Math.min(520, windowWidth - 32);
    const maxHeight = Math.min(600, windowHeight - 32);

    let top = window.scrollY + (windowHeight - maxHeight) / 2;
    let left = (windowWidth - width) / 2;

    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      top = rect.top + window.scrollY - maxHeight / 2 + rect.height / 2;
      left = rect.left + rect.width / 2 - width / 2;
    }

    const minTop = window.scrollY + 16;
    const maxTop = Math.max(minTop, window.scrollY + windowHeight - maxHeight - 16);
    const minLeft = 16;
    const maxLeft = Math.max(minLeft, windowWidth - width - 16);

    setCreateModalLayout({
      top: Math.max(minTop, Math.min(top, maxTop)),
      left: Math.max(minLeft, Math.min(left, maxLeft)),
      width,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!isCreateDialogOpen) return;

    const trigger = createTriggerRef.current;
    updateCreateModalLayout(trigger || undefined);

    const handleReposition = () => updateCreateModalLayout(trigger || undefined);

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isCreateDialogOpen]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Códigos Internos</h2>
          <p className="text-muted-foreground">Gestiona códigos y etiquetas para organizar información</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              ref={createTriggerRef}
              className="flex items-center space-x-2"
              onClick={(event) => updateCreateModalLayout(event.currentTarget)}
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Código</span>
            </Button>
          </DialogTrigger>
          <DialogContent
            className="max-w-none w-full overflow-hidden rounded-xl border bg-background shadow-2xl left-auto top-auto -translate-x-0 -translate-y-0 p-6"
            onOpenAutoFocus={(event) => event.preventDefault()}
            style={{
              position: 'fixed',
              top: createModalLayout.top,
              left: createModalLayout.left,
              width: createModalLayout.width,
              maxHeight: createModalLayout.maxHeight,
              display: 'flex',
              flexDirection: 'column',
              transform: 'none',
            }}
          >
            <DialogHeader>
              <DialogTitle>Crear Nuevo Código</DialogTitle>
              <DialogDescription>
                Crea un nuevo código interno para organizar y categorizar información.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              <div>
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  placeholder="VIP, PRIORITY, etc."
                  className="uppercase"
                />
              </div>
              
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={newCode.name}
                  onChange={(e) => setNewCode({ ...newCode, name: e.target.value })}
                  placeholder="Nombre descriptivo"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newCode.description}
                  onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                  placeholder="Descripción opcional del código"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select value={newCode.category} onValueChange={(value) => setNewCode({ ...newCode, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="color">Color</Label>
                <Select value={newCode.color} onValueChange={(value) => setNewCode({ ...newCode, color: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un color" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleCreateCode} 
                disabled={!newCode.code || !newCode.name || loading}
                className="w-full"
              >
                {loading ? 'Creando...' : 'Crear Código'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar códigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Hash className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Códigos</p>
                <p className="text-2xl font-bold">{codes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">En Uso</p>
                <p className="text-2xl font-bold">{codes.filter(c => c.usage_count > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Asignaciones</p>
                <p className="text-2xl font-bold">{assignments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Categorías</p>
                <p className="text-2xl font-bold">{getAvailableCategories().length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCodes.map((code) => (
          <Card key={code.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge 
                    className="font-mono text-xs px-2 py-1"
                    style={{ 
                      backgroundColor: code.color,
                      color: '#ffffff'
                    }}
                  >
                    {code.code}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {categories.find(c => c.value === code.category)?.label || code.category}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCode(code)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCode(code.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-sm">{code.name}</h3>
                {code.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {code.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{getUsageDescription(code)}</span>
                  <span>{getLastUsedDescription(code)}</span>
                </div>
                
                {code.creator_name && (
                  <p className="text-xs text-muted-foreground">
                    Creado por: {code.creator_name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCodes.length === 0 && (
        <div className="text-center py-12">
          <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay códigos</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? "No hay códigos que coincidan con los filtros"
              : "Aún no tienes códigos creados"
            }
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Primer Código
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Código</DialogTitle>
            <DialogDescription>
              Modifica los detalles del código seleccionado. El código no se puede cambiar.
            </DialogDescription>
          </DialogHeader>
          {selectedCode && (
            <div className="space-y-4">
              <div>
                <Label>Código</Label>
                <Input
                  value={selectedCode.code}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  El código no se puede modificar después de crearlo
                </p>
              </div>
              
              <div>
                <Label htmlFor="edit-name">Nombre *</Label>
                <Input
                  id="edit-name"
                  value={selectedCode.name}
                  onChange={(e) => setSelectedCode({ ...selectedCode, name: e.target.value })}
                  placeholder="Nombre descriptivo"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={selectedCode.description}
                  onChange={(e) => setSelectedCode({ ...selectedCode, description: e.target.value })}
                  placeholder="Descripción opcional del código"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-category">Categoría</Label>
                <Select 
                  value={selectedCode.category} 
                  onValueChange={(value) => setSelectedCode({ ...selectedCode, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <Select 
                  value={selectedCode.color} 
                  onValueChange={(value) => setSelectedCode({ ...selectedCode, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un color" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateCode} 
                  disabled={!selectedCode.name || loading}
                  className="flex-1"
                >
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InternalCodesManagement;
