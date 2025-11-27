import React from 'react';
import { Agent, LLMConfig, LLMProvider } from '../../types';
import { Button } from '../UI';
import { CloseIcon } from '../Icons';

interface WorkflowValidationModalProps {
  isOpen: boolean;
  agent: Agent | null;
  llmConfigs: LLMConfig[];
  onConfirm: () => void;
  onCancel: () => void;
}

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

const AlertTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="m12 17 .01 0" />
  </svg>
);

export const WorkflowValidationModal: React.FC<WorkflowValidationModalProps> = ({
  isOpen,
  agent,
  llmConfigs,
  onConfirm,
  onCancel
}) => {
  if (!isOpen || !agent) return null;

  // Validation des prérequis
  const hasEnabledLLM = llmConfigs.some(config => config.enabled);
  const compatibleLLMs = llmConfigs.filter(config =>
    config.enabled &&
    (!agent.llmProvider || agent.llmProvider === config.provider)
  );

  const hasCompatibleLLM = compatibleLLMs.length > 0;
  const hasTools = agent.tools && agent.tools.length > 0;
  const isReady = hasEnabledLLM && hasCompatibleLLM;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl border border-gray-600">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Ajouter au workflow</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Agent Info */}
        <div className="bg-gray-700 p-3 rounded-lg mb-4">
          <h3 className="text-white font-semibold">{agent.name}</h3>
          <p className="text-gray-300 text-sm">{agent.description || 'Aucune description'}</p>
        </div>

        {/* Validation Checks */}
        <div className="space-y-3 mb-6">
          <h3 className="text-white font-semibold mb-3">Vérification des prérequis :</h3>

          {/* LLM Configuration */}
          <div className="flex items-start space-x-3">
            {hasEnabledLLM ? (
              <CheckIcon className="w-5 h-5 text-green-400 mt-0.5" />
            ) : (
              <XIcon className="w-5 h-5 text-red-400 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${hasEnabledLLM ? 'text-green-400' : 'text-red-400'}`}>
                Configuration LLM
              </p>
              <p className="text-gray-400 text-sm">
                {hasEnabledLLM
                  ? `${llmConfigs.filter(c => c.enabled).length} provider(s) configuré(s)`
                  : 'Aucun provider LLM configuré'
                }
              </p>
            </div>
          </div>

          {/* Provider Compatibility */}
          <div className="flex items-start space-x-3">
            {hasCompatibleLLM ? (
              <CheckIcon className="w-5 h-5 text-green-400 mt-0.5" />
            ) : (
              <XIcon className="w-5 h-5 text-red-400 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${hasCompatibleLLM ? 'text-green-400' : 'text-red-400'}`}>
                Compatibilité provider
              </p>
              <p className="text-gray-400 text-sm">
                {hasCompatibleLLM
                  ? `Compatible avec ${compatibleLLMs.map(c => c.provider).join(', ')}`
                  : !agent.llmProvider
                    ? 'Compatible avec tous les providers disponibles'
                    : `Provider requis: ${agent.llmProvider} (non configuré)`
                }
              </p>
            </div>
          </div>

          {/* Tools */}
          <div className="flex items-start space-x-3">
            <CheckIcon className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-400">Outils disponibles</p>
              <p className="text-gray-400 text-sm">
                {hasTools
                  ? `${agent.tools!.length} outil(s) configuré(s)`
                  : 'Agent de conversation simple (aucun outil)'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Warning/Success message */}
        {!isReady ? (
          <div className="bg-red-900/30 border border-red-500/50 p-3 rounded-lg mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangleIcon className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-semibold">Configuration incomplète</span>
            </div>
            <p className="text-red-300 text-sm mt-1">
              Veuillez configurer au moins un provider LLM compatible dans les paramètres avant d'ajouter cet agent au workflow.
            </p>
          </div>
        ) : (
          <div className="bg-green-900/30 border border-green-500/50 p-3 rounded-lg mb-4">
            <div className="flex items-center space-x-2">
              <CheckIcon className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-semibold">Prêt pour le workflow</span>
            </div>
            <p className="text-green-300 text-sm mt-1">
              Cet agent peut être ajouté au workflow et sera opérationnel immédiatement.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            onClick={onCancel}
            variant="secondary"
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            variant={isReady ? "primary" : "secondary"}
            disabled={!isReady}
            className="flex-1"
          >
            {isReady ? 'Ajouter au workflow' : 'Configuration requise'}
          </Button>
        </div>
      </div>
    </div>
  );
};