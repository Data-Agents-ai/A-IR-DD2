import React, { useState } from 'react';
import { Agent, LLMConfig, RobotId } from '../types';
import { useDesignStore } from '../stores/useDesignStore';
import { AgentFormModal } from './modals/AgentFormModal';
import { AgentDeletionConfirmModal } from './modals/AgentDeletionConfirmModal';
import { WorkflowValidationModal } from './modals/WorkflowValidationModal';
import { TemplateSelectionModal } from './modals/TemplateSelectionModal';
import { PrototypeImpactModal } from './modals/PrototypeImpactModal';
import { Button, Card } from './UI';
import { PlusIcon, EditIcon, CloseIcon, WrenchIcon } from './Icons';
import { useLocalization } from '../hooks/useLocalization';
import { useNotifications } from '../contexts/NotificationContext';
import { AgentTemplate, createAgentFromTemplate } from '../data/agentTemplates';

interface ArchiPrototypingPageProps {
  llmConfigs: LLMConfig[];
  onNavigateToWorkflow?: () => void;
}

export const ArchiPrototypingPage: React.FC<ArchiPrototypingPageProps> = ({ 
  llmConfigs, 
  onNavigateToWorkflow 
}) => {
  const { t } = useLocalization();
  const { addNotification } = useNotifications();
  const { 
    agents, 
    addAgent, 
    updateAgent, 
    deleteAgent, 
    selectAgent, 
    selectedAgentId, 
    addNode, 
    addAgentInstance,
    getPrototypeImpact
  } = useDesignStore();
  
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [addedAgentPopup, setAddedAgentPopup] = useState<{ agent: Agent; nodeId: string } | null>(null);
  
  // PHASE 2A: Confirmation modals
  const [deletionConfirmOpen, setDeletionConfirmOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  
  // PHASE 2A: Workflow validation
  const [workflowValidationOpen, setWorkflowValidationOpen] = useState(false);
  const [agentToAdd, setAgentToAdd] = useState<Agent | null>(null);
  
  // PHASE 2B: Template selection
  const [templateSelectionOpen, setTemplateSelectionOpen] = useState(false);
  
  // Prototype Impact Confirmation
  const [impactConfirmOpen, setImpactConfirmOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{ agentId: string; agentData: Omit<Agent, 'id'> } | null>(null);
  
  const handleCreateAgent = () => {
    setEditingAgent(null);
    setAgentModalOpen(true);
  };
  
  // PHASE 2B: Template-based agent creation
  const handleCreateFromTemplate = () => {
    setTemplateSelectionOpen(true);
  };
  
  const handleTemplateSelected = (template: AgentTemplate) => {
    const agentData = createAgentFromTemplate(template.id);
    if (agentData) {
      setEditingAgent({ ...agentData, id: 'temp' } as Agent);
      setTemplateSelectionOpen(false);
      setAgentModalOpen(true);
      
      addNotification({
        type: 'info',
        title: 'Template chargé',
        message: `Template "${template.name}" prêt à personnaliser.`,
        duration: 3000
      });
    }
  };
  
  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setAgentModalOpen(true);
  };
  
  const handleAddToWorkflow = (agent: Agent) => {
    // PHASE 2A: Show validation modal first
    setAgentToAdd(agent);
    setWorkflowValidationOpen(true);
  };
  
  const confirmAddToWorkflow = () => {
    if (!agentToAdd) return;
    
    // Anti-collision: Find a position that doesn't overlap with existing nodes
    const existingNodes = useDesignStore.getState().nodes;
    const nodeWidth = 384; // 96 * 4 (w-96 in Tailwind)
    const nodeHeight = 400; // Approximate height
    const margin = 20; // Margin between nodes
    
    let position = { x: 50, y: 50 };
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      let hasCollision = false;
      
      for (const existingNode of existingNodes) {
        const existingPos = existingNode.position;
        const distance = Math.sqrt(
          Math.pow(position.x - existingPos.x, 2) + 
          Math.pow(position.y - existingPos.y, 2)
        );
        
        // Check if nodes would overlap (considering their size + margin)
        const minDistance = Math.sqrt(
          Math.pow(nodeWidth + margin, 2) + 
          Math.pow(nodeHeight + margin, 2)
        ) / 2;
        
        if (distance < minDistance) {
          hasCollision = true;
          break;
        }
      }
      
      if (!hasCollision) {
        break; // Found a good position
      }
      
      // Try next position in a spiral pattern
      attempts++;
      const angle = attempts * 0.5;
      const radius = 50 + attempts * 10;
      position = {
        x: 300 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle)
      };
    }
    
    // Create an agent instance
    const instanceName = `${agentToAdd.name} #${useDesignStore.getState().getInstanceCount(agentToAdd.id) + 1}`;
    const instanceId = addAgentInstance(agentToAdd.id, position, instanceName);
    
    // Get the created instance
    const agentInstance = useDesignStore.getState().agentInstances.find(inst => inst.id === instanceId);
    if (!agentInstance) {
      console.error('Failed to create agent instance');
      return;
    }
    
    // Create the workflow node
    const newNode = {
      type: 'agent' as const,
      position,
      data: {
        robotId: RobotId.Archi,
        label: agentInstance.name,
        agentInstance,
        isMinimized: false
      }
    };
    const nodeId = addNode(newNode);
    
    // Show confirmation popup with navigation option
    setAddedAgentPopup({ agent: agentToAdd, nodeId });
    
    // PHASE 2A: Success notification
    addNotification({
      type: 'success',
      title: 'Agent ajouté au workflow',
      message: `"${agentToAdd.name}" est maintenant disponible sur la canvas.`,
      duration: 3000
    });
    
    // Close validation modal
    setWorkflowValidationOpen(false);
    setAgentToAdd(null);
  };
  
  const handleSaveAgent = (agentData: Omit<Agent, 'id'>, agentId?: string) => {
    if (agentId) {
      // Check impact before updating existing agent
      const impact = getPrototypeImpact(agentId);
      
      if (impact.instanceCount > 0) {
        // There are instances affected, show confirmation
        setPendingUpdate({ agentId, agentData });
        setImpactConfirmOpen(true);
        return;
      } else {
        // No instances affected, proceed directly
        proceedWithUpdate(agentId, agentData);
      }
    } else {
      // Create new
      addAgent(agentData);
      addNotification({
        type: 'success',
        title: 'Agent créé',
        message: `"${agentData.name}" a été créé avec succès.`,
        duration: 3000
      });
    }
    setAgentModalOpen(false);
    setEditingAgent(null);
  };
  
  const proceedWithUpdate = (agentId: string, agentData: Omit<Agent, 'id'>) => {
    updateAgent(agentId, agentData);
    addNotification({
      type: 'success',
      title: 'Agent modifié',
      message: `"${agentData.name}" a été mis à jour avec succès.`,
      duration: 3000
    });
  };
  
  const handleConfirmImpactUpdate = () => {
    if (pendingUpdate) {
      proceedWithUpdate(pendingUpdate.agentId, pendingUpdate.agentData);
      setPendingUpdate(null);
      setImpactConfirmOpen(false);
      setAgentModalOpen(false);
      setEditingAgent(null);
    }
  };
  
  const handleCancelImpactUpdate = () => {
    setPendingUpdate(null);
    setImpactConfirmOpen(false);
  };
  
  // PHASE 2A: Enhanced deletion with confirmation
  const handleDeleteAgent = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setAgentToDelete(agent);
      setDeletionConfirmOpen(true);
    }
  };
  
  const confirmDeletion = () => {
    if (agentToDelete) {
      const affectedInstances = useDesignStore.getState().getInstancesOfPrototype(agentToDelete.id);
      
      deleteAgent(agentToDelete.id);
      
      // PHASE 2A: Success notification with impact details
      addNotification({
        type: 'success',
        title: 'Agent supprimé',
        message: affectedInstances.length > 0 
          ? `"${agentToDelete.name}" et ses ${affectedInstances.length} instance(s) ont été supprimés.`
          : `"${agentToDelete.name}" a été supprimé avec succès.`,
        duration: 4000
      });
      
      setDeletionConfirmOpen(false);
      setAgentToDelete(null);
    }
  };
  
  const cancelDeletion = () => {
    setDeletionConfirmOpen(false);
    setAgentToDelete(null);
  };
  
  const cancelWorkflowValidation = () => {
    setWorkflowValidationOpen(false);
    setAgentToAdd(null);
  };
  
  const cancelTemplateSelection = () => {
    setTemplateSelectionOpen(false);
  };
  
  return (
    <div className="h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <WrenchIcon className="w-8 h-8 text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Prototypage d'Agents</h1>
            <p className="text-gray-400 text-sm">Créez et configurez les agents IA pour votre workflow</p>
          </div>
        </div>
      </div>
      
      {/* Actions Bar */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {agents.length} prototype(s) créé(s)
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={handleCreateFromTemplate}
              className="flex items-center space-x-2"
              variant="secondary"
            >
              <span>📋</span>
              <span>Template</span>
            </Button>
            <Button 
              onClick={handleCreateAgent}
              className="flex items-center space-x-2"
              variant="primary"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Nouvel Agent</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Prototypes Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <WrenchIcon className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">Aucun prototype d'agent</h3>
            <p className="text-gray-500 mb-6 max-w-md">
              Commencez par créer votre premier agent. Définissez son rôle, ses capacités 
              et les outils qu'il peut utiliser.
            </p>
            <div className="flex space-x-3">
              <Button onClick={handleCreateFromTemplate} className="flex items-center space-x-2" variant="secondary">
                <span>📋</span>
                <span>Partir d'un Template</span>
              </Button>
              <Button onClick={handleCreateAgent} className="flex items-center space-x-2">
                <PlusIcon className="w-4 h-4" />
                <span>Créer le Premier Agent</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Card 
                key={agent.id} 
                className={`p-4 hover:border-indigo-500/50 transition-colors cursor-pointer relative ${
                  selectedAgentId === agent.id ? 'border-indigo-500 bg-indigo-900/20' : ''
                }`}
                onClick={() => selectAgent(agent.id)}
              >
                {/* Actions */}
                <div className="absolute top-2 right-2 flex space-x-1">
                  <Button
                    variant="ghost"
                    className="p-1 h-6 w-6 text-gray-400 hover:text-indigo-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAgent(agent);
                    }}
                  >
                    <EditIcon width={14} height={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    className="p-1 h-6 w-6 text-gray-400 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAgent(agent.id);
                    }}
                  >
                    <CloseIcon width={14} height={14} />
                  </Button>
                </div>
                
                {/* Content */}
                <div className="pr-12">
                  <h3 className="font-semibold text-lg text-indigo-400 mb-1 truncate">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3 truncate">
                    {agent.role}
                  </p>
                  <p className="text-sm text-gray-300 line-clamp-3 mb-4">
                    {agent.systemPrompt}
                  </p>
                  
                  {/* Metadata */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Fournisseur</span>
                      <span className="text-gray-300">{agent.llmProvider}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Modèle</span>
                      <span className="text-gray-300">{agent.model}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Capacités</span>
                      <span className="text-gray-300">{agent.capabilities.length}</span>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <Button
                    variant="secondary"
                    className="w-full text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToWorkflow(agent);
                    }}
                  >
                    Ajouter au Workflow
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Agent Form Modal */}
      {agentModalOpen && (
        <AgentFormModal
          onClose={() => {
            setAgentModalOpen(false);
            setEditingAgent(null);
          }}
          onSave={handleSaveAgent}
          llmConfigs={llmConfigs}
          existingAgent={editingAgent}
        />
      )}
      
      {/* Popup de confirmation d'ajout au workflow */}
      {addedAgentPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              ✅ Agent ajouté au workflow
            </h3>
            <p className="text-gray-300 mb-4">
              L'agent <span className="font-semibold text-indigo-400">"{addedAgentPopup.agent.name}"</span> a été 
              ajouté au workflow avec succès !
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setAddedAgentPopup(null)}
                className="flex-1"
              >
                Continuer ici
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setAddedAgentPopup(null);
                  if (onNavigateToWorkflow) {
                    onNavigateToWorkflow();
                  }
                }}
                className="flex-1"
              >
                Voir sur workflow
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2A: Agent Deletion Confirmation Modal */}
      <AgentDeletionConfirmModal
        isOpen={deletionConfirmOpen}
        agent={agentToDelete}
        onConfirm={confirmDeletion}
        onCancel={cancelDeletion}
      />

      {/* PHASE 2A: Workflow Validation Modal */}
      <WorkflowValidationModal
        isOpen={workflowValidationOpen}
        agent={agentToAdd}
        llmConfigs={llmConfigs}
        onConfirm={confirmAddToWorkflow}
        onCancel={cancelWorkflowValidation}
      />

      {/* PHASE 2B: Template Selection Modal */}
      <TemplateSelectionModal
        isOpen={templateSelectionOpen}
        robotId={RobotId.Archi}
        onSelectTemplate={handleTemplateSelected}
        onCancel={cancelTemplateSelection}
      />

      {/* Prototype Impact Confirmation Modal */}
      <PrototypeImpactModal
        isOpen={impactConfirmOpen}
        prototype={pendingUpdate ? agents.find(a => a.id === pendingUpdate.agentId) : null}
        impact={pendingUpdate ? getPrototypeImpact(pendingUpdate.agentId) : null}
        onConfirm={handleConfirmImpactUpdate}
        onCancel={handleCancelImpactUpdate}
      />
    </div>
  );
};