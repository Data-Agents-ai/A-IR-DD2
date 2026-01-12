/**
 * @fileoverview Tests unitaires - JournalService (Jalon 5)
 * 
 * Teste la logique conditionnelle de journalisation basée sur PersistenceConfig
 * 
 * @see backend/src/services/journal.service.ts
 */

import mongoose from 'mongoose';
import { JournalService } from '../services/journal.service';
import { AgentInstanceV2 } from '../models/AgentInstanceV2.model';
import { AgentJournal } from '../models/AgentJournal.model';
import { User } from '../models/User.model';
import { Workflow } from '../models/Workflow.model';
import { DEFAULT_PERSISTENCE_CONFIG } from '../types/persistence';

describe('JournalService - Logique conditionnelle', () => {
    let journalService: JournalService;
    let testUser: any;
    let testWorkflow: any;
    let testInstance: any;

    beforeAll(async () => {
        journalService = new JournalService();

        // Créer utilisateur test
        testUser = await User.create({
            email: `journal-test-${Date.now()}@test.com`,
            password: 'hashedpassword12345',
            username: `journaltest${Date.now()}`
        });

        // Créer workflow test
        testWorkflow = await Workflow.create({
            name: 'Journal Test Workflow',
            ownerId: testUser._id,
            nodes: [],
            edges: []
        });
    });

    afterAll(async () => {
        await User.deleteMany({ _id: testUser._id });
        await Workflow.deleteMany({ _id: testWorkflow._id });
    });

    beforeEach(async () => {
        // Nettoyer les instances et journaux avant chaque test
        await AgentInstanceV2.deleteMany({});
        await AgentJournal.deleteMany({});
    });

    // ============================================
    // CAS 1: saveChatHistory = false
    // ============================================

    describe('Cas 1: saveChatHistory = false', () => {
        beforeEach(async () => {
            // Créer une instance avec saveChatHistory désactivé
            testInstance = await AgentInstanceV2.create({
                workflowId: testWorkflow._id,
                userId: testUser._id,
                name: 'Agent Test NoChat',
                role: 'Test agent',
                robotId: 'AR_001',
                configuration: {
                    llmProvider: 'openai',
                    llmModel: 'gpt-4'
                },
                persistenceConfig: {
                    ...DEFAULT_PERSISTENCE_CONFIG,
                    saveChatHistory: false // DÉSACTIVÉ
                },
                state: {},
                status: 'idle'
            });
        });

        it('logChat() ne doit RIEN écrire en BDD si saveChatHistory=false', async () => {
            // Appeler logChat
            const result = await journalService.logChat({
                instanceId: testInstance._id.toString(),
                role: 'user',
                content: 'Message qui ne devrait pas être sauvegardé'
            });

            // Vérifier le résultat
            expect(result.success).toBe(true);
            expect(result.saved).toBe(false);
            expect(result.reason).toContain('disabled');

            // Vérifier qu'AUCUN journal n'a été créé
            const journalCount = await AgentJournal.countDocuments({
                agentInstanceId: testInstance._id
            });
            expect(journalCount).toBe(0);
        });

        it('logChat() avec plusieurs messages ne doit rien sauvegarder', async () => {
            // Simuler plusieurs messages
            await journalService.logChat({
                instanceId: testInstance._id.toString(),
                role: 'user',
                content: 'Message 1'
            });
            await journalService.logChat({
                instanceId: testInstance._id.toString(),
                role: 'assistant',
                content: 'Réponse 1'
            });
            await journalService.logChat({
                instanceId: testInstance._id.toString(),
                role: 'user',
                content: 'Message 2'
            });

            // Vérifier qu'AUCUN journal n'a été créé
            const journalCount = await AgentJournal.countDocuments({
                agentInstanceId: testInstance._id
            });
            expect(journalCount).toBe(0);
        });
    });

    // ============================================
    // CAS 2: saveChatHistory = true
    // ============================================

    describe('Cas 2: saveChatHistory = true', () => {
        beforeEach(async () => {
            // Créer une instance avec saveChatHistory activé
            testInstance = await AgentInstanceV2.create({
                workflowId: testWorkflow._id,
                userId: testUser._id,
                name: 'Agent Test WithChat',
                role: 'Test agent',
                robotId: 'AR_001',
                configuration: {
                    llmProvider: 'openai',
                    llmModel: 'gpt-4'
                },
                persistenceConfig: {
                    ...DEFAULT_PERSISTENCE_CONFIG,
                    saveChatHistory: true // ACTIVÉ
                },
                state: {},
                status: 'idle'
            });
        });

        it('logChat() DOIT créer une entrée journal si saveChatHistory=true', async () => {
            const result = await journalService.logChat({
                instanceId: testInstance._id.toString(),
                role: 'user',
                content: 'Bonjour, ceci est un test'
            });

            // Vérifier le résultat
            expect(result.success).toBe(true);
            expect(result.saved).toBe(true);
            expect(result.entryId).toBeDefined();

            // Vérifier l'entrée en BDD
            const journal = await AgentJournal.findById(result.entryId);
            expect(journal).not.toBeNull();
            expect(journal?.type).toBe('chat');
            expect(journal?.payload).toHaveProperty('type', 'chat');
        });

        it('logChat() doit sauvegarder le contenu correctement', async () => {
            const testContent = 'Message de test avec contenu spécifique';
            
            const result = await journalService.logChat({
                instanceId: testInstance._id.toString(),
                role: 'assistant',
                content: testContent,
                model: 'gpt-4',
                tokensUsed: 150
            });

            const journal = await AgentJournal.findById(result.entryId);
            expect(journal?.payload).toMatchObject({
                type: 'chat',
                data: expect.objectContaining({
                    role: 'agent', // 'assistant' est mappé vers 'agent'
                    content: testContent,
                    modelUsed: 'gpt-4',
                    tokensUsed: 150
                })
            });
        });
    });

    // ============================================
    // CAS 3: saveErrors = false/true
    // ============================================

    describe('Cas 3: saveErrors configuration', () => {
        it('logError() ne doit rien sauvegarder si saveErrors=false', async () => {
            testInstance = await AgentInstanceV2.create({
                workflowId: testWorkflow._id,
                userId: testUser._id,
                name: 'Agent Test NoErrors',
                role: 'Test agent',
                robotId: 'AR_001',
                configuration: { llmProvider: 'openai', llmModel: 'gpt-4' },
                persistenceConfig: {
                    ...DEFAULT_PERSISTENCE_CONFIG,
                    saveErrors: false // DÉSACTIVÉ
                },
                state: {},
                status: 'idle'
            });

            const result = await journalService.logError({
                instanceId: testInstance._id.toString(),
                code: 'TEST_ERROR',
                message: 'Erreur de test',
                recoverable: true
            });

            expect(result.success).toBe(true);
            expect(result.saved).toBe(false);

            const journalCount = await AgentJournal.countDocuments({
                agentInstanceId: testInstance._id
            });
            expect(journalCount).toBe(0);
        });

        it('logError() DOIT sauvegarder si saveErrors=true', async () => {
            testInstance = await AgentInstanceV2.create({
                workflowId: testWorkflow._id,
                userId: testUser._id,
                name: 'Agent Test WithErrors',
                role: 'Test agent',
                robotId: 'AR_001',
                configuration: { llmProvider: 'openai', llmModel: 'gpt-4' },
                persistenceConfig: {
                    ...DEFAULT_PERSISTENCE_CONFIG,
                    saveErrors: true // ACTIVÉ
                },
                state: {},
                status: 'idle'
            });

            const result = await journalService.logError({
                instanceId: testInstance._id.toString(),
                code: 'LLM_TIMEOUT',
                message: 'Le modèle LLM n\'a pas répondu à temps',
                stack: 'Error: Timeout\n    at llmService.ts:123',
                recoverable: true
            });

            expect(result.success).toBe(true);
            expect(result.saved).toBe(true);

            const journal = await AgentJournal.findById(result.entryId);
            expect(journal?.type).toBe('error');
            expect(journal?.severity).toBe('error');
        });
    });

    // ============================================
    // CAS 4: Événements système (toujours sauvegardés)
    // ============================================

    describe('Cas 4: Événements système', () => {
        beforeEach(async () => {
            testInstance = await AgentInstanceV2.create({
                workflowId: testWorkflow._id,
                userId: testUser._id,
                name: 'Agent Test System',
                role: 'Test agent',
                robotId: 'AR_001',
                configuration: { llmProvider: 'openai', llmModel: 'gpt-4' },
                persistenceConfig: {
                    // Tout désactivé SAUF système (implicite)
                    saveChatHistory: false,
                    saveErrors: false,
                    saveTaskExecution: false,
                    saveMedia: false,
                    mediaStorageMode: 'local',
                    summarizeHistory: false
                },
                state: {},
                status: 'idle'
            });
        });

        it('logSystem() DOIT toujours sauvegarder même si tout est désactivé', async () => {
            const result = await journalService.logSystem(
                testInstance._id.toString(),
                'instance_started',
                { reason: 'Test de démarrage' }
            );

            expect(result.success).toBe(true);
            expect(result.saved).toBe(true);
            expect(result.entryId).toBeDefined();

            const journal = await AgentJournal.findById(result.entryId);
            expect(journal?.type).toBe('system');
        });
    });

    // ============================================
    // CAS 5: Instance inexistante
    // ============================================

    describe('Cas 5: Instance inexistante', () => {
        it('logChat() doit retourner une erreur pour une instance invalide', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();

            const result = await journalService.logChat({
                instanceId: fakeId,
                role: 'user',
                content: 'Message vers instance inexistante'
            });

            expect(result.success).toBe(false);
            expect(result.saved).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('logChat() doit gérer les IDs malformés', async () => {
            const result = await journalService.logChat({
                instanceId: 'invalid-id-format',
                role: 'user',
                content: 'Test'
            });

            expect(result.success).toBe(false);
            expect(result.saved).toBe(false);
        });
    });

    // ============================================
    // CAS 6: Mise à jour de l'état après interaction
    // ============================================

    describe('Cas 6: Mise à jour état instance', () => {
        beforeEach(async () => {
            testInstance = await AgentInstanceV2.create({
                workflowId: testWorkflow._id,
                userId: testUser._id,
                name: 'Agent Test State',
                role: 'Test agent',
                robotId: 'AR_001',
                configuration: { llmProvider: 'openai', llmModel: 'gpt-4' },
                persistenceConfig: {
                    ...DEFAULT_PERSISTENCE_CONFIG,
                    saveChatHistory: true
                },
                state: { lastActivity: new Date('2020-01-01') },
                status: 'idle'
            });
        });

        it('logChat() doit mettre à jour state.lastActivity', async () => {
            const beforeLog = new Date();

            await journalService.logChat({
                instanceId: testInstance._id.toString(),
                role: 'user',
                content: 'Test mise à jour état'
            });

            // Attendre un peu pour que l'update async se propage
            await new Promise(resolve => setTimeout(resolve, 100));

            const updatedInstance = await AgentInstanceV2.findById(testInstance._id);
            expect(updatedInstance?.state?.lastActivity).toBeDefined();
            expect(new Date(updatedInstance!.state!.lastActivity!).getTime()).toBeGreaterThanOrEqual(beforeLog.getTime());
        });

        it('updateInstanceStatus() doit changer le statut correctement', async () => {
            const success = await journalService.updateInstanceStatus(
                testInstance._id.toString(),
                'running'
            );

            expect(success).toBe(true);

            const updatedInstance = await AgentInstanceV2.findById(testInstance._id);
            expect(updatedInstance?.status).toBe('running');
        });
    });
});
