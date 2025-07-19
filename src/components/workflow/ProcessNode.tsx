import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProcessNodeData {
  label: string;
  description?: string;
  status?: 'pending' | 'active' | 'completed' | 'error';
}

const ProcessNode = memo(({ data }: { data: ProcessNodeData }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'active':
        return 'bg-primary text-primary-foreground';
      case 'completed':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getCardStyle = () => {
    switch (data.status) {
      case 'active':
        return 'border-primary shadow-lg shadow-primary/20';
      case 'completed':
        return 'border-green-500 shadow-lg shadow-green-500/20';
      case 'error':
        return 'border-destructive shadow-lg shadow-destructive/20';
      default:
        return 'border-muted';
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <Card className={`min-w-[200px] ${getCardStyle()}`}>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{data.label}</h4>
              <Badge className={`text-xs ${getStatusColor()}`}>
                {data.status || 'pending'}
              </Badge>
            </div>
            {data.description && (
              <p className="text-xs text-muted-foreground">{data.description}</p>
            )}
          </div>
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </>
  );
});

ProcessNode.displayName = 'ProcessNode';

export default ProcessNode;