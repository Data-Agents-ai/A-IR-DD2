/**
 * 🪝 CUSTOM HOOK: useLLMConfigs
 * 
 * Pattern: Abstraction layer pour les composants React
 * Responsabilité: 
 *   - Consommer AuthContext pour connaître l'état d'authentification
 *   - Appeler llmConfigService avec les options appropriées
 *   - Gérer l'état local (loading, error)
 *   - Fournir une API simple aux composants
 * 
 * Principe Dependency Inversion:
 *   Les composants dépendent de cette interface abstraite (le hook)
 *   Pas de dépendance directe sur fetch, localStorage, ou llmConfigService
 * 
 * Usage:
 *   const { configs, updateConfig, loading } = useLLMConfigs();
 *   await updateConfig('OpenAI', { apiKey: '...', enabled: true });
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { ILLMConfigUI } from '../types';
import * as llmConfigService from '../services/llmConfigService';

interface UseLLMConfigsReturn {
  // Data
  configs: ILLMConfigUI[];
  
  // State
  loading: boolean;
  error: string | null;
  
  // Actions (all async)
  loadConfigs: () => Promise<void>;
  getConfig: (provider: string) => Promise<ILLMConfigUI | null>;
  updateConfig: (
    provider: string,
    data: {
      apiKey: string;
      enabled: boolean;
      capabilities?: Record<string, boolean>;
    }
  ) => Promise<ILLMConfigUI>;
  deleteConfig: (provider: string) => Promise<void>;
  validateProvider: (provider: string) => Promise<{
    valid: boolean;
    enabled: boolean;
    hasApiKey: boolean;
    capabilities: Record<string, boolean>;
  }>;
  
  // Clear error
  clearError: () => void;
}

export function useLLMConfigs(): UseLLMConfigsReturn {
  const auth = useAuth();
  const { isAuthenticated, accessToken } = auth;
  
  // State
  const [configs, setConfigs] = useState<ILLMConfigUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Options para le service
  const serviceOptions = {
    useApi: isAuthenticated,
    token: accessToken || undefined
  };

  // Monitor auth state changes
  useEffect(() => {
    // Auth state changed - configs will be reloaded if needed
  }, [isAuthenticated, accessToken]);

  /**
   * ⭐ CRITICAL: Clear configs from memory when logout happens
   * Prevents authenticated user configs from bleeding into guest mode
   * This must happen BEFORE loadConfigs() is called with guest options
   */
  useEffect(() => {
    if (!isAuthenticated && configs.length > 0) {
      setConfigs([]);
    }
  }, [isAuthenticated]);

  /**
   * Charge toutes les configs au montage et quand l'auth change
   */
  useEffect(() => {
    void loadConfigs();
  }, [isAuthenticated, accessToken]);

  /**
   * Charge toutes les configs LLM
   */
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await llmConfigService.getAllLLMConfigs(serviceOptions);
      setConfigs(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  /**
   * Récupère une config spécifique
   */
  const getConfig = useCallback(
    async (provider: string): Promise<ILLMConfigUI | null> => {
      try {
        return await llmConfigService.getLLMConfig(provider, serviceOptions);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return null;
      }
    },
    [isAuthenticated, accessToken]
  );

  /**
   * Crée ou met à jour une config
   */
  const updateConfig = useCallback(
    async (
      provider: string,
      data: {
        apiKey: string;
        enabled: boolean;
        capabilities?: Record<string, boolean>;
      }
    ): Promise<ILLMConfigUI> => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await llmConfigService.upsertLLMConfig(
          provider,
          data,
          serviceOptions
        );

        // Update local state
        setConfigs(prev => {
          const index = prev.findIndex(c => c.provider === provider);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = result;
            return updated;
          } else {
            return [...prev, result];
          }
        });

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, accessToken]
  );

  /**
   * Supprime une config
   */
  const deleteConfig = useCallback(
    async (provider: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await llmConfigService.deleteLLMConfig(provider, serviceOptions);

        // Update local state
        setConfigs(prev => prev.filter(c => c.provider !== provider));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, accessToken]
  );

  /**
   * Valide un provider
   */
  const validateProvider = useCallback(
    async (provider: string) => {
      try {
        return await llmConfigService.validateProvider(provider, serviceOptions);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        throw err;
      }
    },
    [isAuthenticated, accessToken]
  );

  /**
   * Efface le message d'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    configs,
    loading,
    error,
    loadConfigs,
    getConfig,
    updateConfig,
    deleteConfig,
    validateProvider,
    clearError
  };
}
