// hooks/useLMStudioDetection.ts
// Jalon 3: Hook personnalisé pour détection LMStudio avec auto-refresh

import { useState, useEffect } from 'react';
import { LMStudioModelDetection } from '../types';
import { detectLMStudioModel } from '../services/routeDetectionService';

interface UseLMStudioDetectionOptions {
    endpoint?: string;
    autoDetect?: boolean; // Lancer détection automatiquement au mount
    onSuccess?: (detection: LMStudioModelDetection) => void;
    onError?: (error: string) => void;
}

interface UseLMStudioDetectionReturn {
    detection: LMStudioModelDetection | null;
    isDetecting: boolean;
    error: string | null;
    redetect: () => Promise<void>;
    clearDetection: () => void;
}

/**
 * Hook personnalisé pour gérer la détection dynamique LMStudio
 * Auto-détecte quand l'endpoint change (si autoDetect=true)
 */
export const useLMStudioDetection = (
    options: UseLMStudioDetectionOptions = {}
): UseLMStudioDetectionReturn => {
    const { endpoint, autoDetect = true, onSuccess, onError } = options;

    const [detection, setDetection] = useState<LMStudioModelDetection | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fonction de détection réutilisable
    const performDetection = async () => {
        if (!endpoint) {
            setError('Endpoint LMStudio non configuré');
            onError?.('Endpoint LMStudio non configuré');
            return;
        }

        setIsDetecting(true);
        setError(null);

        try {
            const result = await detectLMStudioModel(endpoint);
            setDetection(result);
            onSuccess?.(result);
        } catch (err: any) {
            const errorMessage = err.message || 'Erreur lors de la détection LMStudio';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setIsDetecting(false);
        }
    };

    // Auto-détection quand endpoint change (si autoDetect activé)
    useEffect(() => {
        if (autoDetect && endpoint) {
            performDetection();
        }
    }, [endpoint, autoDetect]);

    // Fonction manuelle de re-détection
    const redetect = async () => {
        await performDetection();
    };

    // Clear detection (utile pour reset)
    const clearDetection = () => {
        setDetection(null);
        setError(null);
    };

    return {
        detection,
        isDetecting,
        error,
        redetect,
        clearDetection
    };
};
