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
    name: "Flujo de Reserva",
    nodes: [
      {
        id: '1',
        type: 'startEnd',
        position: { x: 100, y: 50 },
        data: { 
          label: 'Inicio',
          type: 'start',
          status: 'active'
        },
      },
      {
        id: '2',
        type: 'process',
        position: { x: 100, y: 150 },
        data: { 
          label: 'Seleccionar Servicio',
          description: 'Cliente elige el servicio deseado',
          status: 'pending'
        },
      },
      {
        id: '3',
        type: 'decision',
        position: { x: 100, y: 250 },
        data: { 
          label: 'Disponibilidad?',
          question: '¿Hay horarios disponibles?',
          status: 'pending'
        },
      },
      {
        id: '4',
        type: 'process',
        position: { x: 300, y: 200 },
        data: { 
          label: 'Sugerir Alternativas',
          description: 'Mostrar horarios alternativos',
          status: 'pending'
        },
      },
      {
        id: '5',
        type: 'process',
        position: { x: 100, y: 350 },
        data: { 
          label: 'Confirmar Reserva',
          description: 'Procesar el pago y confirmar',
          status: 'pending'
        },
      },
      {
        id: '6',
        type: 'startEnd',
        position: { x: 100, y: 450 },
        data: { 
          label: 'Fin',
          type: 'end',
          status: 'pending'
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4', label: 'No', style: { stroke: '#ef4444' } },
      { id: 'e4-2', source: '4', target: '2', label: 'Reintentar' },
      { id: 'e3-5', source: '3', target: '5', label: 'Sí', style: { stroke: '#22c55e' } },
      { id: 'e5-6', source: '5', target: '6' },
    ],
  },
  employeeOnboarding: {
    name: "Onboarding Empleado",
    nodes: [
      {
        id: '1',
        type: 'startEnd',
        position: { x: 100, y: 50 },
        data: { 
          label: 'Nuevo Empleado',
          type: 'start',
          status: 'active'
        },
      },
      {
        id: '2',
        type: 'process',
        position: { x: 100, y: 150 },
        data: { 
          label: 'Crear Perfil',
          description: 'Registrar datos del empleado',
          status: 'pending'
        },
      },
      {
        id: '3',
        type: 'process',
        position: { x: 100, y: 250 },
        data: { 
          label: 'Asignar Centro',
          description: 'Vincular con centro de trabajo',
          status: 'pending'
        },
      },
      {
        id: '4',
        type: 'process',
        position: { x: 100, y: 350 },
        data: { 
          label: 'Configurar Permisos',
          description: 'Establecer rol y accesos',
          status: 'pending'
        },
      },
      {
        id: '5',
        type: 'startEnd',
        position: { x: 100, y: 450 },
        data: { 
          label: 'Empleado Activo',
          type: 'end',
          status: 'pending'
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4' },
      { id: 'e4-5', source: '4', target: '5' },
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(workflowTemplates).map(([key, template]) => (
                  <Card key={key} className="hover-scale cursor-pointer" onClick={() => loadTemplate(key)}>
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {template.nodes.length} pasos • {template.edges.length} conexiones
                        </p>
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