import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from "@/components/ui/badge";
import { Play, Square } from 'lucide-react';

interface StartEndNodeData {
  label: string;
  type: 'start' | 'end';
  status?: 'pending' | 'active' | 'completed' | 'error';
}

const StartEndNode = memo(({ data }: { data: StartEndNodeData }) => {
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

  const getIcon = () => {
    return data.type === 'start' ? (
      <Play className="h-4 w-4" />
    ) : (
      <Square className="h-4 w-4" />
    );
  };

  return (
    <>
      {data.type === 'start' && (
        <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
      )}
      {data.type === 'end' && (
        <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      )}
      
      {/* Círculo para inicio/fin */}
      <div 
        className={`w-32 h-32 border-2 ${getStatusColor()} rounded-full flex flex-col items-center justify-center space-y-2 bg-background`}
      >
        <div className="flex items-center space-x-1">
          {getIcon()}
          <h4 className="font-medium text-sm">{data.label}</h4>
        </div>
        <Badge className={`text-xs ${getBadgeColor()}`}>
          {data.status || 'pending'}
        </Badge>
      </div>
    </>
  );
});

StartEndNode.displayName = 'StartEndNode';

export default StartEndNode;