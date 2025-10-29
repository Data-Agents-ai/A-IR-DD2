import React, { useState } from 'react';
import { Agent } from '../types';
import { RobotId } from '../types';
import { AgentSidebar } from './AgentSidebar';
import { IconSidebar } from './IconSidebar';
import { ROBOT_MENU_DATA } from '../data/robotNavigation';

interface NavigationLayoutProps {
  // Current AgentSidebar props
  agents: Agent[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onAddAgent: () => void;
  onAddToWorkflow: (agent: Agent) => void;
  onDeleteAgent: (agentId: string) => void;
  onEditAgent: (agent: Agent) => void;
  
  // New props for V2 navigation
  useV2Navigation?: boolean;
  currentPath?: string;
  onNavigate?: (robotId: RobotId, path: string) => void;
}

export const NavigationLayout: React.FC<NavigationLayoutProps> = ({
  // V1 props
  agents,
  isCollapsed,
  onToggleCollapse,
  onAddAgent,
  onAddToWorkflow,
  onDeleteAgent,
  onEditAgent,
  
  // V2 props  
  useV2Navigation = false,
  currentPath = '/archi/dashboard',
  onNavigate = () => {}
}) => {
  
  if (useV2Navigation) {
    return (
      <IconSidebar
        robotMenuData={ROBOT_MENU_DATA}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />
    );
  }
  
  // Fallback to V1 sidebar
  return (
    <AgentSidebar
      agents={agents}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onAddAgent={onAddAgent}
      onAddToWorkflow={onAddToWorkflow}
      onDeleteAgent={onDeleteAgent}
      onEditAgent={onEditAgent}
    />
  );
};