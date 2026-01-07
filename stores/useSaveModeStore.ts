/**
 * @file useSaveModeStore.ts
 * @description Store Zustand pour le mode de sauvegarde (auto/manuel)
 * @domain Design Domain - Persistence Preferences
 * 
 * ⭐ ÉTAPE 2 PLAN_DE_PERSISTENCE: Save Mode Global State
 * 
 * ARCHITECTURE:
 * - État GLOBAL partagé entre tous les composants
 * - Synchronisé avec localStorage (guest) ou API (auth)
 * - Default: 'manual' (sauvegarde manuelle)
 * 
 * POURQUOI ZUSTAND:
 * - Le hook useState dans useSaveMode créait des instances séparées
 * - Le SettingsModal et SavePrototypeButton avaient des états indépendants
 * - Zustand garantit un état unique et réactif
 */

import { create } from 'zustand';

export type SaveMode = 'auto' | 'manual';

const GUEST_SAVE_MODE_KEY = 'guest_save_mode';
const DEFAULT_SAVE_MODE: SaveMode = 'manual';

interface SaveModeState {
    saveMode: SaveMode;
    isLoading: boolean;
    isInitialized: boolean;
    
    // Actions
    setSaveMode: (mode: SaveMode) => void;
    setLoading: (loading: boolean) => void;
    initialize: (mode: SaveMode) => void;
    
    // Computed (as methods for convenience)
    isManualSave: () => boolean;
    isAutoSave: () => boolean;
}

export const useSaveModeStore = create<SaveModeState>((set, get) => ({
    saveMode: DEFAULT_SAVE_MODE,
    isLoading: false,
    isInitialized: false,
    
    setSaveMode: (mode: SaveMode) => {
        set({ saveMode: mode });
        console.log('[useSaveModeStore] Mode updated:', mode);
    },
    
    setLoading: (loading: boolean) => {
        set({ isLoading: loading });
    },
    
    initialize: (mode: SaveMode) => {
        set({ saveMode: mode, isInitialized: true });
        console.log('[useSaveModeStore] Initialized with:', mode);
    },
    
    isManualSave: () => get().saveMode === 'manual',
    isAutoSave: () => get().saveMode === 'auto'
}));

/**
 * Helper pour charger le saveMode depuis localStorage (mode invité)
 */
export function loadGuestSaveMode(): SaveMode {
    const stored = localStorage.getItem(GUEST_SAVE_MODE_KEY);
    return (stored === 'auto' || stored === 'manual') ? stored : DEFAULT_SAVE_MODE;
}

/**
 * Helper pour sauvegarder le saveMode dans localStorage (mode invité)
 */
export function saveGuestSaveMode(mode: SaveMode): void {
    localStorage.setItem(GUEST_SAVE_MODE_KEY, mode);
}

export default useSaveModeStore;
