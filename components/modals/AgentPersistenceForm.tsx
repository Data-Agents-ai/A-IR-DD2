/**
 * @file AgentPersistenceForm.tsx
 * @description Sous-composant pour la configuration de persistance par agent
 * @domain Design Domain - Persistence UI
 * 
 * ⭐ PLAN_DE_PERSISTENCE: Configuration granulaire par agent
 * 
 * SOLID PRINCIPLES:
 * - S: Single responsibility - Uniquement la config de persistance
 * - O: Open for extension via callbacks
 * - L: Liskov - Peut remplacer n'importe quel formulaire de config
 * - I: Interface séparée (PersistenceConfig)
 * - D: Dépend de l'abstraction PersistenceConfig
 * 
 * UX FEATURES:
 * - Tooltips explicatifs pour chaque option
 * - Indicateurs visuels pour les options placeholder (à venir)
 * - Style cohérent avec le reste du formulaire agent
 */

import React from 'react';
import { PersistenceConfig, MediaStorageType, defaultPersistenceConfig } from '../../types';
import { useLocalization } from '../../contexts/LocalizationContext';

interface AgentPersistenceFormProps {
  config: PersistenceConfig;
  onChange: (config: PersistenceConfig) => void;
  disabled?: boolean;
}

interface SwitchOptionProps {
  id: string;
  label: string;
  tooltip: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  isPlaceholder?: boolean; // Pour les options futures
}

/**
 * Switch toggle avec tooltip intégré
 */
const SwitchOption: React.FC<SwitchOptionProps> = ({
  id,
  label,
  tooltip,
  checked,
  onChange,
  disabled = false,
  isPlaceholder = false
}) => {
  return (
    <div className="flex items-center justify-between py-3 group">
      <div className="flex flex-col flex-1 mr-4">
        <div className="flex items-center gap-2">
          <label htmlFor={id} className={`text-sm font-medium ${isPlaceholder ? 'text-gray-500' : 'text-gray-200'}`}>
            {label}
            {isPlaceholder && (
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                Bientôt
              </span>
            )}
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {tooltip}
        </p>
      </div>
      
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled || isPlaceholder}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full 
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800
          ${disabled || isPlaceholder ? 'opacity-50 cursor-not-allowed' : ''}
          ${checked ? 'bg-indigo-600' : 'bg-gray-600'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full 
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
};

/**
 * Sélecteur de stockage média
 */
const MediaStorageSelector: React.FC<{
  value: MediaStorageType;
  onChange: (value: MediaStorageType) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const options: { value: MediaStorageType; label: string; description: string; icon: string }[] = [
    {
      value: 'db',
      label: 'Base de données',
      description: 'Stockage GridFS (MongoDB) - Recommandé',
      icon: '🗄️'
    },
    {
      value: 'local',
      label: 'Stockage local',
      description: 'Système de fichiers serveur',
      icon: '💾'
    },
    {
      value: 'cloud',
      label: 'Cloud (S3/GCS)',
      description: 'Stockage cloud externe - À venir',
      icon: '☁️'
    }
  ];

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-200 mb-3">
        Stockage des médias (images, fichiers)
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled || option.value === 'cloud'} // Cloud pas encore disponible
            onClick={() => onChange(option.value)}
            className={`
              w-full flex items-center p-3 rounded-lg border-2 transition-all duration-200
              ${value === option.value 
                ? 'border-indigo-500 bg-indigo-500/10' 
                : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
              }
              ${(disabled || option.value === 'cloud') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-2xl mr-3">{option.icon}</span>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${value === option.value ? 'text-indigo-300' : 'text-gray-200'}`}>
                  {option.label}
                </span>
                {option.value === 'cloud' && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                    Bientôt
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{option.description}</p>
            </div>
            {value === option.value && (
              <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Formulaire principal de configuration de persistance
 */
export const AgentPersistenceForm: React.FC<AgentPersistenceFormProps> = ({
  config,
  onChange,
  disabled = false
}) => {
  const { t } = useLocalization();
  
  // Helper pour mettre à jour un champ spécifique
  const updateField = <K extends keyof PersistenceConfig>(
    field: K,
    value: PersistenceConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Header avec icône */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-700">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Options de sauvegarde</h3>
          <p className="text-xs text-gray-400">Configurez ce qui est persisté pour cet agent</p>
        </div>
      </div>

      {/* Section: Données de conversation */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Données de conversation
        </h4>
        
        <SwitchOption
          id="saveChat"
          label="Sauvegarder le chat"
          tooltip="Persiste l'historique complet des messages échangés avec l'agent"
          checked={config.saveChat}
          onChange={(v) => updateField('saveChat', v)}
          disabled={disabled}
        />
        
        <SwitchOption
          id="saveErrors"
          label="Sauvegarder les erreurs"
          tooltip="Enregistre les erreurs rencontrées pour le débogage et l'analyse"
          checked={config.saveErrors}
          onChange={(v) => updateField('saveErrors', v)}
          disabled={disabled}
        />
        
        <SwitchOption
          id="saveHistorySummary"
          label="Résumé périodique"
          tooltip="Génère et stocke un résumé de conversation pour économiser des tokens lors des sessions longues"
          checked={config.saveHistorySummary}
          onChange={(v) => updateField('saveHistorySummary', v)}
          disabled={disabled}
        />
      </div>

      {/* Section: Métadonnées (placeholders) */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Métadonnées (fonctionnalités futures)
        </h4>
        
        <SwitchOption
          id="saveLinks"
          label="Sauvegarder les liens"
          tooltip="Persiste les connexions et relations entre agents dans le workflow"
          checked={config.saveLinks}
          onChange={(v) => updateField('saveLinks', v)}
          disabled={disabled}
          isPlaceholder={true}
        />
        
        <SwitchOption
          id="saveTasks"
          label="Sauvegarder les tâches"
          tooltip="Enregistre les tâches assignées et leur état d'avancement"
          checked={config.saveTasks}
          onChange={(v) => updateField('saveTasks', v)}
          disabled={disabled}
          isPlaceholder={true}
        />
      </div>

      {/* Section: Stockage média */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Stockage des médias
        </h4>
        
        <MediaStorageSelector
          value={config.mediaStorage}
          onChange={(v) => updateField('mediaStorage', v)}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default AgentPersistenceForm;
