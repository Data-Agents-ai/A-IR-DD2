import React, { useState, useMemo, useEffect } from 'react';
import { Button, ToggleSwitch } from '../UI';
import { CloseIcon, PlusIcon } from '../Icons';
import { useDesignStore } from '../../stores/useDesignStore';
import { useRuntimeStore } from '../../stores/useRuntimeStore';
import { useLocalization } from '../../hooks/useLocalization';
import { AgentInstance, LLMProvider, Tool, LLMCapability, LLMConfig, OutputFormat, HistoryConfig } from '../../types';
import { LLM_MODELS, LLM_MODELS_DETAILED, getModelCapabilities } from '../../llmModels';

type TabId = 'config' | 'historique' | 'fonctions' | 'formatage' | 'links' | 'tasks' | 'logs' | 'errors';

/**
 * Modal de Configuration Enrichie par Instance
 * 
 * Principe SOLID :
 * - Chaque instance a sa propre configuration (clone du prototype)
 * - Modifications isolées : pas d'impact sur le prototype d'origine
 * - Structure extensible : onglets futurs (Liens, Tâches, Logs, Erreurs)
 * 
 * Rendu au niveau App.tsx pour affichage en vrai plein écran
 */
export const AgentConfigurationModal: React.FC<{ llmConfigs: LLMConfig[] }> = ({ llmConfigs }) => {
    const { t } = useLocalization();
    const { getResolvedInstance, updateInstanceConfig, updateAgentInstance } = useDesignStore();
    const { configModalInstanceId, setConfigModalInstanceId } = useRuntimeStore();

    // Tous les hooks DOIVENT être appelés avant les early returns
    const [activeTab, setActiveTab] = useState<TabId>('config');
    const [hasChanges, setHasChanges] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    // Récupérer l'instance et le prototype (peut être null)
    const resolved = configModalInstanceId ? getResolvedInstance(configModalInstanceId) : null;

    // Configuration initiale (utilisée uniquement pour l'initialisation du useState)
    const config = {
        role: '',
        model: '',
        llmProvider: 'openai' as LLMProvider,
        systemPrompt: '',
        tools: [],
        position: { x: 0, y: 0 },
        links: [],
        tasks: [],
        logs: [],
        errors: []
    };

    const [editedConfig, setEditedConfig] = useState(config);

    // Synchroniser editedConfig et editedName quand l'instance change
    useEffect(() => {
        if (!configModalInstanceId) return;

        // Récupérer l'instance à l'intérieur du useEffect pour éviter la boucle
        const currentResolved = getResolvedInstance(configModalInstanceId);
        if (!currentResolved) return;

        // Réinitialiser editedConfig avec la config actuelle
        const currentConfig = currentResolved.instance.configuration_json || {
            role: currentResolved.prototype.role || '',
            model: currentResolved.prototype.model || '',
            llmProvider: currentResolved.prototype.llmProvider || 'openai',
            systemPrompt: currentResolved.prototype.systemPrompt || '',
            tools: JSON.parse(JSON.stringify(currentResolved.prototype.tools || [])),
            outputConfig: currentResolved.prototype.outputConfig ? JSON.parse(JSON.stringify(currentResolved.prototype.outputConfig)) : undefined,
            capabilities: currentResolved.prototype.capabilities ? [...currentResolved.prototype.capabilities] : [],
            historyConfig: currentResolved.prototype.historyConfig ? JSON.parse(JSON.stringify(currentResolved.prototype.historyConfig)) : undefined,
            position: currentResolved.instance.position,
            links: currentResolved.instance.configuration_json?.links || [],
            tasks: currentResolved.instance.configuration_json?.tasks || [],
            logs: currentResolved.instance.configuration_json?.logs || [],
            errors: currentResolved.instance.configuration_json?.errors || []
        };

        setEditedConfig(currentConfig);
        setEditedName(currentResolved.instance.name);
        setHasChanges(false);
    }, [configModalInstanceId, getResolvedInstance]);

    // Early returns APRÈS tous les hooks
    if (!configModalInstanceId) return null;

    if (!resolved) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-gray-800 p-6 rounded-lg">
                    <p className="text-red-400">{t('agentConfig_instanceNotFound')}</p>
                    <Button onClick={() => setConfigModalInstanceId(null)} className="mt-4">{t('agentConfig_closeButton')}</Button>
                </div>
            </div>
        );
    }

    const { instance, prototype } = resolved;

    const handleSave = () => {
        // 1. Sauvegarder le nom de l'agent (niveau instance, pas config)
        if (editedName !== instance.name) {
            updateAgentInstance(configModalInstanceId, { name: editedName });
        }

        // 2. CRITIQUE : Préserver les données runtime (logs, errors, tasks, links)
        const configToSave = {
            ...editedConfig,
            // Garantir que les données runtime ne sont jamais écrasées
            logs: instance.configuration_json?.logs || [],
            errors: instance.configuration_json?.errors || [],
            tasks: instance.configuration_json?.tasks || [],
            links: instance.configuration_json?.links || [],
        };
        updateInstanceConfig(configModalInstanceId, configToSave);
        setHasChanges(false);
        setConfigModalInstanceId(null); // Fermer le modal
    };

    const handleCancel = () => {
        if (hasChanges) {
            setShowCancelConfirm(true);
        } else {
            setConfigModalInstanceId(null); // Fermer le modal
        }
    };

    const handleConfirmCancel = () => {
        setShowCancelConfirm(false);
        setConfigModalInstanceId(null);
    };

    const handleDenyCancel = () => {
        setShowCancelConfirm(false);
    };

    const handleConfigChange = (field: string, value: any) => {
        setEditedConfig(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="w-full h-full max-w-6xl bg-gray-800 rounded-lg shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
                    <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${hasChanges ? 'bg-yellow-400 animate-pulse' : 'bg-cyan-400'}`}></div>
                        <h2 className="text-xl font-semibold text-white">
                            ⚙️ {editedName || instance.name}
                        </h2>
                        <span className="text-sm text-gray-400">
                            ({editedConfig.model} • {editedConfig.llmProvider})
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        className="p-2 h-10 w-10 text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                        <CloseIcon width={20} height={20} />
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 bg-gray-900/30">
                    <TabButton
                        active={activeTab === 'config'}
                        onClick={() => setActiveTab('config')}
                    >
                        {t('agentConfig_tab_config')}
                    </TabButton>
                    <TabButton
                        active={activeTab === 'historique'}
                        onClick={() => setActiveTab('historique')}
                    >
                        {t('agentConfig_tab_history')}
                    </TabButton>
                    <TabButton
                        active={activeTab === 'fonctions'}
                        onClick={() => setActiveTab('fonctions')}
                        badge={editedConfig.tools?.length}
                    >
                        {t('agentConfig_tab_functions')}
                    </TabButton>
                    <TabButton
                        active={activeTab === 'formatage'}
                        onClick={() => setActiveTab('formatage')}
                    >
                        {t('agentConfig_tab_formatting')}
                    </TabButton>
                    <TabButton
                        active={activeTab === 'links'}
                        onClick={() => setActiveTab('links')}
                        badge={editedConfig.links?.length}
                    >
                        {t('agentConfig_tab_links')}
                    </TabButton>
                    <TabButton
                        active={activeTab === 'tasks'}
                        onClick={() => setActiveTab('tasks')}
                        badge={editedConfig.tasks?.length}
                    >
                        {t('agentConfig_tab_tasks')}
                    </TabButton>
                    <TabButton
                        active={activeTab === 'logs'}
                        onClick={() => setActiveTab('logs')}
                        badge={editedConfig.logs?.length}
                    >
                        {t('agentConfig_tab_logs')}
                    </TabButton>
                    <TabButton
                        active={activeTab === 'errors'}
                        onClick={() => setActiveTab('errors')}
                        badge={editedConfig.errors?.length}
                    >
                        {t('agentConfig_tab_errors')}
                    </TabButton>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'config' && (
                        <ConfigurationTab
                            config={editedConfig}
                            onChange={handleConfigChange}
                            llmConfigs={llmConfigs}
                            agentName={editedName}
                            onNameChange={(name) => {
                                setEditedName(name);
                                setHasChanges(true);
                            }}
                            t={t}
                        />
                    )}

                    {activeTab === 'historique' && (
                        <HistoryTab
                            config={editedConfig}
                            onChange={handleConfigChange}
                            llmConfigs={llmConfigs}
                            t={t}
                        />
                    )}

                    {activeTab === 'fonctions' && (
                        <FunctionsTab
                            config={editedConfig}
                            onChange={handleConfigChange}
                            t={t}
                        />
                    )}

                    {activeTab === 'formatage' && (
                        <FormattingTab
                            config={editedConfig}
                            onChange={handleConfigChange}
                            t={t}
                        />
                    )}

                    {activeTab === 'links' && (
                        <PlaceholderTab
                            title={t('agentConfig_placeholder_links_title')}
                            description={t('agentConfig_placeholder_links_desc')}
                            icon="🔗"
                        />
                    )}

                    {activeTab === 'tasks' && (
                        <PlaceholderTab
                            title={t('agentConfig_placeholder_tasks_title')}
                            description={t('agentConfig_placeholder_tasks_desc')}
                            icon="✅"
                        />
                    )}

                    {activeTab === 'logs' && (
                        <PlaceholderTab
                            title={t('agentConfig_placeholder_logs_title')}
                            description={t('agentConfig_placeholder_logs_desc')}
                            icon="📋"
                            items={editedConfig.logs}
                        />
                    )}

                    {activeTab === 'errors' && (
                        <PlaceholderTab
                            title={t('agentConfig_placeholder_errors_title')}
                            description={t('agentConfig_placeholder_errors_desc')}
                            icon="❌"
                            items={editedConfig.errors}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-700 bg-gray-900/30 p-4 flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                        Prototype source : <span className="text-cyan-400 font-mono">{prototype.name}</span>
                    </div>

                    <div className="flex space-x-2">
                        <Button
                            variant="ghost"
                            onClick={handleCancel}
                            className="px-6 py-2"
                        >
                            {t('agentConfig_cancelButton')}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!hasChanges}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('agentConfig_saveButton')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modal de confirmation d'abandon */}
            {showCancelConfirm && (
                <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center">
                    <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 p-6 max-w-md">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            {t('agentConfig_confirmCancel_title')}
                        </h3>
                        <div className="flex justify-end space-x-3 mt-6">
                            <Button
                                variant="ghost"
                                onClick={handleDenyCancel}
                                className="px-4 py-2"
                            >
                                {t('agentConfig_confirmCancel_no')}
                            </Button>
                            <Button
                                onClick={handleConfirmCancel}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700"
                            >
                                {t('agentConfig_confirmCancel_yes')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Tab Button Component
const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    badge?: number;
}> = ({ active, onClick, children, badge }) => (
    <button
        onClick={onClick}
        className={`
      px-6 py-3 font-medium transition-colors relative
      ${active
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
            }
    `}
    >
        {children}
        {badge !== undefined && badge > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-cyan-600 text-white rounded-full">
                {badge}
            </span>
        )}
    </button>
);

// Configuration Tab Component
const ConfigurationTab: React.FC<{
    config: any;
    onChange: (field: string, value: any) => void;
    llmConfigs: LLMConfig[];
    agentName: string;
    onNameChange: (name: string) => void;
    t: (key: string) => string;
}> = ({ config, onChange, llmConfigs, agentName, onNameChange, t }) => {

    // Obtenir les providers disponibles (configurés avec apiKey)
    const availableProviders = useMemo(() =>
        llmConfigs.filter(c => c.enabled && c.apiKey).map(c => c.provider),
        [llmConfigs]
    );

    // Obtenir les modèles disponibles pour le provider sélectionné
    const availableModels = useMemo(() => {
        if (!config.llmProvider) return [];
        return LLM_MODELS[config.llmProvider as LLMProvider] || [];
    }, [config.llmProvider]);

    // Obtenir les capacités disponibles pour le modèle sélectionné
    const modelCapabilities = useMemo(() => {
        if (!config.llmProvider || !config.model) return [];
        return getModelCapabilities(config.llmProvider as LLMProvider, config.model);
    }, [config.llmProvider, config.model]);

    const handleProviderChange = (provider: LLMProvider) => {
        const models = LLM_MODELS[provider] || [];
        onChange('llmProvider', provider);
        if (models.length > 0 && !models.includes(config.model)) {
            onChange('model', models[0]); // Auto-select first model
        }
    };

    const toggleCapability = (cap: LLMCapability) => {
        const current = config.capabilities || [];
        const updated = current.includes(cap)
            ? current.filter((c: LLMCapability) => c !== cap)
            : [...current, cap];
        onChange('capabilities', updated);
    };

    return (
        <div className="space-y-6">
            {/* Identité de l'Agent */}
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">{t('agentConfig_identity_title')}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            {t('agentConfig_identity_nameLabel')}
                        </label>
                        <input
                            type="text"
                            value={agentName}
                            onChange={(e) => onNameChange(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-500 focus:outline-none"
                            placeholder={t('agentConfig_identity_namePlaceholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            {t('agentConfig_identity_roleLabel')}
                        </label>
                        <input
                            type="text"
                            value={config.role || ''}
                            onChange={(e) => onChange('role', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-500 focus:outline-none"
                            placeholder={t('agentConfig_identity_rolePlaceholder')}
                        />
                    </div>
                </div>
            </div>

            {/* Configuration LLM */}
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">{t('agentConfig_llm_title')}</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            {t('agentConfig_llm_providerLabel')}
                        </label>
                        <select
                            value={config.llmProvider || ''}
                            onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-500 focus:outline-none"
                        >
                            {!config.llmProvider && <option value="">{t('agentConfig_llm_providerPlaceholder')}</option>}
                            {availableProviders.map(provider => (
                                <option key={provider} value={provider}>{provider}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            {t('agentConfig_llm_modelLabel')}
                        </label>
                        <select
                            value={config.model || ''}
                            onChange={(e) => onChange('model', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-cyan-500 focus:outline-none"
                            disabled={!config.llmProvider || availableModels.length === 0}
                        >
                            {!config.model && <option value="">{t('agentConfig_llm_modelPlaceholder')}</option>}
                            {availableModels.map(model => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t('agentConfig_llm_systemPromptLabel')}
                    </label>
                    <textarea
                        value={config.systemPrompt || ''}
                        onChange={(e) => onChange('systemPrompt', e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm resize-vertical focus:border-cyan-500 focus:outline-none"
                        placeholder={t('agentConfig_llm_systemPromptPlaceholder')}
                    />
                </div>
            </div>

            {/* Capacités */}
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">{t('agentConfig_capabilities_title')}</h3>
                <div className="grid grid-cols-2 gap-3">
                    {modelCapabilities.map((cap) => (
                        <label key={cap} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800 p-2 rounded">
                            <input
                                type="checkbox"
                                checked={config.capabilities?.includes(cap) || false}
                                onChange={() => toggleCapability(cap)}
                                className="w-4 h-4 text-cyan-600 border-gray-600 rounded focus:ring-cyan-500"
                            />
                            <span className="text-sm text-gray-300">{cap}</span>
                        </label>
                    ))}
                </div>
                {modelCapabilities.length === 0 && (
                    <p className="text-sm text-gray-500">{t('agentConfig_capabilities_empty')}</p>
                )}
            </div>

        </div>
    );
};

// History Tab Component
const HistoryTab: React.FC<{
    config: any;
    onChange: (field: string, value: any) => void;
    llmConfigs: LLMConfig[];
    t: (key: string) => string;
}> = ({ config, onChange, llmConfigs, t }) => {
    const availableProviders = llmConfigs.filter(c => c.enabled && c.apiKey).map(c => c.provider);
    const availableModels = config.historyConfig?.llmProvider ? LLM_MODELS[config.historyConfig.llmProvider as LLMProvider] || [] : [];

    const handleProviderChange = (provider: LLMProvider) => {
        const models = LLM_MODELS[provider] || [];
        onChange('historyConfig', {
            ...config.historyConfig,
            llmProvider: provider,
            model: models[0] || ''
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <ToggleSwitch
                    label={t('agentConfig_history_enableLabel')}
                    checked={config.historyConfig?.enabled || false}
                    onChange={(checked) => onChange('historyConfig', { ...config.historyConfig, enabled: checked })}
                />
                {config.historyConfig?.enabled && (
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('agentConfig_history_limitsLabel')}</label>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.keys(config.historyConfig?.limits || {}).map(key => (
                                    <div key={key}>
                                        <label className="text-xs text-gray-400 capitalize">{key}</label>
                                        <input
                                            type="number"
                                            value={config.historyConfig.limits[key]}
                                            onChange={(e) => onChange('historyConfig', {
                                                ...config.historyConfig,
                                                limits: { ...config.historyConfig.limits, [key]: parseInt(e.target.value) || 0 }
                                            })}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm mt-1"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('agentConfig_history_synthesisLabel')}</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400">{t('agentConfig_history_llmProviderLabel')}</label>
                                    <select
                                        value={config.historyConfig?.llmProvider || 'gemini'}
                                        onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm mt-1"
                                    >
                                        {availableProviders.map(provider => (
                                            <option key={provider} value={provider}>{provider}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400">{t('agentConfig_history_llmModelLabel')}</label>
                                    <select
                                        value={config.historyConfig?.model || ''}
                                        onChange={(e) => onChange('historyConfig', { ...config.historyConfig, model: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm mt-1"
                                    >
                                        {availableModels.map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('agentConfig_history_systemPromptLabel')}</label>
                            <textarea
                                value={config.historyConfig?.systemPrompt || ''}
                                onChange={(e) => onChange('historyConfig', { ...config.historyConfig, systemPrompt: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                placeholder="Résume la conversation de manière factuelle..."
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Functions Tab Component
const FunctionsTab: React.FC<{
    config: any;
    onChange: (field: string, value: any) => void;
    t: (key: string) => string;
}> = ({ config, onChange, t }) => {
    const [toolsJsonInput, setToolsJsonInput] = useState(JSON.stringify(config.tools || [], null, 2));
    const [toolsError, setToolsError] = useState('');

    const handleToolsJsonChange = (value: string) => {
        setToolsJsonInput(value);
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                onChange('tools', parsed);
                setToolsError('');
            } else {
                setToolsError('Les outils doivent être un tableau JSON');
            }
        } catch (e) {
            setToolsError('JSON invalide : ' + (e as Error).message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">{t('agentConfig_functions_editorLabel')}</h3>
                <p className="text-sm text-gray-400 mb-3">
                    {config.tools?.length || 0} outil(s) configuré(s)
                </p>
                <textarea
                    value={toolsJsonInput}
                    onChange={(e) => handleToolsJsonChange(e.target.value)}
                    rows={20}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded text-white font-mono text-xs resize-vertical focus:outline-none ${toolsError ? 'border-red-500' : 'border-gray-600 focus:border-cyan-500'
                        }`}
                    placeholder='[{"name": "tool_name", "description": "...", "parameters": {...}}]'
                />
                {toolsError && (
                    <p className="mt-2 text-sm text-red-400">⚠️ {toolsError}</p>
                )}
                <p className="mt-3 text-xs text-gray-500">
                    💡 {t('agentConfig_functions_pythonNote')}
                </p>
            </div>
        </div>
    );
};

