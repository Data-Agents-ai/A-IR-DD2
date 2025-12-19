// hooks/useLMStudioDetection.ts
// Jalon 3: Hook personnalisé pour détection LMStudio avec auto-refresh

import { useState, useEffect } from 'react';
import { LMStudioModelDetection, LLMCapability } from '../types';
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
            
            if (!result || !result.healthy) {
                setError(result?.error || 'Endpoint non accessible');
                setDetection(null);
                onError?.(result?.error || 'Endpoint non accessible');
                return;
            }

            // Convertir DetectionResult en LMStudioModelDetection
            // result.capabilities est string[], on doit le convertir en LLMCapability[]
            const detectionCapabilities: LLMCapability[] = (result.capabilities as string[])
              .filter(cap => cap)
              .map(cap => {
                // Chercher la valeur d'enum correspondante
                const enumValue = Object.values(LLMCapability).find(v => v === cap);
                return enumValue as LLMCapability;
              })
              .filter((cap): cap is LLMCapability => cap !== undefined);

            const detection: LMStudioModelDetection = {
                modelId: result.modelId || 'unknown',
                routes: {
                  models: true,
                  chatCompletions: true,
                  completions: false,
                  embeddings: false,
                  images: false,
                  audio: false
                },
                capabilities: detectionCapabilities,
                detectedAt: result.detectedAt
            };

            setDetection(detection);
            onSuccess?.(detection);
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
