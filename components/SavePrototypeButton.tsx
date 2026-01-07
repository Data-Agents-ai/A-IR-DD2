/**
 * @file SavePrototypeButton.tsx
 * @description Bouton de sauvegarde manuelle du workflow
 * @domain Design Domain - Persistence UI
 * 
 * ⭐ ÉTAPE 2 PLAN_DE_PERSISTENCE: Save Mode MANUEL
 * 
 * DESIGN SPEC (BLUR GAME STYLE):
 * - Bouton ROND rouge
 * - Contour LASER BLEU (comme la MiniMap et la barre de zoom)
 * - PAS d'icône de disquette
 * - Position: à GAUCHE de la MiniMap, au-dessus des contrôles de zoom
 * - Hotkey: Ctrl+S
 * 
 * VISIBILITY RULES:
 * - Uniquement si isAuthenticated === true
 * - Uniquement si saveMode === 'manual'
 * 
 * STATES:
 * - idle: Bouton rouge avec contour bleu laser
 * - saving: Animation pulse pendant sauvegarde
 * - success: Flash vert pendant 1.5s
 * - error: Flash rouge vif pendant 2.5s
 * 
 * SOLID PRINCIPLES:
 * - S: Single responsibility (trigger save only)
 * - O: Open for extension (callbacks, styling)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDesignStore } from '../stores/useDesignStore';
import { PersistenceService } from '../services/persistenceService';
import { useSaveMode } from '../hooks/useSaveMode';

interface SavePrototypeButtonProps {
    /** Current workflow ID */
    workflowId: string;
    /** Current canvas state */
    canvasState?: {
        zoom: number;
        panX: number;
        panY: number;
    };
    /** Workflow name (optional) */
    workflowName?: string;
    /** Callback on save complete */
    onSaveComplete?: (success: boolean) => void;
    /** Custom className */
    className?: string;
}

type ButtonState = 'idle' | 'saving' | 'success' | 'error';

