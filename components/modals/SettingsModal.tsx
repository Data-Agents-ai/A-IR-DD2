import React, { useState } from 'react';
import { LLMConfig, LLMCapability, LLMProvider } from '../../types';
import { Button, Modal, ToggleSwitch } from '../UI';
import { useLocalization } from '../../hooks/useLocalization';
import { locales, Locale } from '../../i18n/locales';

interface SettingsModalProps {
  llmConfigs: LLMConfig[];
  onClose: () => void;
  onSave: (llmConfigs: LLMConfig[]) => void;
}

export const SettingsModal = ({ llmConfigs, onClose, onSave }: SettingsModalProps) => {
  const [currentLLMConfigs, setCurrentLLMConfigs] = useState<LLMConfig[]>(JSON.parse(JSON.stringify(llmConfigs)));
  const { t, locale, setLocale } = useLocalization();
  const [activeTab, setActiveTab] = useState<'llms' | 'language'>('llms');

  const handleProviderToggle = (provider: LLMProvider, enabled: boolean) => {
    setCurrentLLMConfigs(prev =>
      prev.map(c => (c.provider === provider ? { ...c, enabled } : c))
    );
  };

  const handleCapabilityToggle = (provider: LLMProvider, capability: LLMCapability, enabled: boolean) => {
     setCurrentLLMConfigs(prev =>
      prev.map(c => 
        c.provider === provider 
          ? { ...c, capabilities: { ...c.capabilities, [capability]: enabled } } 
          : c
      )
    );
  }
  
  const handleApiKeyChange = (provider: LLMProvider, apiKey: string) => {
    setCurrentLLMConfigs(prev =>
      prev.map(c => (c.provider === provider ? { ...c, apiKey } : c))
    );
  };

  const handleSave = () => {
    onSave(currentLLMConfigs);
    onClose();
  };
  
  return (
    <Modal title={t('settings_title')} isOpen={true} onClose={onClose}>
        <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button type="button" onClick={() => setActiveTab('llms')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'llms' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('settings_llms_tab')}</button>
                <button type="button" onClick={() => setActiveTab('language')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'language' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('settings_language_tab')}</button>
            </nav>
        </div>
        <div className="pt-4 max-h-[60vh] overflow-y-auto pr-2">
            {activeTab === 'language' && (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="language-select" className="block text-sm font-medium text-gray-300 mb-1">{t('settings_language_label')}</label>
                        <select 
                            id="language-select" 
                            value={locale} 
                            onChange={(e) => setLocale(e.target.value as Locale)} 
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {Object.entries(locales).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                        </select>
                    </div>
                </div>
            )}
            {activeTab === 'llms' && (
                 <div className="space-y-6">
                 {currentLLMConfigs.map(({ provider, enabled, capabilities, apiKey }) => (
                     <div key={provider}>
                     <div className="flex items-center justify-between">
                         <h3 className="text-lg font-semibold text-gray-200">{provider}</h3>
                         <ToggleSwitch checked={enabled} onChange={(checked) => handleProviderToggle(provider, checked)} />
                     </div>
                     {enabled && (
                         <div className="pl-4 mt-4 space-y-4 border-l-2 border-gray-700">
                            <div>
                                <label htmlFor={`${provider}-apikey`} className="block text-sm font-medium text-gray-400 mb-1">
                                    {provider === LLMProvider.LMStudio ? t('settings_endpoint') : t('settings_apiKey')}
                                </label>
                                <input
                                    id={`${provider}-apikey`}
                                    type={provider === LLMProvider.LMStudio ? "url" : "password"}
                                    value={apiKey}
                                    onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                                    placeholder={provider === LLMProvider.LMStudio ? "http://localhost:3928" : t('settings_apiKey_placeholder')}
                                    className="w-full p-2 text-sm bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {provider === LLMProvider.LMStudio && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Auto-detects Jan (3928), LM Studio (1234), Ollama (11434)
                                    </p>
                                )}
                            </div>
                         <div className="space-y-2 pt-2">
                             {Object.keys(capabilities).sort().map(capStr => {
                                const cap = capStr as LLMCapability;
                                return (
                                    <div key={cap} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-sm text-gray-400">{cap}</span>
                                            {cap === LLMCapability.WebSearch && provider === LLMProvider.Gemini && (
                                                <span className="ml-2 text-xs text-gray-500">{t('settings_gemini_optimized')}</span>
                                            )}
                                            {cap === LLMCapability.Reasoning && provider === LLMProvider.DeepSeek && (
                                                <span className="ml-2 text-xs text-green-500">R1 Reasoning</span>
                                            )}
                                            {cap === LLMCapability.CacheOptimization && provider === LLMProvider.DeepSeek && (
                                                <span className="ml-2 text-xs text-blue-500">0.014¢/1K tokens</span>
                                            )}
                                            {cap === LLMCapability.LocalDeployment && provider === LLMProvider.LMStudio && (
                                                <span className="ml-2 text-xs text-purple-500">Sovereignty</span>
                                            )}
                                            {cap === LLMCapability.CodeSpecialization && provider === LLMProvider.LMStudio && (
                                                <span className="ml-2 text-xs text-orange-500">Qwen2.5 Coder</span>
                                            )}
                                        </div>
                                        <ToggleSwitch 
                                            checked={capabilities[cap] || false} 
                                            onChange={(checked) => handleCapabilityToggle(provider, cap, checked)} 
                                            />
                                    </div>
                                );
                             })}
                         </div>
                         </div>
                     )}
                     </div>
                 ))}
                 </div>
            )}
        </div>
      <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-700">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="button" variant="primary" onClick={handleSave}>
          {t('save')}
        </Button>
      </div>
    </Modal>
  );
};
