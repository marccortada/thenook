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
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Star, 
  Gift, 
  Heart, 
  TrendingUp, 
  Phone, 
  Mail, 
  Calendar,
  Plus,
  Edit,
  Award
} from 'lucide-react';
import { useAdvancedCRM } from '@/hooks/useAdvancedCRM';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AdvancedCRM = () => {
  const {
    loading,
    clientProfiles,
    surveys,
    loyaltyTransactions,
    fetchClientProfiles,
    updateClientProfile,
    fetchSatisfactionSurveys,
    createSatisfactionSurvey,
    fetchLoyaltyTransactions,
    addLoyaltyPoints,
    redeemLoyaltyPoints,
  } = useAdvancedCRM();

  const [activeTab, setActiveTab] = useState('profiles');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSurveyDialog, setShowSurveyDialog] = useState(false);
  const [showLoyaltyDialog, setShowLoyaltyDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const [profileForm, setProfileForm] = useState({
    allergies: [] as string[],
    medical_conditions: [] as string[],
    preferences: {},
    birthday: '',
    anniversary: '',
    notes: '',
    vip_status: false
  });

  const [surveyForm, setSurveyForm] = useState({
    client_id: '',
    overall_rating: 5,
    service_rating: 5,
    staff_rating: 5,
    facility_rating: 5,
    feedback: '',
    would_recommend: true
  });

  const [loyaltyForm, setLoyaltyForm] = useState({
    client_id: '',
    points: 0,
    description: '',
    action: 'add' as 'add' | 'redeem'
  });

  useEffect(() => {
    fetchClientProfiles(searchQuery);
    fetchSatisfactionSurveys();
    fetchLoyaltyTransactions();
  }, [searchQuery]);

  const handleUpdateProfile = async () => {
    if (!selectedClient) return;
    
    try {
      await updateClientProfile(selectedClient.client_id, profileForm);
      setShowProfileDialog(false);
      setSelectedClient(null);
      await fetchClientProfiles(searchQuery);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCreateSurvey = async () => {
    try {
      await createSatisfactionSurvey(surveyForm);
      setShowSurveyDialog(false);
      resetSurveyForm();
    } catch (error) {
      console.error('Error creating survey:', error);
    }
  };

  const handleLoyaltyAction = async () => {
    try {
      if (loyaltyForm.action === 'add') {
        await addLoyaltyPoints(loyaltyForm.client_id, loyaltyForm.points, loyaltyForm.description);
      } else {
        await redeemLoyaltyPoints(loyaltyForm.client_id, loyaltyForm.points, loyaltyForm.description);
      }
      setShowLoyaltyDialog(false);
      resetLoyaltyForm();
      await fetchClientProfiles(searchQuery);
    } catch (error) {
      console.error('Error with loyalty action:', error);
    }
  };

  const resetSurveyForm = () => {
    setSurveyForm({
      client_id: '',
      overall_rating: 5,
      service_rating: 5,
      staff_rating: 5,
      facility_rating: 5,
      feedback: '',
      would_recommend: true
    });
  };

  const resetLoyaltyForm = () => {
    setLoyaltyForm({
      client_id: '',
      points: 0,
      description: '',
      action: 'add'
    });
  };

  const openProfileDialog = (client: any) => {
    setSelectedClient(client);
    setProfileForm({
      allergies: client.allergies || [],
      medical_conditions: client.medical_conditions || [],
      preferences: client.preferences || {},
      birthday: client.birthday || '',
      anniversary: client.anniversary || '',
      notes: client.notes || '',
      vip_status: client.vip_status || false
    });
    setShowProfileDialog(true);
  };

  const getSatisfactionColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">CRM Avanzado</h2>
          <p className="text-muted-foreground">
            Gestión completa de relaciones con clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showSurveyDialog} onOpenChange={setShowSurveyDialog}>
            <DialogTrigger asChild>
              <Button>
                <Star className="w-4 h-4 mr-2" />
                Nueva Encuesta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Encuesta de Satisfacción</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="survey_client">Cliente</Label>
                  <Select value={surveyForm.client_id} onValueChange={(value) => 
                    setSurveyForm({ ...surveyForm, client_id: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientProfiles.map((client: any) => (
                        <SelectItem key={client.client_id} value={client.client_id}>
                          {client.profiles?.first_name} {client.profiles?.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Puntuación General (1-5)</Label>
                    <Select value={surveyForm.overall_rating.toString()} onValueChange={(value) => 
                      setSurveyForm({ ...surveyForm, overall_rating: parseInt(value) })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <SelectItem key={rating} value={rating.toString()}>
                            {rating} ⭐
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Puntuación Servicio</Label>
                    <Select value={surveyForm.service_rating.toString()} onValueChange={(value) => 
                      setSurveyForm({ ...surveyForm, service_rating: parseInt(value) })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <SelectItem key={rating} value={rating.toString()}>
                            {rating} ⭐
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="feedback">Comentarios</Label>
                  <Textarea
                    id="feedback"
                    value={surveyForm.feedback}
                    onChange={(e) => setSurveyForm({ ...surveyForm, feedback: e.target.value })}
                    placeholder="Comentarios del cliente..."
                  />
                </div>

                <Button onClick={handleCreateSurvey} className="w-full" disabled={loading}>
                  {loading ? 'Registrando...' : 'Registrar Encuesta'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showLoyaltyDialog} onOpenChange={setShowLoyaltyDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Gift className="w-4 h-4 mr-2" />
                Gestionar Puntos
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gestionar Puntos de Fidelización</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="loyalty_client">Cliente</Label>
                  <Select value={loyaltyForm.client_id} onValueChange={(value) => 
                    setLoyaltyForm({ ...loyaltyForm, client_id: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientProfiles.map((client: any) => (
                        <SelectItem key={client.client_id} value={client.client_id}>
                          {client.profiles?.first_name} {client.profiles?.last_name} 
                          ({client.loyalty_points} puntos)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Acción</Label>
                  <Select value={loyaltyForm.action} onValueChange={(value: 'add' | 'redeem') => 
                    setLoyaltyForm({ ...loyaltyForm, action: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Añadir Puntos</SelectItem>
                      <SelectItem value="redeem">Canjear Puntos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="points">Cantidad de Puntos</Label>
                  <Input
                    id="points"
                    type="number"
                    value={loyaltyForm.points}
                    onChange={(e) => setLoyaltyForm({ ...loyaltyForm, points: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <Label htmlFor="loyalty_description">Descripción</Label>
                  <Input
                    id="loyalty_description"
                    value={loyaltyForm.description}
                    onChange={(e) => setLoyaltyForm({ ...loyaltyForm, description: e.target.value })}
                    placeholder="Motivo de la transacción"
                  />
                </div>

                <Button onClick={handleLoyaltyAction} className="w-full" disabled={loading}>
                  {loading ? 'Procesando...' : 
                   loyaltyForm.action === 'add' ? 'Añadir Puntos' : 'Canjear Puntos'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Buscar clientes por nombre o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profiles">Perfiles</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfacción</TabsTrigger>
          <TabsTrigger value="loyalty">Fidelización</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles">
          <div className="grid gap-4">
            {clientProfiles.map((client: any) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold`}>
                        {client.profiles?.first_name?.[0]}{client.profiles?.last_name?.[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {client.profiles?.first_name} {client.profiles?.last_name}
                          </h3>
                          {client.vip_status && (
                            <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600">
                              <Award className="w-3 h-3 mr-1" />
                              VIP
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{client.profiles?.email}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openProfileDialog(client)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(client.total_spent_cents)}
                      </div>
                      <p className="text-xs text-muted-foreground">Gasto Total</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {client.total_visits}
                      </div>
                      <p className="text-xs text-muted-foreground">Visitas</p>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getSatisfactionColor(client.satisfaction_score)}`}>
                        {client.satisfaction_score}%
                      </div>
                      <p className="text-xs text-muted-foreground">Satisfacción</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {client.loyalty_points}
                      </div>
                      <p className="text-xs text-muted-foreground">Puntos</p>
                    </div>
                  </div>
                  
                  {client.allergies && client.allergies.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-red-600">Alergias:</p>
                      <div className="flex gap-1 mt-1">
                        {client.allergies.map((allergy: string, index: number) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {clientProfiles.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No se encontraron clientes.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="satisfaction">
          <Card>
            <CardHeader>
              <CardTitle>Encuestas de Satisfacción</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Puntuación</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Personal</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Comentarios</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surveys.map((survey) => (
                      <TableRow key={survey.id}>
                        <TableCell>Cliente #{survey.client_id.slice(-8)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">{survey.overall_rating}</span>
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          </div>
                        </TableCell>
                        <TableCell>{survey.service_rating}/5</TableCell>
                        <TableCell>{survey.staff_rating}/5</TableCell>
                        <TableCell>
                          {format(new Date(survey.survey_date), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {survey.feedback || 'Sin comentarios'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {surveys.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay encuestas registradas.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardHeader>
              <CardTitle>Programa de Fidelización</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Puntos</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loyaltyTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>Cliente #{transaction.client_id.slice(-8)}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.transaction_type === 'earned' ? 'default' : 'secondary'}>
                            {transaction.transaction_type === 'earned' ? 'Ganados' : 'Canjeados'}
                          </Badge>
                        </TableCell>
                        <TableCell className={transaction.transaction_type === 'earned' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.transaction_type === 'earned' ? '+' : ''}{transaction.points_amount}
                        </TableCell>
                        <TableCell>{transaction.description || 'N/A'}</TableCell>
                        <TableCell>
                          {format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {loyaltyTransactions.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay transacciones de fidelización.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Totales</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clientProfiles.length}</div>
                <p className="text-xs text-muted-foreground">
                  {clientProfiles.filter((c: any) => c.vip_status).length} VIP
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Satisfacción Promedio</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {clientProfiles.length > 0 ? 
                    Math.round(clientProfiles.reduce((sum: number, client: any) => sum + client.satisfaction_score, 0) / clientProfiles.length) 
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Basado en {surveys.length} encuestas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    clientProfiles.reduce((sum: number, client: any) => sum + client.total_spent_cents, 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {clientProfiles.reduce((sum: number, client: any) => sum + client.total_visits, 0)} visitas totales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Puntos Activos</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {clientProfiles.reduce((sum: number, client: any) => sum + client.loyalty_points, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  En circulación
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Profile Edit Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Editar Perfil: {selectedClient?.profiles?.first_name} {selectedClient?.profiles?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="birthday">Fecha de Nacimiento</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={profileForm.birthday}
                  onChange={(e) => setProfileForm({ ...profileForm, birthday: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="anniversary">Aniversario</Label>
                <Input
                  id="anniversary"
                  type="date"
                  value={profileForm.anniversary}
                  onChange={(e) => setProfileForm({ ...profileForm, anniversary: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={profileForm.notes}
                onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
                placeholder="Notas sobre el cliente..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="vip_status"
                checked={profileForm.vip_status}
                onChange={(e) => setProfileForm({ ...profileForm, vip_status: e.target.checked })}
              />
              <Label htmlFor="vip_status">Cliente VIP</Label>
            </div>

            <Button onClick={handleUpdateProfile} className="w-full" disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar Perfil'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedCRM;