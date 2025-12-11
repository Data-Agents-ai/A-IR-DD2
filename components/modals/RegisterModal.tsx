/**
 * @file RegisterModal.tsx
 * @description Registration modal with email/password/confirm password form
 * @domain Design Domain - Authentication UI
 */

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../UI';

interface RegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    onSwitchToLogin?: () => void;
}

/**
 * RegisterModal - Displays registration form with password validation
 * 
 * VALIDATION:
 * - Email: standard email format
 * - Password: minimum 8 characters
 * - Password confirmation: must match
 * - Real-time validation feedback
 * 
 * NON-RÉGRESSION: Closing modal doesn't affect Guest mode
 */
export const RegisterModal: React.FC<RegisterModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    onSwitchToLogin
}) => {
    const { register, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [showValidationRules, setShowValidationRules] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{
        password?: string;
        confirmPassword?: string;
    }>({});

    if (!isOpen) return null;

    const validateForm = (): boolean => {
        const errors: typeof validationErrors = {};

        if (password.length < 8) {
            errors.password = 'Minimum 8 caractères';
        }

        if (password !== confirmPassword) {
            errors.confirmPassword = 'Les mots de passe ne correspondent pas';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password || !confirmPassword) {
            setError('Tous les champs sont requis');
            return;
        }

        if (!validateForm()) {
            return;
        }

        try {
            await register(email, password);
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erreur lors de l\'inscription');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Inscription</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition text-2xl leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-200 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Input */}
                    <div>
                        <label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-1">
                            Email
                        </label>
                        <input
                            id="register-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="votre@email.com"
                            autoComplete="email"
                            disabled={isLoading}
                            required
                        />
                    </div>

                    {/* Password Input */}
                    <div>
                        <label htmlFor="register-password" className="block text-sm font-medium text-gray-300 mb-1">
                            Mot de passe
                        </label>
                        <input
                            id="register-password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                // Clear error if user fixes it
                                if (validationErrors.password && e.target.value.length >= 8) {
                                    setValidationErrors({ ...validationErrors, password: undefined });
                                }
                            }}
                            className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition ${validationErrors.password
                                ? 'border-red-600 focus:border-red-500 focus:ring-red-500'
                                : 'border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'
                                }`}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            disabled={isLoading}
                            minLength={8}
                            required
                        />
                        {validationErrors.password && (
                            <p className="mt-1 text-xs text-red-400">{validationErrors.password}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Minimum 8 caractères avec règles spécifiques (voir ci-dessous)</p>
                    </div>

                    {/* Confirm Password Input */}
                    <div>
                        <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                            Confirmer le mot de passe
                        </label>
                        <input
                            id="register-confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                // Clear error if user fixes it
                                if (validationErrors.confirmPassword && e.target.value === password) {
                                    setValidationErrors({ ...validationErrors, confirmPassword: undefined });
                                }
                            }}
                            className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition ${validationErrors.confirmPassword
                                ? 'border-red-600 focus:border-red-500 focus:ring-red-500'
                                : 'border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'
                                }`}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            disabled={isLoading}
                            required
                        />
                        {validationErrors.confirmPassword && (
                            <p className="mt-1 text-xs text-red-400">{validationErrors.confirmPassword}</p>
                        )}
                    </div>

                    {/* Validation Rules Info Box */}
                    <div className="bg-indigo-900/30 border border-indigo-600/40 rounded-lg p-3">
                        <button
                            type="button"
                            onClick={() => setShowValidationRules(!showValidationRules)}
                            className="flex items-center justify-between w-full cursor-pointer hover:opacity-80 transition"
                        >
                            <span className="text-sm font-medium text-indigo-300">📋 Règles de validation</span>
                            <span className={`text-indigo-400 transform transition-transform ${showValidationRules ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </button>
                        
                        {showValidationRules && (
                            <div className="mt-3 space-y-2 text-xs text-indigo-200">
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-400 font-bold mt-0.5">•</span>
                                    <span>Email valide</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-400 font-bold mt-0.5">•</span>
                                    <span>Minimum 8 caractères</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-400 font-bold mt-0.5">•</span>
                                    <span>Au moins 1 majuscule requise</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-400 font-bold mt-0.5">•</span>
                                    <span>Au moins 1 minuscule requise</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-400 font-bold mt-0.5">•</span>
                                    <span>Au moins 1 chiffre requis</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={
                            isLoading ||
                            !email ||
                            !password ||
                            !confirmPassword ||
                            Object.keys(validationErrors).length > 0
                        }
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition"
                    >
                        {isLoading ? 'Inscription en cours...' : 'S\'inscrire'}
                    </Button>
                </form>

                {/* Footer */}
                <div className="mt-4 text-center text-sm text-gray-400">
                    Déjà inscrit?{' '}
                    <button
                        onClick={() => {
                            onClose();
                            onSwitchToLogin?.();
                        }}
                        className="text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                    >
                        Se connecter
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegisterModal;