// Formatting Tab Component
const FormattingTab: React.FC<{
    config: any;
    onChange: (field: string, value: any) => void;
    t: (key: string) => string;
}> = ({ config, onChange, t }) => {
    const outputFormats: OutputFormat[] = ['json', 'xml', 'yaml', 'shell', 'powershell', 'python', 'html', 'css', 'javascript', 'typescript', 'php', 'sql', 'mysql', 'mongodb'];

    return (
        <div className="space-y-6">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <ToggleSwitch
                    label={t('agentConfig_formatting_enableLabel')}
                    checked={config.outputConfig?.enabled || false}
                    onChange={(checked) => onChange('outputConfig', { ...config.outputConfig, enabled: checked })}
                />
                {config.outputConfig?.enabled && (
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('agentConfig_formatting_formatLabel')}</label>
                            <select
                                value={config.outputConfig?.format || 'json'}
                                onChange={(e) => onChange('outputConfig', { ...config.outputConfig, format: e.target.value as OutputFormat })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                            >
                                {outputFormats.map(fmt => (
                                    <option key={fmt} value={fmt}>{fmt.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded">
                            <p className="text-xs text-gray-400">
                                💡 La sortie structurée force le LLM à générer du contenu dans le format spécifié.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Placeholder Tab Component
const PlaceholderTab: React.FC<{
    title: string;
    description: string;
    icon: string;
    items?: any[];
}> = ({ title, description, icon, items }) => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="text-6xl mb-4">{icon}</div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-center max-w-md mb-4">{description}</p>
        {items && items.length > 0 && (
            <div className="mt-4 text-sm">
                {items.length} élément(s) disponible(s)
            </div>
        )}
        <div className="mt-6 px-4 py-2 bg-gray-700/50 rounded text-sm">
            🚧 Fonctionnalité à venir
        </div>
    </div>
);
