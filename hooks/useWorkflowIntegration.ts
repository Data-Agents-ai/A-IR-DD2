import { useEffect, useCallback } from 'react';
import { useWorkflowStore } from '../stores/useWorkflowStore';
import { useRobotManagementStore } from '../stores/useRobotManagementStore';
import { RobotId } from '../types';

/**
 * Hook personnalisé pour intégrer le Workflow Editor dans l'application V2
 * Fournit une interface simplifiée pour les principales opérations workflow
 */
export const useWorkflowIntegration = () => {
  const workflowStore = useWorkflowStore();
  const { getActiveInterface } = useRobotManagementStore();
  
  // Auto-load data on mount
  useEffect(() => {
    workflowStore.loadFromLocalStorage();
  }, []);
  
  // Auto-save on workflow changes
  useEffect(() => {
    if (workflowStore.currentWorkflow) {
      const timeoutId = setTimeout(() => {
        workflowStore.saveToLocalStorage();
      }, 1000); // Debounce saves
      
      return () => clearTimeout(timeoutId);
    }
  }, [workflowStore.currentWorkflow]);
  
  /**
   * Create a new workflow with robot governance validation
   */
  const createWorkflow = useCallback((name: string, robotId: RobotId) => {
    const activeInterface = getActiveInterface();
    
    // Validate robot permissions
    if (activeInterface !== robotId && activeInterface !== RobotId.Archi) {
      throw new Error(`Robot ${activeInterface} cannot create workflows for ${robotId}. Only Archi can manage workflows.`);
    }
    
    return workflowStore.createWorkflow(name, robotId);
  }, [workflowStore, getActiveInterface]);
  
  /**
   * Add a robot-specific node with governance validation
   */
  const addRobotNode = useCallback((robotId: RobotId, nodeData: any) => {
    const activeInterface = getActiveInterface();
    
    // Validate robot can create this node type
    if (activeInterface !== robotId && activeInterface !== RobotId.Archi) {
      throw new Error(`Robot ${activeInterface} cannot create ${robotId} nodes. Switch to ${robotId} interface.`);
    }
    
    // Map RobotId to workflow node type
    const nodeTypeMap: Record<RobotId, 'archi' | 'com' | 'phil' | 'tim' | 'bos'> = {
      [RobotId.Archi]: 'archi',
      [RobotId.Com]: 'com',
      [RobotId.Phil]: 'phil',
      [RobotId.Tim]: 'tim',
      [RobotId.Bos]: 'bos',
    };
    
    return workflowStore.addNode({
      type: nodeTypeMap[robotId],
      position: nodeData.position || { x: 100, y: 100 },
      data: {
        ...nodeData,
        robotId,
        creator_id: activeInterface,
        created_at: new Date().toISOString(),
      }
    });
  }, [workflowStore, getActiveInterface]);
  
  /**
   * Quick workflow validation with detailed feedback
   */
  const validateWorkflow = useCallback(() => {
    const { currentWorkflow } = workflowStore;
    if (!currentWorkflow) return { isValid: false, errors: ['No workflow loaded'] };
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check basic structure
    if (currentWorkflow.nodes.length === 0) {
      errors.push('Workflow must contain at least one node');
    }
    
    // Check robot specialization compliance
    const robotNodes = currentWorkflow.nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Validate robot node distribution
    if (robotNodes.archi && robotNodes.archi > 3) {
      warnings.push('Too many Archi nodes may impact performance');
    }
    
    if (robotNodes.com && !robotNodes.phil) {
      warnings.push('Com nodes typically require Phil for data processing');
    }
    
    if (robotNodes.tim && !robotNodes.bos) {
      warnings.push('Tim scheduling nodes should include Bos monitoring');
    }
    
    // Check connectivity
    const connectedNodes = new Set<string>();
    currentWorkflow.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    const orphanNodes = currentWorkflow.nodes.filter(node => 
      !connectedNodes.has(node.id) && currentWorkflow.nodes.length > 1
    );
    
    if (orphanNodes.length > 0) {
      warnings.push(`${orphanNodes.length} nodes are not connected to the workflow`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalNodes: currentWorkflow.nodes.length,
        totalEdges: currentWorkflow.edges.length,
        robotDistribution: robotNodes,
        orphanNodes: orphanNodes.length,
      }
    };
  }, [workflowStore]);
  
  /**
   * Export workflow with metadata
   */
  const exportWorkflowWithMetadata = useCallback(() => {
    const { currentWorkflow } = workflowStore;
    if (!currentWorkflow) return null;
    
    const validation = validateWorkflow();
    const exportData = {
      workflow: currentWorkflow,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: getActiveInterface(),
        version: '2.0.0',
        validation,
      }
    };
    
    return exportData;
  }, [workflowStore, validateWorkflow, getActiveInterface]);
  
  /**
   * Get workflow statistics for monitoring
   */
  const getWorkflowStats = useCallback(() => {
    const { workflows, currentWorkflow, execution } = workflowStore;
    
    const totalWorkflows = workflows.length;
    const robotCreators = workflows.reduce((acc, wf) => {
      acc[wf.creator_id] = (acc[wf.creator_id] || 0) + 1;
      return acc;
    }, {} as Record<RobotId, number>);
    
    const currentStats = currentWorkflow ? {
      nodes: currentWorkflow.nodes.length,
      edges: currentWorkflow.edges.length,
      lastModified: currentWorkflow.updated_at,
    } : null;
    
    const executionStats = execution ? {
      status: execution.status,
      duration: execution.completedAt && execution.startedAt
        ? new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
        : null,
    } : null;
    
    return {
      totalWorkflows,
      robotCreators,
      currentStats,
      executionStats,
    };
  }, [workflowStore]);
  
  return {
    // Store access
    ...workflowStore,
    
    // Enhanced methods
    createWorkflow,
    addRobotNode,
    validateWorkflow,
    exportWorkflowWithMetadata,
    getWorkflowStats,
    
    // Computed properties
    isWorkflowValid: validateWorkflow().isValid,
    workflowStats: getWorkflowStats(),
    currentRobot: getActiveInterface(),
  };
};