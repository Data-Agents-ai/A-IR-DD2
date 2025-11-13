import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { V2AgentNode } from './V2AgentNode';
import { WorkflowCanvasProvider } from '../contexts/WorkflowCanvasContext';
import { PrototypeEditConfirmationModal } from './modals/PrototypeEditConfirmationModal';
import { AgentFormModal } from './modals/AgentFormModal';
import { Agent, WorkflowNode, LLMConfig } from '../types';

interface WorkflowCanvasProps {
  nodes?: WorkflowNode[];
  llmConfigs?: LLMConfig[];
  onDeleteNode?: (nodeId: string) => void;
  onUpdateNodeMessages?: (nodeId: string, messages: any[]) => void;
  onUpdateNodePosition?: (nodeId: string, position: { x: number; y: number }) => void;
  onToggleNodeMinimize?: (nodeId: string) => void;
  onOpenImagePanel?: (nodeId: string) => void;
  onOpenImageModificationPanel?: (nodeId: string) => void;
  onOpenFullscreen?: (nodeId: string) => void;
  agents?: Agent[];
  workflowNodes?: WorkflowNode[];
  onAddToWorkflow?: (agent: Agent) => void;
  onUpdateWorkflowNode?: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  onRemoveFromWorkflow?: (nodeId: string) => void;
  onNavigate?: (robotId: any, path: string) => void; // Pour navigation vers prototypage
}

// nodeTypes défini GLOBALEMENT pour éviter les re-créations
const NODE_TYPES = {
  customAgent: V2AgentNode,
};

// Mémoriser le composant ReactFlow pour éviter les re-renders
const MemoizedReactFlow = memo(ReactFlow);

