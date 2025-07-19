import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from "@/components/ui/badge";

interface DecisionNodeData {
  label: string;
  question?: string;
  status?: 'pending' | 'active' | 'completed' | 'error';
}

const DecisionNode = memo(({ data }: { data: DecisionNodeData }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'active':
        return 'border-primary bg-primary/10';
      case 'completed':
        return 'border-green-500 bg-green-500/10';
      case 'error':
        return 'border-destructive bg-destructive/10';
      default:
        return 'border-muted bg-muted/10';
    }
  };

  const getBadgeColor = () => {
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

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      
      {/* Rombo/Diamond shape */}
      <div className="relative">
        <div 
          className={`w-40 h-40 border-2 ${getStatusColor()} transform rotate-45 flex items-center justify-center`}
          style={{
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
          }}
        />
        
        {/* Contenido centrado */}
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
          <h4 className="font-medium text-sm text-center px-2">{data.label}</h4>
          {data.question && (
            <p className="text-xs text-muted-foreground text-center px-2">{data.question}</p>
          )}
          <Badge className={`text-xs ${getBadgeColor()}`}>
            {data.status || 'pending'}
          </Badge>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-green-500" />
      <Handle type="source" position={Position.Right} id="no" className="!bg-red-500" />
    </>
  );
});

DecisionNode.displayName = 'DecisionNode';

export default DecisionNode;