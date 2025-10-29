import React from 'react';
import { SettingsIcon, LogoIcon } from './Icons';
import { Button } from './UI';
import { useLocalization } from '../hooks/useLocalization';

interface HeaderProps {
  onOpenSettings: () => void;
  onToggleV2?: () => void;
  isV2Mode?: boolean;
}

export const Header = ({ onOpenSettings, onToggleV2, isV2Mode }: HeaderProps) => {
  const { t } = useLocalization();
  return (
    <header className="flex items-center justify-between p-3 border-b border-gray-800 bg-black/80 backdrop-blur-sm">
      <LogoIcon />
      <div className="flex items-center space-x-3">
        {onToggleV2 && (
          <Button 
            variant={isV2Mode ? "primary" : "secondary"} 
            onClick={onToggleV2} 
            className="px-3 py-2 text-sm font-medium"
          >
            {isV2Mode ? 'V2 Mode' : 'V1 Mode'}
          </Button>
        )}
        <Button variant="ghost" onClick={onOpenSettings} className="flex items-center px-4 py-2 font-semibold text-sm">
          <SettingsIcon className="text-gray-400" />
          <span className="ml-2">{t('header_settings')}</span>
        </Button>
      </div>
    </header>
  );
};