import React, { memo } from 'react';
import { NodeProps, Position } from 'reactflow';
import { BaseWorkflowNode, BaseWorkflowNodeData } from './BaseWorkflowNode';
import { RobotId, LLMProvider, Agent } from '../../types';
import { WrenchIcon } from '../Icons';

export interface ArchiWorkflowNodeData extends BaseWorkflowNodeData {
  robotId: RobotId.Archi;
  config: {
    agent?: Agent;
    llmProvider?: LLMProvider;
    model?: string;
    systemPrompt?: string;
    tools?: string[];
  };
}

interface ArchiWorkflowNodeProps extends NodeProps {
  data: ArchiWorkflowNodeData;
}

export const ArchiWorkflowNode: React.FC<ArchiWorkflowNodeProps> = memo(({ data, selected }) => {
  // Créer les handles spécifiques pour un node Agent
  const enhancedData: BaseWorkflowNodeData = {
    ...data,
    description: data.config.agent ? 
      `Agent: ${data.config.agent.name} (${data.config.llmProvider || 'No LLM'})` :
      'Agent non configuré',
    handles: {
      inputs: [
        {
          id: 'user_input',
          type: 'target',
          dataType: 'string',
          label: 'User Input',
          required: false,
          position: Position.Left
        },
        {
          id: 'context_data',
          type: 'target', 
          dataType: 'object',
          label: 'Context Data',
          required: false,
          position: Position.Left
        }
      ],
      outputs: [
        {
          id: 'agent_response',
          type: 'source',
          dataType: 'string', 
          label: 'Agent Response',
          required: true,
          position: Position.Right
        },
        {
          id: 'agent_data',
          type: 'source',
          dataType: 'object',
          label: 'Agent Data',
          required: false,
          position: Position.Right
        }
      ]
    }
  };

  return (
    <div className="relative">
      {/* Robot Icon Overlay */}
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center z-10 shadow-lg">
        <WrenchIcon className="w-3 h-3 text-white" />
      </div>
      
      <BaseWorkflowNode data={enhancedData} selected={selected} />
      
      {/* Agent-specific info overlay */}
      {data.config.agent && (
        <div className="absolute bottom-2 left-2 right-2">
          <div className="bg-cyan-500/20 border border-cyan-500/30 rounded px-2 py-1 text-xs">
            <div className="text-cyan-300 font-medium truncate">
              {data.config.agent.role}
            </div>
            {data.config.model && (
              <div className="text-cyan-200 text-xs opacity-75">
                Model: {data.config.model}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});