export const SavePrototypeButton: React.FC<SavePrototypeButtonProps> = ({
    workflowId,
    canvasState,
    workflowName,
    onSaveComplete,
    className = ''
}) => {
    const [buttonState, setButtonState] = useState<ButtonState>('idle');
    const { isAuthenticated, accessToken } = useAuth();
    const { nodes, edges } = useDesignStore();
    const { isManualSave } = useSaveMode();

    // ⚠️ VISIBILITY GATE: Only render for authenticated users with manual save mode
    const shouldRender = isAuthenticated && isManualSave;

    /**
     * Handle save action
     */
    const handleSave = useCallback(async () => {
        if (buttonState === 'saving' || !shouldRender) return;

        setButtonState('saving');

        try {
            const result = await PersistenceService.saveWorkflow(
                {
                    id: workflowId,
                    name: workflowName,
                    canvasState,
                    nodes: nodes.map(n => ({
                        id: n.id,
                        type: n.type,
                        position: n.position,
                        data: n.data as Record<string, any>
                    })),
                    edges: edges.map(e => ({
                        id: e.id,
                        source: e.source,
                        target: e.target,
                        type: e.type
                    }))
                },
                {
                    isAuthenticated,
                    accessToken: accessToken || undefined
                }
            );

            if (result.success) {
                setButtonState('success');
                setTimeout(() => setButtonState('idle'), 1500);
                onSaveComplete?.(true);
            } else {
                console.error('[SavePrototypeButton] Save failed:', result.error);
                setButtonState('error');
                setTimeout(() => setButtonState('idle'), 2500);
                onSaveComplete?.(false);
            }
        } catch (err) {
            console.error('[SavePrototypeButton] Save error:', err);
            setButtonState('error');
            setTimeout(() => setButtonState('idle'), 2500);
            onSaveComplete?.(false);
        }
    }, [
        workflowId,
        workflowName,
        canvasState,
        nodes,
        edges,
        isAuthenticated,
        accessToken,
        buttonState,
        shouldRender,
        onSaveComplete
    ]);

    /**
     * Keyboard shortcut: Ctrl+S (only when shouldRender)
     */
    useEffect(() => {
        if (!shouldRender) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave, shouldRender]);

    // Don't render if conditions not met
    if (!shouldRender) return null;

    /**
     * Get button content based on state
     */
    const getContent = (): string => {
        switch (buttonState) {
            case 'saving':
                return '...';
            case 'success':
                return '✓';
            case 'error':
                return '✗';
            default:
                return 'S'; // S for Save - no floppy icon
        }
    };

    return (
        <>
            {/* CSS Animation keyframes - Blur Game Style avec couleur CYAN (#00ffff) */}
            <style>{`
                @keyframes save-button-pulse {
                    0%, 100% {
                        box-shadow: 
                            0 0 8px rgba(0, 255, 255, 0.6),
                            0 0 20px rgba(0, 255, 255, 0.3),
                            inset 0 0 0 2px rgba(0, 255, 255, 0.8);
                    }
                    50% {
                        box-shadow: 
                            0 0 15px rgba(0, 255, 255, 0.9),
                            0 0 35px rgba(0, 255, 255, 0.5),
                            inset 0 0 0 2px rgba(0, 255, 255, 1);
                    }
                }
                
                @keyframes save-button-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .save-round-button {
                    /* Base: Round shape */
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    border: 2px solid #00ffff; /* Contour CYAN comme la minimap */
                    cursor: pointer;
                    font-family: 'Orbitron', 'Rajdhani', monospace;
                    font-weight: 700;
                    font-size: 16px;
                    text-transform: uppercase;
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                    
                    /* BLUR GAME STYLE: Red center + CYAN laser contour */
                    background: linear-gradient(145deg, #dc2626, #991b1b);
                    color: white;
                    box-shadow: 
                        0 0 8px rgba(0, 255, 255, 0.6),
                        0 0 20px rgba(0, 255, 255, 0.3),
                        inset 0 2px 0 rgba(255, 255, 255, 0.15),
                        0 4px 12px rgba(0, 0, 0, 0.4);
                }
                
                .save-round-button:hover:not(:disabled) {
                    transform: scale(1.08);
                    background: linear-gradient(145deg, #ef4444, #b91c1c);
                    border-color: #00ffff;
                    box-shadow: 
                        0 0 15px rgba(0, 255, 255, 0.9),
                        0 0 35px rgba(0, 255, 255, 0.5),
                        inset 0 2px 0 rgba(255, 255, 255, 0.2),
                        0 6px 16px rgba(0, 0, 0, 0.5);
                }
                
                .save-round-button:active:not(:disabled) {
                    transform: scale(0.95);
                }
                
                .save-round-button:disabled {
                    cursor: wait;
                }
                
                /* STATE: Saving */
                .save-round-button.saving {
                    animation: save-button-pulse 0.8s infinite ease-in-out;
                    background: linear-gradient(145deg, #facc15, #ca8a04);
                    color: #1a1a1a;
                }
                
                /* STATE: Success */
                .save-round-button.success {
                    background: linear-gradient(145deg, #22c55e, #16a34a);
                    border-color: #22c55e;
                    box-shadow: 
                        0 0 15px rgba(34, 197, 94, 0.8),
                        0 0 35px rgba(34, 197, 94, 0.4),
                        0 4px 12px rgba(0, 0, 0, 0.4);
                }
                
                /* STATE: Error */
                .save-round-button.error {
                    background: linear-gradient(145deg, #ef4444, #dc2626);
                    border-color: #ef4444;
                    box-shadow: 
                        0 0 15px rgba(239, 68, 68, 0.8),
                        0 0 35px rgba(239, 68, 68, 0.4),
                        0 4px 12px rgba(0, 0, 0, 0.4);
                    animation: shake 0.3s ease;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-3px); }
                    75% { transform: translateX(3px); }
                }
            `}</style>
            
            <button
                className={`save-round-button ${buttonState} ${className}`}
                onClick={handleSave}
                disabled={buttonState === 'saving'}
                title="Sauvegarder le workflow (Ctrl+S)"
                aria-label="Save prototype workflow"
            >
                {getContent()}
            </button>
        </>
    );
};

export default SavePrototypeButton;
