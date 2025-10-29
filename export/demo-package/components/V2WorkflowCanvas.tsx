import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  OnConnect,
  OnNodesChange,
  NodeChange,
  Controls,
  MiniMap,
  Background,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { V2AgentNode, V2AgentNodeData } from './V2AgentNode';
import { useDesignStore } from '../stores/useDesignStore';
import { useRuntimeStore } from '../stores/useRuntimeStore';
import { V2WorkflowNode, V2WorkflowEdge } from '../types';

// Define custom node types
const nodeTypes: NodeTypes = {
  agent: V2AgentNode,
};

interface V2WorkflowCanvasProps {
  className?: string;
}

export const V2WorkflowCanvas: React.FC<V2WorkflowCanvasProps> = ({ className = '' }) => {
  const { nodes: designNodes, edges: designEdges, addEdge: addDesignEdge, updateNode, getResolvedInstance } = useDesignStore();
  const { nodeMessages } = useRuntimeStore();
  
  // Anti-collision constants (match ArchiPrototypingPage)
  const NODE_WIDTH = 384;
  const NODE_HEIGHT = 400;
  const COLLISION_MARGIN = 20;
  
  // Check if two rectangles collide
  const checkCollision = (pos1: { x: number; y: number }, pos2: { x: number; y: number }): boolean => {
    const rect1 = {
      left: pos1.x,
      right: pos1.x + NODE_WIDTH,
      top: pos1.y,
      bottom: pos1.y + NODE_HEIGHT,
    };
    
    const rect2 = {
      left: pos2.x,
      right: pos2.x + NODE_WIDTH,
      top: pos2.y,
      bottom: pos2.y + NODE_HEIGHT,
    };
    
    // Check overlap with margin
    const margin = COLLISION_MARGIN;
    return !(
      rect1.right + margin < rect2.left ||
      rect1.left > rect2.right + margin ||
      rect1.bottom + margin < rect2.top ||
      rect1.top > rect2.bottom + margin
    );
  };
  
  // Convert design store data to React Flow format
  const flowNodes: Node[] = designNodes
    .filter(node => node.data.agentInstance) // Only include nodes with agent instances
    .map((node) => {
      const resolved = getResolvedInstance(node.data.agentInstance!.id);
      if (!resolved) return null;
      
      return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          robotId: node.data.robotId,
          label: node.data.label,
          agent: resolved.prototype, // Pass the resolved prototype for V2AgentNode compatibility
          agentInstance: resolved.instance, // Also pass the instance data
          isMinimized: node.data.isMinimized
          // Note: messages are handled directly by V2AgentNode via useRuntimeStore
        }
      };
    })
    .filter(Boolean) as Node[];
  
  const flowEdges: Edge[] = designEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type || 'default',
    label: edge.data?.label
  }));
  
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);
  
  // Anti-collision handler on drag stop
  const onNodeDragStop = useCallback((event: any, node: Node) => {
    // Check if this position would collide with any other node
    const otherNodes = nodes.filter(n => n.id !== node.id);
    
    const hasCollision = otherNodes.some(otherNode => 
      checkCollision(node.position, otherNode.position)
    );
    
    if (hasCollision) {
      // Find original position from design store
      const originalNode = designNodes.find(n => n.id === node.id);
      if (originalNode) {
        // Force immediate revert
        setTimeout(() => {
          setNodes(currentNodes => 
            currentNodes.map(n => 
              n.id === node.id ? { ...n, position: originalNode.position } : n
            )
          );
        }, 0);
        return; // Don't update store with collision position
      }
    } else {
      // Update the design store with the new position
      updateNode(node.id, { 
        position: node.position,
        data: {
          ...node.data,
          agentInstance: node.data.agentInstance ? {
            ...node.data.agentInstance,
            position: node.position
          } : undefined
        }
      });
    }
  }, [nodes, designNodes, updateNode, checkCollision, setNodes]);
  
  // Custom nodes change handler that excludes position updates (handled by onNodeDragStop)
  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    // Filter out position-related changes to avoid conflicts with onNodeDragStop
    const filteredChanges = changes.filter(change => {
      if (change.type === 'position') return false; // Position handled by onNodeDragStop
      return true; // Allow other changes (selection, dimensions, etc.)
    });
    
    if (filteredChanges.length > 0) {
      onNodesChange(filteredChanges);
    }
  }, [onNodesChange]);
  
  // Remove the custom handleNodesChange since we'll use onNodeDragStop instead
  // const handleNodesChange: OnNodesChange = useCallback(...);
  
  const onConnect: OnConnect = useCallback((connection) => {
    if (connection.source && connection.target) {
      const newEdge: Omit<V2WorkflowEdge, 'id'> = {
        source: connection.source,
        target: connection.target,
        type: 'default'
      };
      addDesignEdge(newEdge);
      
      // Also update local state for immediate UI feedback
      setEdges((eds) => addEdge(connection, eds));
    }
  }, [addDesignEdge, setEdges]);
  
  // Sync store changes to local state
  React.useEffect(() => {
    setNodes(flowNodes);
  }, [designNodes, nodeMessages]); // Include nodeMessages for message updates
  
  React.useEffect(() => {
    setEdges(flowEdges);
  }, [designEdges]);
  
  return (
    <div className={`h-full w-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        dragHandle=".drag-handle"
        fitView
        className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
      >
        <Background 
          color="#06b6d4" 
          gap={20}
          size={1}
          style={{
            background: `
              radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              linear-gradient(to bottom right, #0f172a, #1e293b)
            `
          }}
        />
        <MiniMap 
          className="bg-gray-800/80 border border-cyan-500/30 rounded-lg backdrop-blur-sm"
          nodeColor="#06b6d4"
          maskColor="rgba(0, 0, 0, 0.7)"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))'
          }}
        />
        <Controls 
          className="bg-gray-800/80 border border-cyan-500/30 text-cyan-100 rounded-lg backdrop-blur-sm
                     [&>button]:text-cyan-100 [&>button:hover]:text-cyan-300 [&>button:hover]:bg-cyan-500/20"
        />
      </ReactFlow>
      
      {/* Empty State with futuristic styling */}
      {designNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400 bg-gray-900/40 border border-cyan-500/20 rounded-xl p-8 backdrop-blur-sm">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 border-2 border-cyan-500/30 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-cyan-100">Workflow Canvas</h3>
            <p className="text-sm text-gray-400 max-w-md">
              Utilisez le menu <span className="text-cyan-400 font-medium">Archi → Prototypage</span> pour créer des agents,<br />
              puis glissez-les sur ce canvas pour construire votre workflow.
            </p>
            <div className="flex justify-center mt-4 space-x-1">
              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-75"></div>
              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};