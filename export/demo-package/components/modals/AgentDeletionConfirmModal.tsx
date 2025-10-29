import React from 'react';
import { Agent, AgentInstance } from '../../types';
import { Button } from '../UI';
import { CloseIcon } from '../Icons';
import { useDesignStore } from '../../stores/useDesignStore';

interface AgentDeletionConfirmModalProps {
  isOpen: boolean;
  agent: Agent | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const AlertIcon2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/>
    <path d="m12 17 .01 0"/>
  </svg>
);

export const AgentDeletionConfirmModal: React.FC<AgentDeletionConfirmModalProps> = ({
  isOpen,
  agent,
  onConfirm,
  onCancel
}) => {
  const { getInstancesOfPrototype } = useDesignStore();

  if (!isOpen || !agent) return null;

  // Analyse d'impact
  const affectedInstances = getInstancesOfPrototype(agent.id);
  const hasActiveInstances = affectedInstances.length > 0;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-600">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <AlertIcon2 className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-bold text-white">Confirmer la suppression</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Agent info */}
          <div className="bg-gray-700 p-3 rounded-lg">
            <p className="text-white font-semibold">{agent.name}</p>
            <p className="text-gray-300 text-sm">{agent.description || 'Aucune description'}</p>
          </div>

          {/* Impact analysis */}
          {hasActiveInstances ? (
            <div className="bg-red-900/30 border border-red-500/50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertIcon2 className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-semibold">Impact détecté</span>
              </div>
              <p className="text-red-300 text-sm mb-2">
                Cet agent a <strong>{affectedInstances.length} instance(s)</strong> active(s) dans le workflow :
              </p>
              <ul className="text-red-200 text-sm space-y-1 ml-4">
                {affectedInstances.map((instance) => (
                  <li key={instance.id} className="flex items-center space-x-2">
                    <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                    <span>{instance.name}</span>
                  </li>
                ))}
              </ul>
              <p className="text-red-300 text-sm mt-2">
                ⚠️ Toutes ces instances seront également supprimées du workflow.
              </p>
            </div>
          ) : (
            <div className="bg-green-900/30 border border-green-500/50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                  <span className="text-green-900 text-xs">✓</span>
                </div>
                <span className="text-green-400">Suppression sécurisée</span>
              </div>
              <p className="text-green-300 text-sm mt-1">
                Aucune instance active détectée. La suppression n'affectera pas le workflow.
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-900/30 border border-yellow-500/50 p-3 rounded-lg">
            <p className="text-yellow-300 text-sm">
              ⚠️ Cette action est <strong>irréversible</strong>. L'agent et sa configuration seront définitivement perdus.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-6">
          <Button
            onClick={onCancel}
            variant="secondary"
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            variant="danger"
            className="flex-1"
          >
            {hasActiveInstances ? `Supprimer tout (${affectedInstances.length + 1})` : 'Supprimer'}
          </Button>
        </div>
      </div>
    </div>
  );
};