import React from 'react';
import { RobotId, LLMConfig } from '../types';
import { ArchiPrototypingPage } from './ArchiPrototypingPage';
import { V2WorkflowCanvas } from './V2WorkflowCanvas';
import { ComConnectionsPage } from './ComConnectionsPage';
import { PhilDataPage } from './PhilDataPage';
import { TimEventsPage } from './TimEventsPage';
import { useLocalization } from '../hooks/useLocalization';

interface RobotPageRouterProps {
  currentPath: string;
  llmConfigs: LLMConfig[];
  onNavigate?: (robotId: RobotId, path: string) => void;
}

// Page with workflow canvas for operational robots
const WorkflowPage: React.FC<{ robotName: string; description: string }> = ({ robotName, description }) => {
  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">{robotName}</h1>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      
      {/* Workflow Canvas */}
      <div className="flex-1">
        <V2WorkflowCanvas />
      </div>
    </div>
  );
};

// Placeholder components for pages without workflow
const PlaceholderPage: React.FC<{ robotName: string; description: string }> = ({ robotName, description }) => {
  return (
    <div className="h-full bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-indigo-400 mb-4">{robotName}</h1>
        <p className="text-gray-400 text-lg">{description}</p>
        <p className="text-gray-500 text-sm mt-4">Interface en cours de développement...</p>
      </div>
    </div>
  );
};

export const RobotPageRouter: React.FC<RobotPageRouterProps> = ({ currentPath, llmConfigs, onNavigate }) => {
  const { t } = useLocalization();
  
  // Navigation helper to go to workflow map (Bos Dashboard)
  const handleNavigateToWorkflow = () => {
    if (onNavigate) {
      onNavigate('bos', '/bos/dashboard');
    }
  };
  
  // Route matching logic
  if (currentPath.startsWith('/archi/prototype')) {
    return <ArchiPrototypingPage llmConfigs={llmConfigs} onNavigateToWorkflow={handleNavigateToWorkflow} />;
  }
  
  if (currentPath.startsWith('/archi')) {
    return <ArchiPrototypingPage llmConfigs={llmConfigs} onNavigateToWorkflow={handleNavigateToWorkflow} />;
  }
  
  if (currentPath.startsWith('/bos/dashboard')) {
    return (
      <WorkflowPage 
        robotName="Dashboard - Carte des Workflows" 
        description="Vue d'ensemble cartographique de tous les workflows et leur statut"
      />
    );
  }
  
  if (currentPath.startsWith('/bos')) {
    return (
      <WorkflowPage 
        robotName="Bos Supervision" 
        description="Outils de supervision, debugging et monitoring des coûts"
      />
    );
  }
  
  if (currentPath.startsWith('/com')) {
    return (
      <ComConnectionsPage 
        llmConfigs={llmConfigs} 
        onNavigateToWorkflow={handleNavigateToWorkflow}
      />
    );
  }
  
  if (currentPath.startsWith('/phil')) {
    return (
      <PhilDataPage 
        llmConfigs={llmConfigs} 
        onNavigateToWorkflow={handleNavigateToWorkflow}
      />
    );
  }
  
  if (currentPath.startsWith('/tim')) {
    return (
      <TimEventsPage 
        llmConfigs={llmConfigs} 
        onNavigateToWorkflow={handleNavigateToWorkflow}
      />
    );
  }
  
  // Default fallback
  return (
    <PlaceholderPage 
      robotName="Workflow Orchestrator" 
      description="Sélectionnez un robot dans la navigation pour commencer"
    />
  );
};