import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Import our workflow components
import { BaseWorkflowNode } from './BaseWorkflowNode';
import { ArchiWorkflowNode } from './ArchiWorkflowNode';
import { WorkflowToolbar } from './WorkflowToolbar';
import { NodePalette } from './NodePalette';
import { NodeConfigPanel } from './NodeConfigPanel';

// Import stores and utilities
import { useWorkflowStore } from '../../stores/useWorkflowStore';
import { useLocalization } from '../../hooks/useLocalization';

// Node type mapping for React Flow
const nodeTypes = {
  archi: ArchiWorkflowNode,
  com: BaseWorkflowNode,
  phil: BaseWorkflowNode,
  tim: BaseWorkflowNode,
  bos: BaseWorkflowNode,
};

interface EnhancedV2WorkflowCanvasProps {
  className?: string;
}

export const EnhancedV2WorkflowCanvas: React.FC<EnhancedV2WorkflowCanvasProps> = ({ 
  className = '' 
}) => {
  const { t } = useLocalization();
  const {
    currentWorkflow,
    selectedNodeId,
    isPaletteOpen,
    addNode,
    addEdge,
    updateNode,
    selectNode,
    loadFromLocalStorage,
  } = useWorkflowStore();

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load data on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Sync workflow data with React Flow
  useEffect(() => {
    if (currentWorkflow) {
      // Convert workflow nodes to React Flow nodes
      const flowNodes = currentWorkflow.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          ...node.data,
          isSelected: node.id === selectedNodeId,
          onSelect: () => selectNode(node.id),
        },
        selected: node.id === selectedNodeId,
      }));

      // Convert workflow edges to React Flow edges
      const flowEdges = currentWorkflow.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type || 'default',
        animated: edge.type === 'success',
        style: getEdgeStyle(edge.type),
        data: edge.data,
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [currentWorkflow, selectedNodeId, selectNode, setNodes, setEdges]);

  // Handle node changes from React Flow
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    
    // Update positions in workflow store
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        updateNode(change.id, { position: change.position });
      }
    });
  }, [onNodesChange, updateNode]);

  // Handle edge changes from React Flow
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    // TODO: Update workflow store if needed
  }, [onEdgesChange]);

  // Handle new connections
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      const newEdge = {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        type: 'default' as const,
      };
      
      addEdge(newEdge);
    }
  }, [addEdge]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    selectNode(node.id);
  }, [selectNode]);

  // Handle dropping nodes from palette
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const reactFlowBounds = (event.target as Element).getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow');
    
    if (!type) return;
    
    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    };

    // Parse the dropped node template
    const nodeTemplate = JSON.parse(type);
    
    addNode({
      type: nodeTemplate.type,
      position,
      data: {
        ...nodeTemplate.data,
        robotId: nodeTemplate.robotId,
      },
    });
  }, [addNode]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Get edge styling based on type
  const getEdgeStyle = (edgeType?: string) => {
    switch (edgeType) {
      case 'success':
        return { stroke: '#10b981', strokeWidth: 2 };
      case 'error':
        return { stroke: '#ef4444', strokeWidth: 2 };
      case 'conditional':
        return { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5,5' };
      default:
        return { stroke: '#6b7280', strokeWidth: 1 };
    }
  };

  // Get node color for minimap
  const getNodeColor = (node: Node) => {
    switch (node.type) {
      case 'archi': return '#06b6d4'; // cyan
      case 'com': return '#3b82f6';   // blue
      case 'phil': return '#8b5cf6'; // purple
      case 'tim': return '#f97316';   // orange
      case 'bos': return '#ef4444';   // red
      default: return '#6b7280';      // gray
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Workflow Toolbar */}
      <WorkflowToolbar />
      
      {/* Main Canvas Area */}
      <div className="flex flex-1 relative">
        {/* Node Palette */}
        {isPaletteOpen && (
          <div className="w-64 border-r border-gray-200 dark:border-gray-700">
            <NodePalette />
          </div>
        )}
        
        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          {currentWorkflow ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              className="bg-gray-50 dark:bg-gray-900"
              defaultEdgeOptions={{
                animated: false,
                style: { strokeWidth: 1, stroke: '#6b7280' }
              }}
            >
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={20} 
                size={1}
                color="#9ca3af"
              />
              <Controls 
                position="bottom-left"
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md"
              />
              <MiniMap 
                nodeColor={getNodeColor}
                position="bottom-right"
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md"
                pannable
                zoomable
              />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-4-4h3V9h2v4h3l-4 4z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t('workflow_empty_title')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                  Create a new workflow or load an existing one to start building your robot automation.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Node Configuration Panel */}
        <NodeConfigPanel />
      </div>
    </div>
  );
};