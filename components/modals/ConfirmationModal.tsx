import React from 'react';
import { Modal, Button } from '../UI';
import { useLocalization } from '../../hooks/useLocalization';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  variant = 'primary',
}) => {
  const { t } = useLocalization();

  return (
    <Modal title={title} isOpen={isOpen} onClose={onCancel}>
      <div className="space-y-6">
        <p className="text-gray-300 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            {cancelText || t('cancel')}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmText || t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};