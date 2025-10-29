import React from 'react';
import { Agent } from '../types';
import { Button, Card } from './UI';
import { PlusIcon, CloseIcon, EditIcon, FuturisticAIcon, DoubleChevronLeftIcon } from './Icons';
import { useLocalization } from '../hooks/useLocalization';

interface AgentSidebarProps {
  agents: Agent[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onAddAgent: () => void;
  onAddToWorkflow: (agent: Agent) => void;
  onDeleteAgent: (agentId: string) => void;
  onEditAgent: (agent: Agent) => void;
}

export const AgentSidebar = ({ agents, isCollapsed, onToggleCollapse, onAddAgent, onAddToWorkflow, onDeleteAgent, onEditAgent }: AgentSidebarProps) => {
  const { t } = useLocalization();

  if (isCollapsed) {
    return (
        <aside className="w-16 p-2 bg-gray-800 border-r border-gray-700/50 flex flex-col items-center">
            <Button onClick={onToggleCollapse} variant="ghost" className="mb-4 px-2 py-2">
                <FuturisticAIcon />
            </Button>
        </aside>
    );
  }
  
  return (
    <aside className="w-80 p-4 bg-gray-800 border-r border-gray-700/50 flex flex-col transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
            <Button onClick={onToggleCollapse} variant="ghost" className="mr-2 p-2 px-2 py-2">
                <DoubleChevronLeftIcon />
            </Button>
            <h2 className="text-lg font-semibold">{t('sidebar_title')}</h2>
        </div>
        <Button onClick={onAddAgent} variant="ghost" aria-label={t('sidebar_addAgent_aria')} className="px-2 py-2">
            <PlusIcon />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {agents.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
                <p className="text-sm">{t('sidebar_noAgents')}</p>
                <p className="text-xs">{t('sidebar_noAgents_cta')}</p>
            </div>
        )}
        {agents.map((agent) => (
          <Card key={agent.id} className="p-3 relative">
            <div className="absolute top-1 right-1 flex">
                <Button
                    variant="ghost"
                    className="p-2 h-8 w-8 text-gray-400 hover:text-indigo-400"
                    onClick={() => onEditAgent(agent)}
                    aria-label={t('sidebar_editAgent_aria', { agentName: agent.name })}
                >
                    <EditIcon width={16} height={16} />
                </Button>
                <Button
                    variant="ghost"
                    className="p-2 h-8 w-8 text-gray-400 hover:text-red-400"
                    onClick={() => onDeleteAgent(agent.id)}
                    aria-label={t('sidebar_deleteAgent_aria', { agentName: agent.name })}
                >
                    <CloseIcon width={16} height={16} />
                </Button>
            </div>
            <h3 className="font-semibold text-md text-indigo-400 pr-12 truncate">{agent.name}</h3>
            <p className="text-xs text-gray-400 mb-2 truncate">{agent.role}</p>
            <p className="text-sm text-gray-300 line-clamp-2">{agent.systemPrompt}</p>
            <Button
              className="w-full mt-3"
              variant="secondary"
              onClick={() => onAddToWorkflow(agent)}
            >
              {t('sidebar_addToWorkflow')}
            </Button>
          </Card>
        ))}
      </div>
    </aside>
  );
};