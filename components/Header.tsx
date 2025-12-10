import React, { useState } from 'react';
import { SettingsIcon, LogoIcon } from './Icons';
import { Button } from './UI';
import { useLocalization } from '../hooks/useLocalization';
import { useAuth } from '../hooks/useAuth';
import { LoginModal } from './modals/LoginModal';
import { RegisterModal } from './modals/RegisterModal';

interface HeaderProps {
  onOpenSettings: () => void;
}

/**
 * Header component with authentication UI
 * 
 * MODES:
 * - Guest Mode: Shows "Mode Invité" + Login/Register buttons
 * - Authenticated Mode: Shows user email + Logout button
 * 
 * NON-RÉGRESSION: Guest mode buttons don't block or freeze app
 */
export const Header = ({ onOpenSettings }: HeaderProps) => {
  const { t } = useLocalization();
  const { user, isAuthenticated, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between p-3 border-b border-gray-800 bg-black/80 backdrop-blur-sm">
        <LogoIcon />

        <div className="flex items-center space-x-3">
          {/* Settings Button - J4.3: Show LLM settings when authenticated */}
          <Button
            variant="ghost"
            onClick={onOpenSettings}
            disabled={!isAuthenticated}
            className="flex items-center px-4 py-2 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isAuthenticated ? 'Connectez-vous pour accéder aux paramètres' : 'Paramètres LLM'}
          >
            <SettingsIcon className="text-gray-400" />
            <span className="ml-2">
              {isAuthenticated ? 'Paramètres LLM' : t('header_settings')}
            </span>
            {isAuthenticated && (
              <span className="ml-3 text-xs px-2 py-1 bg-indigo-600 rounded-full text-white">
                {user?.email}
              </span>
            )}
          </Button>

          {/* Authentication UI */}
          <div className="border-l border-gray-700 pl-3 flex items-center space-x-2">
            {!isAuthenticated ? (
              // GUEST MODE
              <>
                <span className="text-gray-400 text-xs px-2 py-1 bg-gray-900 rounded">
                  Mode Invité
                </span>
                <Button
                  onClick={() => setShowLoginModal(true)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white text-sm transition"
                >
                  Connexion
                </Button>
                <Button
                  onClick={() => setShowRegisterModal(true)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition"
                >
                  Inscription
                </Button>
              </>
            ) : (
              // AUTHENTICATED MODE
              <>
                <span className="text-gray-300 text-sm px-2 py-1 bg-indigo-900/30 rounded">
                  {user?.email}
                </span>
                <Button
                  onClick={logout}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition"
                >
                  Déconnexion
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          // Optional: Show notification on successful login
        }}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
      />
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={() => {
          // Optional: Show notification on successful registration
        }}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />
    </>
  );
};