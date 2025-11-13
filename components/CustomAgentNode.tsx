import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { AgentNode } from './AgentNode';
import { useWorkflowCanvasContext } from '../contexts/WorkflowCanvasContext';

interface CustomAgentNodeProps {
  data: {
    workflowNode: any;
    agent: any;
    llmConfigs?: any[];
    getCallbacks?: () => {
      onDeleteNode: (nodeId: string) => void;
      onUpdateNodeMessages: (nodeId: string, messages: any[]) => void;
      onUpdateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
      onToggleNodeMinimize: (nodeId: string) => void;
      onOpenImagePanel: (nodeId: string) => void;
      onOpenImageModificationPanel: (nodeId: string) => void;
      onOpenFullscreen: (nodeId: string) => void;
    };
  };
  id: string;
}

export const CustomAgentNode = memo(function CustomAgentNode({ data, id }: CustomAgentNodeProps) {
  const context = useWorkflowCanvasContext();
  
  // Obtenir les callbacks depuis getCallbacks() si disponible
  const callbacks = data.getCallbacks ? data.getCallbacks() : {
    onDeleteNode: () => {},
    onUpdateNodeMessages: () => {},
    onUpdateNodePosition: () => {},
    onToggleNodeMinimize: () => {},
    onOpenImagePanel: () => {},
    onOpenImageModificationPanel: () => {},
    onOpenFullscreen: () => {}
  };

  return (
    <div className="custom-agent-node">
      <Handle type="target" position={Position.Top} />
      
      <AgentNode
        node={data.workflowNode}
        llmConfigs={data.llmConfigs || []}
        onDelete={callbacks.onDeleteNode}
        onUpdateMessages={callbacks.onUpdateNodeMessages}
        onToggleMinimize={callbacks.onToggleNodeMinimize}
        onOpenImagePanel={callbacks.onOpenImagePanel}
        onOpenImageModificationPanel={callbacks.onOpenImageModificationPanel}
        onOpenFullscreen={callbacks.onOpenFullscreen}
        onDragStart={() => {}}
      />
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
