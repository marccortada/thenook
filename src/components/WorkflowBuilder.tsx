import { useCallback, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Square, 
  RotateCcw, 
  Save, 
  Download, 
  Upload,
  Plus,
  Workflow
} from "lucide-react";

// Nodos personalizados
import ProcessNode from './workflow/ProcessNode';
import DecisionNode from './workflow/DecisionNode';
import StartEndNode from './workflow/StartEndNode';

// Tipos de nodos personalizados
const nodeTypes = {
  process: ProcessNode,
  decision: DecisionNode,
  startEnd: StartEndNode,
};

// Plantillas de workflow predefinidas
const workflowTemplates = {
  reservationFlow: {
    name: "Flujo de Reserva Completo",
    description: "Proceso completo desde la solicitud hasta la confirmación de reserva",
    category: "Cliente",
    nodes: [
      {
        id: '1',
        type: 'startEnd',
        position: { x: 100, y: 50 },
        data: { 
          label: 'Solicitud de Reserva',
          type: 'start',
          status: 'active'
        },
      },
      {
        id: '2',
        type: 'process',
        position: { x: 100, y: 150 },
        data: { 
          label: 'Verificar Centro',
          description: 'Confirmar disponibilidad en Zurbarán o Concha Espina',
          status: 'pending'
        },
      },
      {
        id: '3',
        type: 'decision',
        position: { x: 100, y: 250 },
        data: { 
          label: 'Centro Disponible?',
          question: '¿Hay disponibilidad en el centro solicitado?',
          status: 'pending'
        },
      },
      {
        id: '4',
        type: 'process',
        position: { x: 300, y: 200 },
        data: { 
          label: 'Sugerir Centro Alternativo',
          description: 'Ofrecer el otro centro o horarios diferentes',
          status: 'pending'
        },
      },
      {
        id: '5',
        type: 'process',
        position: { x: 100, y: 350 },
        data: { 
          label: 'Asignar Terapeuta',
          description: 'Seleccionar especialista según servicio',
          status: 'pending'
        },
      },
      {
        id: '6',
        type: 'process',
        position: { x: 100, y: 450 },
        data: { 
          label: 'Enviar Confirmación',
          description: 'Email + SMS con detalles de la cita',
          status: 'pending'
        },
      },
      {
        id: '7',
        type: 'startEnd',
        position: { x: 100, y: 550 },
        data: { 
          label: 'Reserva Confirmada',
          type: 'end',
          status: 'pending'
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4', label: 'No Disponible', style: { stroke: '#ef4444' } },
      { id: 'e4-2', source: '4', target: '2', label: 'Reintentar' },
      { id: 'e3-5', source: '3', target: '5', label: 'Disponible', style: { stroke: '#22c55e' } },
      { id: 'e5-6', source: '5', target: '6' },
      { id: 'e6-7', source: '6', target: '7' },
    ],
  },
  clientNoShow: {
    name: "Gestión de No Show",
    description: "Protocolo cuando un cliente no se presenta a su cita",
    category: "Operaciones",
    nodes: [
      {
        id: '1',
        type: 'startEnd',
        position: { x: 100, y: 50 },
        data: { 
          label: 'Cliente No Se Presenta',
          type: 'start',
          status: 'active'
        },
      },
      {
        id: '2',
        type: 'process',
        position: { x: 100, y: 150 },
        data: { 
          label: 'Marcar como No Show',
          description: 'Actualizar estado en el sistema',
          status: 'pending'
        },
      },
      {
        id: '3',
        type: 'process',
        position: { x: 100, y: 250 },
        data: { 
          label: 'Liberar Horario',
          description: 'Hacer disponible para otros clientes',
          status: 'pending'
        },
      },
      {
        id: '4',
        type: 'decision',
        position: { x: 100, y: 350 },
        data: { 
          label: 'Es Cliente Frecuente?',
          question: '¿Tiene más de 5 reservas previas?',
          status: 'pending'
        },
      },
      {
        id: '5',
        type: 'process',
        position: { x: 300, y: 300 },
        data: { 
          label: 'Llamada de Seguimiento',
          description: 'Contactar para reagendar',
          status: 'pending'
        },
      },
      {
        id: '6',
        type: 'process',
        position: { x: 100, y: 450 },
        data: { 
          label: 'Aplicar Política',
          description: 'Cobro de penalización o bloqueo temporal',
          status: 'pending'
        },
      },
      {
        id: '7',
        type: 'startEnd',
        position: { x: 200, y: 550 },
        data: { 
          label: 'Proceso Completado',
          type: 'end',
          status: 'pending'
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4' },
      { id: 'e4-5', source: '4', target: '5', label: 'Sí', style: { stroke: '#22c55e' } },
      { id: 'e4-6', source: '4', target: '6', label: 'No', style: { stroke: '#ef4444' } },
      { id: 'e5-7', source: '5', target: '7' },
      { id: 'e6-7', source: '6', target: '7' },
    ],
  },
  bonusExpiry: {
    name: "Gestión de Bonos por Vencer",
    description: "Automatización de notificaciones de bonos próximos a vencer",
    category: "Marketing",
    nodes: [
      {
        id: '1',
        type: 'startEnd',
        position: { x: 100, y: 50 },
        data: { 
          label: 'Revisión Diaria Bonos',
          type: 'start',
          status: 'active'
        },
      },
      {
        id: '2',
        type: 'process',
        position: { x: 100, y: 150 },
        data: { 
          label: 'Identificar Bonos',
          description: 'Buscar bonos que vencen en 7 días',
          status: 'pending'
        },
      },
      {
        id: '3',
        type: 'decision',
        position: { x: 100, y: 250 },
        data: { 
          label: 'Hay Bonos por Vencer?',
          question: '¿Se encontraron bonos próximos a vencer?',
          status: 'pending'
        },
      },
      {
        id: '4',
        type: 'process',
        position: { x: 100, y: 350 },
        data: { 
          label: 'Enviar WhatsApp',
          description: 'Notificar al cliente sobre vencimiento',
          status: 'pending'
        },
      },
      {
        id: '5',
        type: 'process',
        position: { x: 100, y: 450 },
        data: { 
          label: 'Programar Seguimiento',
          description: 'Recordatorio en 3 días si no reserva',
          status: 'pending'
        },
      },
      {
        id: '6',
        type: 'startEnd',
        position: { x: 100, y: 550 },
        data: { 
          label: 'Proceso Completado',
          type: 'end',
          status: 'pending'
        },
      },
      {
        id: '7',
        type: 'startEnd',
        position: { x: 300, y: 250 },
        data: { 
          label: 'Sin Bonos por Vencer',
          type: 'end',
          status: 'pending'
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4', label: 'Sí', style: { stroke: '#22c55e' } },
      { id: 'e3-7', source: '3', target: '7', label: 'No', style: { stroke: '#ef4444' } },
      { id: 'e4-5', source: '4', target: '5' },
      { id: 'e5-6', source: '5', target: '6' },
    ],
  },
  qualityControl: {
    name: "Control de Calidad Post-Servicio",
    description: "Seguimiento de satisfacción del cliente después del servicio",
    category: "Calidad",
    nodes: [
      {
        id: '1',
        type: 'startEnd',
        position: { x: 100, y: 50 },
        data: { 
          label: 'Servicio Completado',
          type: 'start',
          status: 'active'
        },
      },
      {
        id: '2',
        type: 'process',
        position: { x: 100, y: 150 },
        data: { 
          label: 'Esperar 2 Horas',
          description: 'Tiempo para que el cliente complete el servicio',
          status: 'pending'
        },
      },
      {
        id: '3',
        type: 'process',
        position: { x: 100, y: 250 },
        data: { 
          label: 'Enviar Encuesta',
          description: 'WhatsApp con link de satisfacción',
          status: 'pending'
        },
      },
      {
        id: '4',
        type: 'decision',
        position: { x: 100, y: 350 },
        data: { 
          label: 'Respuesta en 24h?',
          question: '¿El cliente respondió la encuesta?',
          status: 'pending'
        },
      },
      {
        id: '5',
        type: 'process',
        position: { x: 300, y: 300 },
        data: { 
          label: 'Recordatorio Suave',
          description: 'Segundo mensaje más personalizado',
          status: 'pending'
        },
      },
      {
        id: '6',
        type: 'decision',
        position: { x: 100, y: 450 },
        data: { 
          label: 'Puntuación Alta?',
          question: '¿Calificación 4-5 estrellas?',
          status: 'pending'
        },
      },
      {
        id: '7',
        type: 'process',
        position: { x: 300, y: 450 },
        data: { 
          label: 'Solicitar Reseña Google',
          description: 'Pedir reseña pública para fortalecer reputación',
          status: 'pending'
        },
      },
      {
        id: '8',
        type: 'process',
        position: { x: 100, y: 550 },
        data: { 
          label: 'Alerta al Manager',
          description: 'Notificar baja calificación para seguimiento',
          status: 'pending'
        },
      },
      {
        id: '9',
        type: 'startEnd',
        position: { x: 200, y: 650 },
        data: { 
          label: 'Proceso Completado',
          type: 'end',
          status: 'pending'
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4' },
      { id: 'e4-5', source: '4', target: '5', label: 'No', style: { stroke: '#ef4444' } },
      { id: 'e4-6', source: '4', target: '6', label: 'Sí', style: { stroke: '#22c55e' } },
      { id: 'e5-4', source: '5', target: '4', label: 'Reintentar' },
      { id: 'e6-7', source: '6', target: '7', label: 'Alta (4-5)', style: { stroke: '#22c55e' } },
      { id: 'e6-8', source: '6', target: '8', label: 'Baja (1-3)', style: { stroke: '#ef4444' } },
      { id: 'e7-9', source: '7', target: '9' },
      { id: 'e8-9', source: '8', target: '9' },
    ],
  },
  pregnantClientFlow: {
    name: "Protocolo Cliente Embarazada",
    description: "Proceso especial para servicios a embarazadas",
    category: "Especializado",
    nodes: [
      {
        id: '1',
        type: 'startEnd',
        position: { x: 100, y: 50 },
        data: { 
          label: 'Reserva Embarazada',
          type: 'start',
          status: 'active'
        },
      },
      {
        id: '2',
        type: 'process',
        position: { x: 100, y: 150 },
        data: { 
          label: 'Verificar Semanas',
          description: 'Confirmar que esté después de la semana 12',
          status: 'pending'
        },
      },
      {
        id: '3',
        type: 'decision',
        position: { x: 100, y: 250 },
        data: { 
          label: 'Semanas OK?',
          question: '¿Más de 12 semanas de gestación?',
          status: 'pending'
        },
      },
      {
        id: '4',
        type: 'process',
        position: { x: 300, y: 200 },
        data: { 
          label: 'Declinar Servicio',
          description: 'Explicar política y sugerir esperar',
          status: 'pending'
        },
      },
      {
        id: '5',
        type: 'process',
        position: { x: 100, y: 350 },
        data: { 
          label: 'Asignar Especialista',
          description: 'Terapeuta certificado en embarazo',
          status: 'pending'
        },
      },
      {
        id: '6',
        type: 'process',
        position: { x: 100, y: 450 },
        data: { 
          label: 'Nota Especial',
          description: 'Agregar alerta en perfil del cliente',
          status: 'pending'
        },
      },
      {
        id: '7',
        type: 'process',
        position: { x: 100, y: 550 },
        data: { 
          label: 'Confirmar con Protocolo',
          description: 'Email específico con instrucciones especiales',
          status: 'pending'
        },
      },
      {
        id: '8',
        type: 'startEnd',
        position: { x: 200, y: 650 },
        data: { 
          label: 'Reserva Confirmada',
          type: 'end',
          status: 'pending'
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4', label: 'No (< 12 sem)', style: { stroke: '#ef4444' } },
      { id: 'e3-5', source: '3', target: '5', label: 'Sí (> 12 sem)', style: { stroke: '#22c55e' } },
      { id: 'e5-6', source: '5', target: '6' },
      { id: 'e6-7', source: '6', target: '7' },
      { id: 'e7-8', source: '7', target: '8' },
    ],
  },
  inventoryRestock: {
    name: "Reposición de Inventario",
    description: "Automatización de compras cuando stock está bajo",
    category: "Inventario",
    nodes: [
      {
        id: '1',
        type: 'startEnd',
        position: { x: 100, y: 50 },
        data: { 
          label: 'Stock Bajo Detectado',
          type: 'start',
          status: 'active'
        },
      },
      {
        id: '2',
        type: 'process',
        position: { x: 100, y: 150 },
        data: { 
          label: 'Verificar Proveedor',
          description: 'Comprobar datos del proveedor habitual',
          status: 'pending'
        },
      },
      {
        id: '3',
        type: 'decision',
        position: { x: 100, y: 250 },
        data: { 
          label: 'Proveedor Activo?',
          question: '¿El proveedor está disponible?',
          status: 'pending'
        },
      },
      {
        id: '4',
        type: 'process',
        position: { x: 300, y: 200 },
        data: { 
          label: 'Buscar Alternativo',
          description: 'Activar proveedor de respaldo',
          status: 'pending'
        },
      },
      {
        id: '5',
        type: 'process',
        position: { x: 100, y: 350 },
        data: { 
          label: 'Crear Orden Compra',
          description: 'Generar PO automáticamente',
          status: 'pending'
        },
      },
      {
        id: '6',
        type: 'process',
        position: { x: 100, y: 450 },
        data: { 
          label: 'Notificar Manager',
          description: 'Alertar sobre orden generada',
          status: 'pending'
        },
      },
      {
        id: '7',
        type: 'startEnd',
        position: { x: 100, y: 550 },
        data: { 
          label: 'Orden Enviada',
          type: 'end',
          status: 'pending'
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4', label: 'No', style: { stroke: '#ef4444' } },
      { id: 'e3-5', source: '3', target: '5', label: 'Sí', style: { stroke: '#22c55e' } },
      { id: 'e4-5', source: '4', target: '5' },
      { id: 'e5-6', source: '5', target: '6' },
      { id: 'e6-7', source: '6', target: '7' },
    ],
  },
};

const WorkflowBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Cargar plantilla de workflow
  const loadTemplate = (templateKey: string) => {
    const template = workflowTemplates[templateKey as keyof typeof workflowTemplates];
    if (template) {
      setNodes(template.nodes);
      setEdges(template.edges);
      setSelectedTemplate(templateKey);
    }
  };

  // Ejecutar workflow paso a paso
  const runWorkflow = async () => {
    if (nodes.length === 0) return;
    
    setIsRunning(true);
    
    // Encontrar nodo de inicio
    const startNode = nodes.find(node => node.data.type === 'start');
    if (!startNode) return;

    // Simular ejecución paso a paso
    const processStep = async (nodeId: string) => {
      setCurrentStep(nodeId);
      
      // Actualizar estado del nodo actual
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            status: node.id === nodeId ? 'active' : 
                   node.data.status === 'active' ? 'completed' : node.data.status
          }
        }))
      );

      // Esperar 2 segundos antes del siguiente paso
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Encontrar siguiente nodo
      const nextEdge = edges.find(edge => edge.source === nodeId);
      if (nextEdge) {
        const nextNode = nodes.find(node => node.id === nextEdge.target);
        if (nextNode && nextNode.data.type !== 'end') {
          await processStep(nextEdge.target);
        } else if (nextNode?.data.type === 'end') {
          setNodes(prevNodes => 
            prevNodes.map(node => ({
              ...node,
              data: {
                ...node.data,
                status: node.id === nextEdge.target ? 'completed' : node.data.status
              }
            }))
          );
        }
      }
    };

    await processStep(startNode.id);
    setIsRunning(false);
    setCurrentStep('');
  };

  // Reiniciar workflow
  const resetWorkflow = () => {
    setNodes(prevNodes => 
      prevNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          status: node.data.type === 'start' ? 'active' : 'pending'
        }
      }))
    );
    setIsRunning(false);
    setCurrentStep('');
  };

  // Agregar nuevo nodo
  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { 
        label: `Nuevo ${type}`,
        status: 'pending'
      },
    };
    setNodes(prevNodes => [...prevNodes, newNode]);
  };

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Workflow className="h-5 w-5" />
              <span>Constructor de Workflows</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={runWorkflow} 
                disabled={isRunning || nodes.length === 0}
                size="sm"
              >
                <Play className="mr-2 h-4 w-4" />
                Ejecutar
              </Button>
              <Button 
                onClick={resetWorkflow} 
                variant="outline"
                size="sm"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reiniciar
              </Button>
              <Button 
                onClick={() => {}} 
                variant="outline"
                size="sm"
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder">Constructor</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          {/* Toolbar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Agregar:</span>
                <Button 
                  onClick={() => addNode('process')} 
                  variant="outline" 
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Proceso
                </Button>
                <Button 
                  onClick={() => addNode('decision')} 
                  variant="outline" 
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Decisión
                </Button>
                <Button 
                  onClick={() => addNode('startEnd')} 
                  variant="outline" 
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Inicio/Fin
                </Button>
                {isRunning && (
                  <Badge variant="secondary" className="ml-4">
                    Ejecutando paso: {currentStep}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Canvas del workflow */}
          <Card>
            <CardContent className="p-0">
              <div style={{ width: '100%', height: '600px' }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  fitView
                  style={{ backgroundColor: 'hsl(var(--muted))' }}
                >
                  <Controls />
                  <MiniMap />
                  <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                </ReactFlow>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas de Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(workflowTemplates).map(([key, template]) => (
                  <Card key={key} className="hover-scale cursor-pointer hover:shadow-lg transition-all" onClick={() => loadTemplate(key)}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {template.nodes.length} pasos • {template.edges.length} conexiones
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {template.nodes.filter(n => n.type === 'process').length} Procesos
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.nodes.filter(n => n.type === 'decision').length} Decisiones
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Ejecuciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay ejecuciones registradas</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkflowBuilder;