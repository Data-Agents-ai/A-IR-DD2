/**
 * @file J4.4-SecurityWipe.TNR.test.tsx
 * @description Test de Non-Régression - Isolation complète Guest ↔ Auth
 * @domain Security - Data Isolation
 * 
 * ⚠️ TEST CRITIQUE DE SÉCURITÉ
 * 
 * SCÉNARIOS:
 * 1. Guest → Auth: Vérifier que données guest ne fuient pas dans session auth
 * 2. Auth → Guest: Vérifier que données auth ne fuient pas dans session guest
 * 
 * RÉGRESSIONS BLOQUÉES:
 * - Agent guest visible après login (CRITIQUE)
 * - LLM config guest héritée par user auth (CRITIQUE)
 * - Agent auth visible après logout (CRITIQUE)
 * - Contamination croisée localStorage + stores
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wipeGuestData, checkGuestDataExists, GUEST_STORAGE_KEYS } from '../utils/guestDataUtils';
import { useDesignStore } from '../stores/useDesignStore';
import { useWorkflowStore } from '../stores/useWorkflowStore';
import { useRuntimeStore } from '../stores/useRuntimeStore';

describe('J4.4 TNR - Security: Complete Guest Data Wipe', () => {
    beforeEach(() => {
        // Reset localStorage
        localStorage.clear();
        
        // Reset all stores
        useDesignStore.getState().resetAll();
        useWorkflowStore.getState().resetAll();
        useRuntimeStore.getState().resetAll();
    });

    describe('localStorage Wipe', () => {
        it('should clear all guest localStorage keys', () => {
            // ARRANGE: Créer données guest dans localStorage
            localStorage.setItem(GUEST_STORAGE_KEYS.workflow, JSON.stringify({ id: 'guest-wf-1', name: 'Guest Workflow' }));
            localStorage.setItem(GUEST_STORAGE_KEYS.llmConfigs, JSON.stringify({ Mistral: { apiKey: 'guest-key-123' } }));
            localStorage.setItem(GUEST_STORAGE_KEYS.agentInstances, JSON.stringify([{ id: 'agent-1', name: 'Guest Agent' }]));
            
            // Vérifier données présentes
            const checkBefore = checkGuestDataExists();
            expect(checkBefore.totalKeys).toBeGreaterThan(0);
            
            // ACT: Wipe
            const result = wipeGuestData();
            
            // ASSERT: Toutes les clés doivent être supprimées
            expect(result.success).toBe(true);
            expect(result.keysCleared.length).toBeGreaterThan(0);
            
            const checkAfter = checkGuestDataExists();
            expect(checkAfter.totalKeys).toBe(0);
            expect(checkAfter.hasWorkflow).toBe(false);
            expect(checkAfter.hasLLMConfigs).toBe(false);
        });

        it('should not affect auth localStorage keys', () => {
            // ARRANGE: Créer données auth + guest
            const authData = { user: { id: '123', email: 'test@example.com' }, accessToken: 'token-abc' };
            localStorage.setItem('auth_data_v1', JSON.stringify(authData));
            localStorage.setItem(GUEST_STORAGE_KEYS.workflow, JSON.stringify({ id: 'guest-wf' }));
            
            // ACT: Wipe
            wipeGuestData();
            
            // ASSERT: Données auth préservées
            const authDataAfter = localStorage.getItem('auth_data_v1');
            expect(authDataAfter).toBeTruthy();
            expect(JSON.parse(authDataAfter!)).toEqual(authData);
        });
    });

    describe('Zustand Stores Wipe', () => {
        it('should reset useDesignStore (agents, instances, nodes, edges)', () => {
            // ARRANGE: Créer données dans le store
            const designStore = useDesignStore.getState();
            
            designStore.addAgent({
                name: 'Guest Agent',
                description: 'Created in guest mode',
                type: 'agent',
                systemPrompt: 'Test prompt',
                tools: [],
                enabled: true
            });
            
            designStore.addNode({
                type: 'agent',
                position: { x: 100, y: 100 },
                data: { agentId: 'agent-1', label: 'Guest Node' }
            });
            
            // Vérifier données présentes
            expect(designStore.agents.length).toBeGreaterThan(0);
            expect(designStore.nodes.length).toBeGreaterThan(0);
            
            // ACT: Wipe
            const result = wipeGuestData();
            
            // ASSERT: Store complètement vide
            const designStoreAfter = useDesignStore.getState();
            expect(result.storesReset).toContain('useDesignStore');
            expect(designStoreAfter.agents).toEqual([]);
            expect(designStoreAfter.nodes).toEqual([]);
            expect(designStoreAfter.edges).toEqual([]);
            expect(designStoreAfter.agentInstances).toEqual([]);
        });

        it('should reset useWorkflowStore (workflows, execution)', () => {
            // ARRANGE: Créer workflow
            const workflowStore = useWorkflowStore.getState();
            workflowStore.createWorkflow('Guest Workflow', 'AR_001');
            
            // Vérifier workflow créé
            expect(workflowStore.workflows.length).toBe(1);
            expect(workflowStore.currentWorkflow).toBeTruthy();
            
            // ACT: Wipe
            const result = wipeGuestData();
            
            // ASSERT: Store vide
            const workflowStoreAfter = useWorkflowStore.getState();
            expect(result.storesReset).toContain('useWorkflowStore');
            expect(workflowStoreAfter.workflows).toEqual([]);
            expect(workflowStoreAfter.currentWorkflow).toBeNull();
            expect(workflowStoreAfter.execution).toBeNull();
        });

        it('should reset useRuntimeStore (chat sessions)', () => {
            // ARRANGE: Créer session runtime
            const runtimeStore = useRuntimeStore.getState();
            runtimeStore.createChatSession('agent-1');
            
            // Vérifier session créée
            expect(Object.keys(runtimeStore.chatSessions).length).toBeGreaterThan(0);
            
            // ACT: Wipe
            const result = wipeGuestData();
            
            // ASSERT: Store vide
            const runtimeStoreAfter = useRuntimeStore.getState();
            expect(result.storesReset).toContain('useRuntimeStore');
            expect(Object.keys(runtimeStoreAfter.chatSessions)).toEqual([]);
        });
    });

    describe('Complete Integration Wipe', () => {
        it('CRITICAL: should wipe ALL guest data (localStorage + all stores)', () => {
            // ARRANGE: Simuler session guest complète
            
            // 1. localStorage
            localStorage.setItem(GUEST_STORAGE_KEYS.workflow, JSON.stringify({ id: 'wf-1' }));
            localStorage.setItem(GUEST_STORAGE_KEYS.llmConfigs, JSON.stringify({ Mistral: { apiKey: 'key' } }));
            
            // 2. Design Store
            const designStore = useDesignStore.getState();
            designStore.addAgent({
                name: 'Guest Agent Critical',
                description: 'MUST be wiped on login',
                type: 'agent',
                systemPrompt: 'Test',
                tools: [],
                enabled: true
            });
            
            // 3. Workflow Store
            const workflowStore = useWorkflowStore.getState();
            workflowStore.createWorkflow('Guest Workflow Critical', 'AR_001');
            
            // 4. Runtime Store
            const runtimeStore = useRuntimeStore.getState();
            runtimeStore.createChatSession('agent-critical-1');
            
            // Vérifier état initial (données présentes)
            expect(checkGuestDataExists().totalKeys).toBeGreaterThan(0);
            expect(useDesignStore.getState().agents.length).toBeGreaterThan(0);
            expect(useWorkflowStore.getState().workflows.length).toBeGreaterThan(0);
            expect(Object.keys(useRuntimeStore.getState().chatSessions).length).toBeGreaterThan(0);
            
            // ACT: WIPE COMPLET
            const result = wipeGuestData();
            
            // ASSERT: TOUT doit être vide (SÉCURITÉ CRITIQUE)
            expect(result.success).toBe(true);
            expect(result.keysCleared.length).toBeGreaterThan(0);
            expect(result.storesReset.length).toBe(3); // 3 stores
            
            // localStorage vide
            expect(checkGuestDataExists().totalKeys).toBe(0);
            
            // Stores vides
            expect(useDesignStore.getState().agents).toEqual([]);
            expect(useDesignStore.getState().nodes).toEqual([]);
            expect(useWorkflowStore.getState().workflows).toEqual([]);
            expect(useWorkflowStore.getState().currentWorkflow).toBeNull();
            expect(Object.keys(useRuntimeStore.getState().chatSessions)).toEqual([]);
            
            console.log('✅ SECURITY PASSED: Complete guest data wipe successful');
        });
    });

    describe('Error Handling', () => {
        it('should handle localStorage errors gracefully', () => {
            // ARRANGE: Mock localStorage.removeItem pour simuler erreur
            const originalRemoveItem = localStorage.removeItem;
            localStorage.removeItem = vi.fn(() => {
                throw new Error('localStorage quota exceeded');
            });
            
            // ACT: Wipe (ne doit pas crasher)
            const result = wipeGuestData();
            
            // ASSERT: Erreurs capturées, success = false
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Cleanup
            localStorage.removeItem = originalRemoveItem;
        });

        it('should continue wiping stores even if localStorage fails', () => {
            // ARRANGE: localStorage va échouer, mais stores doivent quand même être wipés
            localStorage.removeItem = vi.fn(() => {
                throw new Error('Test error');
            });
            
            const designStore = useDesignStore.getState();
            designStore.addAgent({
                name: 'Test Agent',
                description: 'Test',
                type: 'agent',
                systemPrompt: 'Test',
                tools: [],
                enabled: true
            });
            
            // ACT
            const result = wipeGuestData();
            
            // ASSERT: Stores wipés malgré erreur localStorage
            expect(result.storesReset.length).toBe(3);
            expect(useDesignStore.getState().agents).toEqual([]);
        });
    });
});
