import React from 'react';
import { Button } from '../UI';
import { useLocalization } from '../../hooks/useLocalization';

interface PrototypeEditConfirmationModalProps {
  isOpen: boolean;
  agentName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PrototypeEditConfirmationModal: React.FC<PrototypeEditConfirmationModalProps> = ({
  isOpen,
  agentName,
  onConfirm,
  onCancel
}) => {
  const { t } = useLocalization();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-start mb-4">
          {/* Icône d'avertissement */}
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('prototypeEdit_confirmTitle')}
            </h3>
            <p className="text-sm text-gray-600">
              {t('prototypeEdit_confirmMessage', { agentName })}
            </p>
            <p className="text-xs text-amber-600 mt-2 font-medium">
              ⚠️ {t('prototypeEdit_warning')}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="px-4 py-2"
          >
            {t('prototypeEdit_cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700"
          >
            {t('prototypeEdit_confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};