// Composant interne avec isolation complète
const WorkflowCanvasInner = memo(function WorkflowCanvasInner(props: WorkflowCanvasProps) {
  const {
    nodes = [],
    llmConfigs = [],
    onDeleteNode,
    onUpdateNodeMessages,
    onUpdateNodePosition,
    onToggleNodeMinimize,
    onOpenImagePanel,
    onOpenImageModificationPanel,
    onOpenFullscreen,
    agents = [],
    workflowNodes = [],
    onAddToWorkflow,
    onUpdateWorkflowNode,
    onRemoveFromWorkflow,
    onNavigate
  } = props;  // Mémoriser nodeTypes pour éviter le warning React Flow
  const nodeTypes = useMemo(() => NODE_TYPES, []);

  // ISOLATION COMPLÈTE: un seul useState pour éviter les conflits React Flow
  const [internalState, setInternalState] = useState({
    showAgentForm: false,
    showPrototypeConfirm: false,
    selectedAgentForEdit: null as string | null,
    minimapReady: false, // Ajout pour contrôler le rendu de la MiniMap
  });

  // useRef pour TOUT stocker sans déclencher de re-render
  const stableRefs = useRef({
    callbacks: {
      onDeleteNode: onDeleteNode || (() => { }),
      onUpdateNodeMessages: onUpdateNodeMessages || (() => { }),
      onUpdateNodePosition: onUpdateNodePosition || (() => { }),
      onToggleNodeMinimize: onToggleNodeMinimize || (() => { }),
      onOpenImagePanel: onOpenImagePanel || (() => { }),
      onOpenImageModificationPanel: onOpenImageModificationPanel || (() => { }),
      onOpenFullscreen: onOpenFullscreen || (() => { })
    },
    actualNodes: [] as WorkflowNode[],
    agents: [] as Agent[],
    reactFlowNodes: [] as Node[],
    nodeTypes: NODE_TYPES
  });

  // Hooks React Flow - MAIS nous allons les contrôler manuellement
  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Calculer actualNodes de manière stable
  const actualNodes = useMemo(() => {
    return (nodes && nodes.length > 0) ? nodes : workflowNodes;
  }, [nodes, workflowNodes]);

  // Mettre à jour les références SANS déclencher de re-render
  stableRefs.current.callbacks = {
    onDeleteNode: onDeleteNode || (() => { }),
    onUpdateNodeMessages: onUpdateNodeMessages || (() => { }),
    onUpdateNodePosition: onUpdateNodePosition || (() => { }),
    onToggleNodeMinimize: onToggleNodeMinimize || (() => { }),
    onOpenImagePanel: onOpenImagePanel || (() => { }),
    onOpenImageModificationPanel: onOpenImageModificationPanel || (() => { }),
    onOpenFullscreen: onOpenFullscreen || (() => { })
  };

  stableRefs.current.actualNodes = actualNodes;
  stableRefs.current.agents = agents;

  // SOLUTION ANTI-BOUCLE: useEffect unique et stable pour éviter les conflits
  useEffect(() => {
    if (actualNodes && actualNodes.length > 0) {
      const newReactFlowNodes: Node[] = actualNodes.map((wfNode, index) => ({
        id: wfNode.id || `node-${index}`,
        type: 'customAgent',
        position: wfNode.position || { x: 100 + index * 200, y: 100 + index * 150 },
        data: {
          robotId: wfNode.agent?.id || 'unknown',
          label: wfNode.agent?.name || 'Agent',
          agent: wfNode.agent, // Utiliser directement wfNode.agent au lieu de chercher dans la liste
          agentInstance: wfNode,
          isMinimized: wfNode.isMinimized || false
        },
      }));

      // Comparaison intelligente pour éviter les mises à jour inutiles
      setReactFlowNodes(currentNodes => {
        // Vérifier si les nodes ont réellement changé
        if (currentNodes.length !== newReactFlowNodes.length) {
          return newReactFlowNodes;
        }

        const hasChanged = newReactFlowNodes.some((newNode, index) => {
          const currentNode = currentNodes[index];
          return !currentNode ||
            currentNode.id !== newNode.id ||
            currentNode.position.x !== newNode.position.x ||
            currentNode.position.y !== newNode.position.y ||
            currentNode.data.robotId !== newNode.data.robotId ||
            currentNode.data.label !== newNode.data.label ||
            currentNode.data.isMinimized !== newNode.data.isMinimized;
        });

        return hasChanged ? newReactFlowNodes : currentNodes;
      });
    } else {
      setReactFlowNodes(currentNodes => currentNodes.length > 0 ? [] : currentNodes);
    }
  }, [actualNodes]); // Suppression de la dépendance agents pour éviter les conflits

  // useEffect pour initialiser la MiniMap après que le composant soit monté
  useEffect(() => {
    const timer = setTimeout(() => {
      setInternalState(prev => ({ ...prev, minimapReady: true }));
    }, 100); // Délai court pour laisser le temps aux dimensions de se calculer

    return () => clearTimeout(timer);
  }, []);

  // Handlers stables avec useCallback
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges]);

  const handleEditPrototype = useCallback((nodeId: string) => {
    setInternalState(prev => ({
      ...prev,
      selectedAgentForEdit: nodeId,
      showPrototypeConfirm: true
    }));
  }, []);

  const handleConfirmPrototypeEdit = useCallback(() => {
    const { selectedAgentForEdit } = internalState;
    if (selectedAgentForEdit) {
      const currentActualNodes = stableRefs.current.actualNodes;
      const currentAgents = stableRefs.current.agents;
      const workflowNode = currentActualNodes.find(wf => wf && wf.id === selectedAgentForEdit);
      if (workflowNode) {
        const agent = Array.isArray(currentAgents) ? currentAgents.find(a => a && a.id === workflowNode.agentId) : null;
        if (agent) {
          setInternalState(prev => ({
            ...prev,
            showAgentForm: true,
            showPrototypeConfirm: false,
            selectedAgentForEdit: null
          }));
        }
      }
    }
  }, [internalState]);

  const handleCancelPrototypeEdit = useCallback(() => {
    setInternalState(prev => ({
      ...prev,
      showPrototypeConfirm: false,
      selectedAgentForEdit: null
    }));
  }, []);

  // Valeur du contexte - stable et mémorisée
  const contextValue = useMemo(() => ({
    onEditPrototype: handleEditPrototype,
    navigationHandler: onNavigate,
    onDeleteNode,
    onToggleNodeMinimize,
    onUpdateNodePosition,
  }), [handleEditPrototype, onNavigate, onDeleteNode, onToggleNodeMinimize, onUpdateNodePosition]);

  return (
    <WorkflowCanvasProvider value={contextValue}>
      <div className="h-full w-full relative overflow-hidden">
        {/* Blur Racing Game Style - Futuristic Neon Background */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-800 to-black"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
              linear-gradient(-45deg, rgba(255, 0, 255, 0.1) 0%, transparent 50%),
              linear-gradient(90deg, rgba(0, 255, 0, 0.05) 0%, transparent 100%)
            `
          }}
        >
          {/* Racing Track Grid Pattern */}
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 98px,
                  rgba(0, 255, 255, 0.3) 100px
                ),
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 98px,
                  rgba(255, 0, 255, 0.3) 100px
                )
              `
            }}
          ></div>

          {/* Speed Lines Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent transform -skew-x-12 animate-pulse"></div>

          {/* Neon Particles Racing Style */}
          <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-cyan-400 rounded-full animate-ping shadow-lg shadow-cyan-400/50"></div>
          <div className="absolute top-3/4 right-1/3 w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse shadow-lg shadow-fuchsia-400/50"></div>
          <div className="absolute bottom-1/4 left-2/3 w-4 h-4 bg-lime-400 rounded-full animate-bounce shadow-lg shadow-lime-400/50"></div>
          <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-orange-400 rounded-full animate-ping shadow-lg shadow-orange-400/50"></div>

          {/* Racing Speed Streaks */}
          <div className="absolute top-10 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
          <div className="absolute bottom-20 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent animate-pulse delay-500"></div>
        </div>

        <MemoizedReactFlow
          key="workflow-canvas-main" // Clé unique pour éviter les re-créations
          nodes={reactFlowNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: 'transparent' }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          {/* MiniMap protégée contre les erreurs NaN */}
          {internalState.minimapReady && (
            <MiniMap
              key="minimap-unique"
              width={200}
              height={140}
              nodeStrokeColor="#00ffff"
              nodeColor="#1a1a1a"
              nodeBorderRadius={8}
              position="bottom-right"
              pannable
              zoomable
              maskColor="rgba(0, 20, 40, 0.6)"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(26, 26, 26, 0.9) 50%, rgba(51, 51, 51, 0.95) 100%)',
                border: '2px solid rgba(0, 255, 255, 0.7)',
                borderRadius: '12px',
                opacity: 0.95
              }}
            />
          )}
          <Controls
            key="controls-unique" // Clé unique pour éviter les dédoublements
            position="top-right"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(26, 26, 26, 0.8) 100%)',
              border: '2px solid rgba(255, 0, 255, 0.6)',
              borderRadius: '10px',
              boxShadow: `
                0 0 20px rgba(255, 0, 255, 0.4),
                0 0 40px rgba(255, 0, 255, 0.2),
                0 8px 25px rgba(0, 0, 0, 0.7),
                inset 0 1px 0 rgba(255, 0, 255, 0.2)
              `,
              backdropFilter: 'blur(12px)'
            }}
          />
        </MemoizedReactFlow>

        {/* Bouton flottant redirection vers prototypage Archi - Style Blur futuriste */}
        {onAddToWorkflow && onNavigate && (
          <button
            onClick={() => onNavigate('AR_001', '/archi/prototyping')}
            className="absolute bottom-8 left-8 group"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 0, 0, 0.8) 100%)',
              border: '2px solid rgba(0, 255, 255, 0.6)',
              borderRadius: '16px',
              boxShadow: `
                0 0 25px rgba(0, 255, 255, 0.4),
                0 0 50px rgba(0, 255, 255, 0.2),
                0 8px 32px rgba(0, 0, 0, 0.8),
                inset 0 1px 0 rgba(0, 255, 255, 0.2)
              `,
              backdropFilter: 'blur(15px)',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#00ffff',
              textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `
                0 0 35px rgba(0, 255, 255, 0.6),
                0 0 70px rgba(0, 255, 255, 0.3),
                0 12px 40px rgba(0, 0, 0, 0.9)
              `;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = `
                0 0 25px rgba(0, 255, 255, 0.4),
                0 0 50px rgba(0, 255, 255, 0.2),
                0 8px 32px rgba(0, 0, 0, 0.8),
                inset 0 1px 0 rgba(0, 255, 255, 0.2)
              `;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Prototype Agent
            </span>
          </button>
        )}

        {/* Modal de confirmation d'édition de prototype */}
        <PrototypeEditConfirmationModal
          isOpen={internalState.showPrototypeConfirm}
          agentName={internalState.selectedAgentForEdit ?
            reactFlowNodes.find(n => n.id === internalState.selectedAgentForEdit)?.data?.workflowNode?.name || 'Agent'
            : 'Agent'
          }
          onConfirm={handleConfirmPrototypeEdit}
          onCancel={handleCancelPrototypeEdit}
        />

        {/* Modal de formulaire d'agent */}
        {internalState.showAgentForm && (
          <AgentFormModal
            onClose={() => setInternalState(prev => ({ ...prev, showAgentForm: false }))}
            onSave={(agentData) => {
              // Générer un ID pour l'agent si pas fourni
              const agentWithId: Agent = {
                ...agentData,
                id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              };
              if (onAddToWorkflow) onAddToWorkflow(agentWithId);
              setInternalState(prev => ({ ...prev, showAgentForm: false }));
            }}
            llmConfigs={llmConfigs}
            existingAgent={null}
          />
        )}
      </div>
    </WorkflowCanvasProvider>
  );
});

// Export par défaut - composant wrapper simple et mémorisé
export default memo(function WorkflowCanvas(props: WorkflowCanvasProps) {
  return <WorkflowCanvasInner {...props} />;
});
