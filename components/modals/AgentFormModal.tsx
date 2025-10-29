import React, { useState, useMemo, useEffect } from 'react';
import { Agent, LLMConfig, LLMProvider, LLMCapability, HistoryConfig, Tool, OutputConfig, OutputFormat, RobotId } from '../../types';
import { Button, Modal, ToggleSwitch } from '../UI';
import { LLM_MODELS } from '../../llmModels';
import { CloseIcon, PlusIcon } from '../Icons';
import { useLocalization } from '../../hooks/useLocalization';

interface AgentFormModalProps {
  onClose: () => void;
  onSave: (agent: Omit<Agent, 'id'>, agentId?: string) => void;
  llmConfigs: LLMConfig[];
  existingAgent: Agent | null;
}

const defaultHistoryConfig: Omit<HistoryConfig, 'llmProvider' | 'model'> = {
    enabled: false,
    role: 'Archiviste Concis',
    systemPrompt: 'Résume la conversation suivante de manière factuelle et concise, en conservant les points clés et les décisions prises. Le résumé servira de mémoire pour un autre agent IA.',
    limits: { char: 5000, word: 1000, token: 800, sentence: 50, message: 20 }
};

const newToolTemplate: Tool = {
    name: 'new_tool_name',
    description: 'A brief description of what this tool does.',
    parameters: {
        type: 'object',
        properties: {
            param1: {
                type: 'string',
                description: 'Description for parameter 1.'
            }
        },
        required: ['param1']
    },
    outputSchema: {
        type: 'object',
        properties: {
            result: {
                type: 'string',
                description: 'The result of the tool execution.'
            }
        },
        required: ['result']
    }
};

const defaultWeatherTool: Tool = {
    name: 'get_weather',
    description: 'Obtient la météo actuelle pour un lieu donné.',
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "La ville pour laquelle obtenir la météo, par exemple, Paris."
        }
      },
      required: ["location"]
    },
    outputSchema: {
        type: 'object',
        properties: {
            location: { type: 'string' },
            temperature: { type: 'string' },
            condition: { type: 'string' }
        },
        required: ['location', 'temperature', 'condition']
    }
};


const defaultOutputConfig: OutputConfig = {
    enabled: false,
    format: 'json',
    useCodestralCompletion: false,
};

const outputFormats: OutputFormat[] = ['json', 'xml', 'yaml', 'shell', 'powershell', 'python', 'html', 'css', 'javascript', 'typescript', 'php', 'sql', 'mysql', 'mongodb'];

