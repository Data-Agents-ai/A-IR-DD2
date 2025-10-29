import React, { useState, useEffect } from 'react';
import { CloseIcon, SaveIcon, WrenchIcon } from '../Icons';
import { useWorkflowStore } from '../../stores/useWorkflowStore';
import { useLocalization } from '../../hooks/useLocalization';
import { Agent, RobotId } from '../../types';

interface NodeConfigPanelProps {
  className?: string;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ className = '' }) => {
  const { t } = useLocalization();
  const {
    currentWorkflow,
    selectedNodeId,
    isConfigPanelOpen,
    toggleConfigPanel,
    updateNode,
    selectNode
  } = useWorkflowStore();
  
  const [formData, setFormData] = useState<any>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const selectedNode = currentWorkflow?.nodes.find(n => n.id === selectedNodeId);
  
  useEffect(() => {
    if (selectedNode) {
      setFormData({
        label: selectedNode.data.label || '',
        description: selectedNode.data.description || '',
        config: selectedNode.data.config || {},
        ...selectedNode.data
      });
    }
  }, [selectedNode]);
  
  const handleSave = () => {
    const errors = validateConfiguration();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    if (!selectedNodeId) return;
    
    updateNode(selectedNodeId, {
      data: {
        ...selectedNode?.data,
        label: formData.label,
        description: formData.description,
        config: formData.config
      }
    });
    
    setValidationErrors([]);
    toggleConfigPanel();
  };
  
  const validateConfiguration = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.label?.trim()) {
      errors.push('Node label is required');
    }
    
    if (selectedNode?.type === 'archi' && !formData.config?.agentId) {
      errors.push('Agent selection is required for Archi nodes');
    }
    
    return errors;
  };
  
  const renderRobotSpecificConfig = () => {
    if (!selectedNode) return null;
    
    switch (selectedNode.type) {
      case 'archi':
        return renderArchiConfig();
      case 'com':
        return renderComConfig();
      case 'phil':
        return renderPhilConfig();
      case 'tim':
        return renderTimConfig();
      case 'bos':
        return renderBosConfig();
      default:
        return null;
    }
  };
  
  const renderArchiConfig = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-3">
        Archi Robot Configuration
      </h4>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Agent Selection
        </label>
        <select
          value={formData.config?.agentId || ''}
          onChange={(e) => setFormData({
            ...formData,
            config: { ...formData.config, agentId: e.target.value }
          })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">Select an agent...</option>
          {/* TODO: Load available agents */}
          <option value="agent1">Marketing Expert</option>
          <option value="agent2">Python Developer</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Execution Mode
        </label>
        <select
          value={formData.config?.executionMode || 'standard'}
          onChange={(e) => setFormData({
            ...formData,
            config: { ...formData.config, executionMode: e.target.value }
          })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="standard">Standard</option>
          <option value="streaming">Streaming</option>
          <option value="batch">Batch</option>
        </select>
      </div>
    </div>
  );
  
  const renderComConfig = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
        Com Robot Configuration
      </h4>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Connection Type
        </label>
        <select
          value={formData.config?.connectionType || 'api'}
          onChange={(e) => setFormData({
            ...formData,
            config: { ...formData.config, connectionType: e.target.value }
          })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="api">REST API</option>
          <option value="webhook">Webhook</option>
          <option value="database">Database</option>
          <option value="file">File System</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Endpoint URL
        </label>
        <input
          type="url"
          value={formData.config?.endpointUrl || ''}
          onChange={(e) => setFormData({
            ...formData,
            config: { ...formData.config, endpointUrl: e.target.value }
          })}
          placeholder="https://api.example.com/endpoint"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
    </div>
  );
  
  const renderPhilConfig = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-3">
        Phil Robot Configuration
      </h4>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Data Processing Type
        </label>
        <select
          value={formData.config?.processingType || 'transform'}
          onChange={(e) => setFormData({
            ...formData,
            config: { ...formData.config, processingType: e.target.value }
          })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="transform">Data Transform</option>
          <option value="validate">Data Validation</option>
          <option value="filter">Data Filter</option>
          <option value="aggregate">Data Aggregation</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          File Format
        </label>
        <select
          value={formData.config?.fileFormat || 'json'}
          onChange={(e) => setFormData({
            ...formData,
            config: { ...formData.config, fileFormat: e.target.value }
          })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="xml">XML</option>
          <option value="yaml">YAML</option>
        </select>
      </div>
    </div>
  );
  
  const renderTimConfig = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-3">
        Tim Robot Configuration
      </h4>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Trigger Type
        </label>
        <select
          value={formData.config?.triggerType || 'manual'}
          onChange={(e) => setFormData({
            ...formData,
            config: { ...formData.config, triggerType: e.target.value }
          })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="manual">Manual</option>
          <option value="scheduled">Scheduled</option>
          <option value="event">Event-Based</option>
          <option value="webhook">Webhook</option>
        </select>
      </div>
      
      {formData.config?.triggerType === 'scheduled' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cron Expression
          </label>
          <input
            type="text"
            value={formData.config?.cronExpression || ''}
            onChange={(e) => setFormData({
              ...formData,
              config: { ...formData.config, cronExpression: e.target.value }
            })}
            placeholder="0 */5 * * * *"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}
    </div>
  );
  
  const renderBosConfig = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">
        Bos Robot Configuration
      </h4>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Monitoring Level
        </label>
        <select
          value={formData.config?.monitoringLevel || 'standard'}
          onChange={(e) => setFormData({
            ...formData,
            config: { ...formData.config, monitoringLevel: e.target.value }
          })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="basic">Basic</option>
          <option value="standard">Standard</option>
          <option value="detailed">Detailed</option>
          <option value="debug">Debug</option>
        </select>
      </div>
      
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.config?.enableCostTracking || false}
            onChange={(e) => setFormData({
              ...formData,
              config: { ...formData.config, enableCostTracking: e.target.checked }
            })}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Enable Cost Tracking
          </span>
        </label>
      </div>
    </div>
  );
  
  if (!isConfigPanelOpen) return null;
  
  return (
    <div className={`fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-50 ${className}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <WrenchIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Node Configuration
            </h3>
          </div>
          <button
            onClick={toggleConfigPanel}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedNode ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <WrenchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a node to configure its properties</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Properties */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Basic Properties
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Node Label
                    </label>
                    <input
                      type="text"
                      value={formData.label || ''}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Enter node label..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Enter description..."
                    />
                  </div>
                </div>
              </div>
              
              {/* Robot-Specific Configuration */}
              {renderRobotSpecificConfig()}
              
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    Configuration Errors
                  </h4>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1 h-1 bg-red-600 dark:bg-red-400 rounded-full mt-2"></span>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {selectedNode && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                         text-white rounded-md transition-colors duration-200"
              >
                <SaveIcon className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={() => selectNode(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 
                         text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};