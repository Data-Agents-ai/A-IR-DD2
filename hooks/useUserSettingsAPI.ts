/**
 * @file hooks/useUserSettingsAPI.ts
 * @description User Settings API hook for authenticated users
 * @domain Design Domain - Settings Management / Persistence
 *
 * PURPOSE: Fetch and save user settings from/to API endpoint
 * REQUIRES: User must be authenticated (JWT token)
 * 
 * USAGE in Auth mode:
 *   const { settings, isLoading, error, saveSettings } = useUserSettingsAPI();
 * 
 * USAGE in Guest mode:
 *   Don't use this hook - use localStorage directly instead
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { LLMConfig } from '../types';

interface UserSettings {
  llmConfigs: Record<string, any>;
  preferences: {
    language: string;
    theme: string;
  };
  updatedAt: string;
}

interface UseUserSettingsAPIResult {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  saveSettings: (llmConfigs: LLMConfig[], preferences?: any) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useUserSettingsAPI = (): UseUserSettingsAPIResult => {
  const { isAuthenticated, accessToken } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user settings from API
   */
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('[useUserSettingsAPI] User not authenticated - skipping API fetch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user-settings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setSettings(data);
      console.log('[useUserSettingsAPI] Settings fetched successfully:', data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(errorMessage);
      console.error('[useUserSettingsAPI] Fetch error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  /**
   * Save settings to API (convert LLMConfig[] to API format)
   */
  const saveSettings = useCallback(
    async (llmConfigs: LLMConfig[], preferences?: any) => {
      if (!isAuthenticated) {
        throw new Error('User must be authenticated to save settings to API');
      }

      setIsLoading(true);
      setError(null);

      try {
        // Convert LLMConfig[] array to record format expected by API
        const llmConfigsRecord: Record<string, any> = {};
        llmConfigs.forEach(config => {
          llmConfigsRecord[config.provider] = {
            enabled: config.enabled,
            apiKey: config.apiKey || undefined,
            capabilities: config.capabilities
          };
        });

        const response = await fetch('/api/user-settings', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            llmConfigs: llmConfigsRecord,
            preferences: preferences || {}
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setSettings(data);
        console.log('[useUserSettingsAPI] Settings saved successfully:', data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
        setError(errorMessage);
        console.error('[useUserSettingsAPI] Save error:', errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, accessToken]
  );

  /**
   * Refresh settings from API
   */
  const refresh = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  /**
   * Auto-fetch settings when user authenticates
   */
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchSettings();
    }
  }, [isAuthenticated, accessToken, fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    saveSettings,
    refresh
  };
};