export const AgentFormModal = ({ onClose, onSave, llmConfigs, existingAgent }: AgentFormModalProps) => {
  const { t } = useLocalization();
  const enabledLLMProvider = llmConfigs.find(c => c.enabled)?.provider || LLMProvider.Gemini;

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [llmProvider, setLlmProvider] = useState<LLMProvider>(enabledLLMProvider);
  const [model, setModel] = useState<string>(LLM_MODELS[enabledLLMProvider][0]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<LLMCapability[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [outputConfig, setOutputConfig] = useState<OutputConfig>(defaultOutputConfig);
  const [historyConfig, setHistoryConfig] = useState<HistoryConfig>(() => ({
      ...defaultHistoryConfig,
      llmProvider: enabledLLMProvider,
      model: LLM_MODELS[enabledLLMProvider][0],
  }));
  
  const [activeTab, setActiveTab] = useState<'description' | 'historique' | 'fonctions' | 'formatage'>('description');
  const [schemaErrors, setSchemaErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const isEditing = !!existingAgent;

  useEffect(() => {
    if (isEditing && existingAgent) {
        setName(existingAgent.name);
        setRole(existingAgent.role);
        setSystemPrompt(existingAgent.systemPrompt);
        setLlmProvider(existingAgent.llmProvider);
        setModel(existingAgent.model);
        setSelectedCapabilities(existingAgent.capabilities);
        setHistoryConfig(prev => ({ ...defaultHistoryConfig, ...prev, ...(existingAgent.historyConfig || {}) }));
        setTools(existingAgent.tools || []);
        setOutputConfig(existingAgent.outputConfig || defaultOutputConfig);
    }
  }, [isEditing, existingAgent]);


  const availableCapabilities = useMemo(() => {
    const config = llmConfigs.find(c => c.provider === llmProvider);
    if (!config) return [];
    return Object.entries(config.capabilities)
      .filter(([, enabled]) => enabled)
      .map(([cap]) => cap as LLMCapability);
  }, [llmProvider, llmConfigs]);

  const handleProviderChange = (provider: LLMProvider) => {
    setLlmProvider(provider);
    setModel(LLM_MODELS[provider][0]);
    setSelectedCapabilities(prev => prev.filter(cap => llmConfigs.find(c => c.provider === provider)?.capabilities[cap]));
  };
  
  const handleHistoryProviderChange = (provider: LLMProvider) => {
    setHistoryConfig(prev => ({ ...prev, llmProvider: provider, model: LLM_MODELS[provider][0] }));
  };

  const handleCapabilityToggle = (capability: LLMCapability) => {
    const isCurrentlySelected = selectedCapabilities.includes(capability);
    
    if (capability === LLMCapability.FunctionCalling) {
        if (!isCurrentlySelected) { // Turning it ON
            // If no tools are defined yet, add the default weather tool as an example.
            if (tools.length === 0) {
                setTools([defaultWeatherTool]);
            }
        } else { // Turning it OFF
            // Clear all tools when function calling is disabled
            setTools([]);
        }
    }

    setSelectedCapabilities(prev => 
        isCurrentlySelected 
            ? prev.filter(c => c !== capability) 
            : [...prev, capability]
    );
  };
  
  const handleToolChange = (index: number, field: keyof Tool, value: any) => {
    const newTools = [...tools];
    if (field === 'parameters' || field === 'outputSchema') {
        const key = `${field}-${index}`;
        try {
            if (value.trim() === '') {
                 newTools[index] = { ...newTools[index], [field]: {} };
                 setSchemaErrors(prev => ({ ...prev, [key]: null }));
                 return;
            }
            const parsedSchema = JSON.parse(value);
            if (typeof parsedSchema !== 'object' || Array.isArray(parsedSchema) || parsedSchema === null) {
                throw new Error(t('agentForm_error_jsonNotObject'));
            }
            newTools[index] = { ...newTools[index], [field]: parsedSchema };
            setSchemaErrors(prev => ({ ...prev, [key]: null }));
        } catch (e) {
            newTools[index] = { ...newTools[index], [field]: value };
            const errorMessage = e instanceof Error ? e.message : 'JSON invalide';
            setSchemaErrors(prev => ({ ...prev, [key]: errorMessage }));
        }
    } else {
        newTools[index] = { ...newTools[index], [field]: value };
    }
    setTools(newTools);
  };


  const addTool = () => setTools([...tools, { ...newToolTemplate, name: `new_tool_${tools.length}` }]);
  const removeTool = (index: number) => {
    setTools(tools.filter((_, i) => i !== index));
    // Also clear any errors associated with the removed tool
    setSchemaErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`parameters-${index}`];
        delete newErrors[`outputSchema-${index}`];
        return newErrors;
    });
  };
  
  const hasSchemaErrors = Object.values(schemaErrors).some(err => err !== null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
        setFormError(t('agentForm_alert_nameMissing'));
        return;
    }
    if (hasSchemaErrors) {
        setFormError(t('agentForm_alert_invalidJson'));
        return;
    }

    onSave({ 
      name, 
      role, 
      systemPrompt, 
      llmProvider, 
      model, 
      capabilities: selectedCapabilities, 
      historyConfig, 
      tools, 
      outputConfig,
      creator_id: existingAgent?.creator_id || RobotId.Archi, // Default to Archi for new agents
      created_at: existingAgent?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, existingAgent?.id);
  };

  const showCodestralOption = llmProvider === LLMProvider.Mistral && model === 'codestral-latest' && outputConfig.enabled;

  return (
    <Modal title={isEditing ? t('agentForm_editTitle') : t('agentForm_createTitle')} isOpen={true} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="agent-name" className="block text-sm font-medium text-gray-300 mb-1">{t('agentForm_nameLabel')}</label>
          <input id="agent-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('agentForm_namePlaceholder')} />
        </div>

        <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button type="button" onClick={() => setActiveTab('description')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'description' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('agentForm_tab_description')}</button>
                <button type="button" onClick={() => setActiveTab('historique')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'historique' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('agentForm_tab_history')}</button>
                {selectedCapabilities.includes(LLMCapability.FunctionCalling) && <button type="button" onClick={() => setActiveTab('fonctions')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'fonctions' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('agentForm_tab_functions')}</button>}
                {selectedCapabilities.includes(LLMCapability.OutputFormatting) && <button type="button" onClick={() => setActiveTab('formatage')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'formatage' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('agentForm_tab_formatting')}</button>}
            </nav>
        </div>
        
        <div className="pt-2 max-h-[50vh] overflow-y-auto pr-2 space-y-4">
            {activeTab === 'description' && (
                <>
                    <div>
                        <label htmlFor="agent-role" className="block text-sm font-medium text-gray-300 mb-1">{t('agentForm_roleLabel')}</label>
                        <input id="agent-role" type="text" value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('agentForm_rolePlaceholder')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label htmlFor="llm-provider" className="block text-sm font-medium text-gray-300 mb-1">{t('agentForm_llmLabel')}</label>
                          <select id="llm-provider" value={llmProvider} onChange={(e) => handleProviderChange(e.target.value as LLMProvider)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {llmConfigs.filter(c => c.enabled).map(({ provider }) => <option key={provider} value={provider}>{provider}</option>)}
                          </select>
                      </div>
                       <div>
                          <label htmlFor="llm-model" className="block text-sm font-medium text-gray-300 mb-1">{t('agentForm_modelLabel')}</label>
                          <select id="llm-model" value={model} onChange={(e) => setModel(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {(LLM_MODELS[llmProvider] || []).map((modelName) => <option key={modelName} value={modelName}>{modelName}</option>)}
                          </select>
                      </div>
                    </div>
                    {availableCapabilities.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('agentForm_capabilitiesLabel')}</label>
                        <div className="space-y-2 p-3 bg-gray-900/50 rounded-md max-h-32 overflow-y-auto">
                          {availableCapabilities.map(cap => <label key={cap} className="flex items-center"><input type="checkbox" checked={selectedCapabilities.includes(cap)} onChange={() => handleCapabilityToggle(cap)} className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500" /><span className="ml-3 text-sm text-gray-300">{cap}</span></label>)}
                        </div>
                      </div>
                    )}
                    <div>
                      <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-300 mb-1">{t('agentForm_systemPromptLabel')}</label>
                      <textarea id="system-prompt" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={5} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('agentForm_systemPromptPlaceholder')} />
                    </div>
                </>
            )}
            {activeTab === 'historique' && (
                <div className="space-y-4">
                    <ToggleSwitch label={t('agentForm_history_enableLabel')} checked={historyConfig.enabled} onChange={(c) => setHistoryConfig(p => ({...p, enabled: c}))} />
                    {historyConfig.enabled && (
                        <div className="p-3 bg-gray-900/50 rounded-lg space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">{t('agentForm_history_thresholdsLabel')}</label>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {Object.keys(historyConfig.limits).map(key => (
                                        <div key={key}>
                                            <label htmlFor={`limit-${key}`} className="text-xs text-gray-400 capitalize">{key}</label>
                                            <input
                                                id={`limit-${key}`}
                                                type="number"
                                                value={historyConfig.limits[key as keyof typeof historyConfig.limits]}
                                                onChange={e => setHistoryConfig(p => ({ ...p, limits: { ...p.limits, [key]: parseInt(e.target.value) || 0 } }))}
                                                className="w-full p-1.5 mt-1 text-sm bg-gray-700 border border-gray-600 rounded-md"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">{t('agentForm_history_synthesisConfigLabel')}</label>
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                      <label htmlFor="hist-llm-provider" className="text-xs text-gray-400">{t('agentForm_history_synthesisLlmLabel')}</label>
                                      <select id="hist-llm-provider" value={historyConfig.llmProvider} onChange={(e) => handleHistoryProviderChange(e.target.value as LLMProvider)} className="w-full p-1.5 mt-1 text-sm bg-gray-700 border border-gray-600 rounded-md">
                                        {llmConfigs.filter(c => c.enabled).map(({ provider }) => <option key={provider} value={provider}>{provider}</option>)}
                                      </select>
                                  </div>
                                   <div>
                                      <label htmlFor="hist-llm-model" className="text-xs text-gray-400">{t('agentForm_history_synthesisModelLabel')}</label>
                                      <select id="hist-llm-model" value={historyConfig.model} onChange={e => setHistoryConfig(p => ({ ...p, model: e.target.value }))} className="w-full p-1.5 mt-1 text-sm bg-gray-700 border border-gray-600 rounded-md">
                                        {(LLM_MODELS[historyConfig.llmProvider] || []).map((modelName) => <option key={modelName} value={modelName}>{modelName}</option>)}
                                      </select>
                                  </div>
                                </div>
                                <div className="mt-2">
                                     <label htmlFor="hist-sys-prompt" className="text-xs text-gray-400">{t('agentForm_history_synthesisPromptLabel')}</label>
                                    <textarea id="hist-sys-prompt" value={historyConfig.systemPrompt} onChange={e => setHistoryConfig(p => ({ ...p, systemPrompt: e.target.value }))} rows={4} className="w-full p-1.5 mt-1 text-sm bg-gray-700 border border-gray-600 rounded-md" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'formatage' && (
                <div className="space-y-4">
                    <ToggleSwitch label={t('agentForm_formatting_enableLabel')} checked={outputConfig.enabled} onChange={(c) => setOutputConfig(p => ({...p, enabled: c}))} />
                    {outputConfig.enabled && (
                        <div className="p-3 bg-gray-900/50 rounded-lg space-y-4">
                            <div>
                                <label htmlFor="output-format" className="block text-sm font-medium text-gray-300 mb-1">{t('agentForm_formatting_formatLabel')}</label>
                                <select id="output-format" value={outputConfig.format} onChange={(e) => setOutputConfig(p => ({...p, format: e.target.value as OutputFormat}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md">
                                    {outputFormats.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            {showCodestralOption && (
                                <div className="pt-2">
                                    <ToggleSwitch
                                        label={t('agentForm_formatting_useCodestral')}
                                        checked={outputConfig.useCodestralCompletion || false}
                                        onChange={(c) => setOutputConfig(p => ({...p, useCodestralCompletion: c}))}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'fonctions' && (
                <div className="space-y-4">
                    {tools.map((tool, index) => (
                        <div key={index} className="p-3 bg-gray-900/50 rounded-lg space-y-2 relative">
                            <Button variant="ghost" className="absolute top-1 right-1 p-1 h-6 w-6 text-red-400" onClick={() => removeTool(index)}><CloseIcon width={14} height={14}/></Button>
                             <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('agentForm_functions_toolNameLabel')}</label>
                                    <input type="text" value={tool.name} onChange={(e) => handleToolChange(index, 'name', e.target.value)} className="w-full p-1.5 text-sm bg-gray-700 border border-gray-600 rounded-md" />
                                </div>
                                 <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('agentForm_functions_descriptionLabel')}</label>
                                    <input type="text" value={tool.description} onChange={(e) => handleToolChange(index, 'description', e.target.value)} className="w-full p-1.5 text-sm bg-gray-700 border border-gray-600 rounded-md" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('agentForm_functions_parametersLabel')}</label>
                                    <textarea 
                                        value={typeof tool.parameters === 'string' ? tool.parameters : JSON.stringify(tool.parameters, null, 2)} 
                                        onChange={(e) => handleToolChange(index, 'parameters', e.target.value)} 
                                        rows={6} 
                                        className={`w-full p-1.5 font-mono text-xs bg-gray-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${schemaErrors[`parameters-${index}`] ? 'border-red-500' : 'border-gray-600'}`} 
                                    />
                                    {schemaErrors[`parameters-${index}`] && <p className="text-xs text-red-400 mt-1">{schemaErrors[`parameters-${index}`]}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('agentForm_functions_outputSchemaLabel')}</label>
                                    <textarea 
                                        value={typeof tool.outputSchema === 'string' ? tool.outputSchema : JSON.stringify(tool.outputSchema, null, 2)} 
                                        onChange={(e) => handleToolChange(index, 'outputSchema', e.target.value)} 
                                        rows={6} 
                                        className={`w-full p-1.5 font-mono text-xs bg-gray-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${schemaErrors[`outputSchema-${index}`] ? 'border-red-500' : 'border-gray-600'}`}
                                        placeholder={`{ "type": "object", "properties": { ... } }`}
                                    />
                                    {schemaErrors[`outputSchema-${index}`] && <p className="text-xs text-red-400 mt-1">{schemaErrors[`outputSchema-${index}`]}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                    <p className="text-xs text-gray-400 pt-2">{t('agentForm_functions_pythonNote')}</p>
                    <Button type="button" variant="secondary" onClick={addTool} className="flex items-center gap-2"><PlusIcon /> {t('agentForm_functions_addTool')}</Button>
                </div>
            )}
        </div>

        {formError && <p className="text-sm text-red-400 text-center">{formError}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || hasSchemaErrors}>{isEditing ? t('agentForm_saveButton') : t('agentForm_createButton')}</Button>
        </div>
      </form>
    </Modal>
  );
};