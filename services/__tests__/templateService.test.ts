/**
 * Tests Unitaires pour TemplateService
 * 
 * Objectif : Valider que l'ajout de prototypes aux templates
 * crée des copies indépendantes sans affecter les originaux
 */

import {
    addPrototypeToTemplates,
    deleteCustomTemplate,
    updateCustomTemplate,
    loadCustomTemplates,
    getAllTemplates,
    CustomTemplate
} from '../templateService';
import { Agent, LLMProvider, LLMCapability, RobotId, Tool } from '../../types';
import { AGENT_TEMPLATES } from '../../data/agentTemplates';

describe('TemplateService', () => {
    // Mock localStorage
    let localStorageMock: { [key: string]: string } = {};

    beforeEach(() => {
        // Reset localStorage mock avant chaque test
        localStorageMock = {};

        global.localStorage = {
            getItem: jest.fn((key: string) => localStorageMock[key] || null),
            setItem: jest.fn((key: string, value: string) => {
                localStorageMock[key] = value;
            }),
            removeItem: jest.fn((key: string) => {
                delete localStorageMock[key];
            }),
            clear: jest.fn(() => {
                localStorageMock = {};
            }),
            length: 0,
            key: jest.fn()
        } as any;
    });

    describe('addPrototypeToTemplates()', () => {
        it('doit créer une COPIE INDÉPENDANTE du prototype, pas une référence', () => {
            // Créer un prototype avec des objets imbriqués
            const originalTool: Tool = {
                name: 'test_tool',
                description: 'Tool de test',
                parameters: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string', description: 'Param 1' }
                    },
                    required: ['param1']
                }
            };

            const originalPrototype: Agent = {
                id: 'proto-123',
                name: 'Test Prototype',
                role: 'Test Role',
                systemPrompt: 'Test system prompt',
                llmProvider: LLMProvider.Gemini,
                model: 'gemini-2.0-flash-exp',
                capabilities: [LLMCapability.Chat, LLMCapability.FunctionCalling],
                tools: [originalTool],
                outputConfig: {
                    format: 'text' as const,
                    temperature: 0.7
                },
                historyConfig: {
                    enabled: false
                },
                creator_id: RobotId.Archi,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Ajouter le prototype aux templates
            const template = addPrototypeToTemplates(originalPrototype);

            expect(template).not.toBeNull();
            expect(template?.isCustom).toBe(true);
            expect(template?.sourcePrototypeId).toBe('proto-123');

            // ASSERTIONS CRITIQUES : Indépendance totale

            // 1. Modifier le prototype original ne doit PAS affecter le template
            originalPrototype.name = 'Modified Prototype Name';
            originalPrototype.systemPrompt = 'Modified prompt';
            originalPrototype.outputConfig.temperature = 0.9;
            originalPrototype.capabilities.push(LLMCapability.ImageGeneration);
            originalPrototype.tools[0].description = 'Modified tool description';
            originalPrototype.tools[0].parameters.properties.param2 = { type: 'number', description: 'Param 2' };

            // Vérifier que le template n'a PAS été modifié
            expect(template?.template.name).toBe('Test Prototype');
            expect(template?.template.systemPrompt).toBe('Test system prompt');
            expect(template?.template.outputConfig.temperature).toBe(0.7);
            expect(template?.template.capabilities.length).toBe(2);
            expect(template?.template.capabilities).not.toContain(LLMCapability.ImageGeneration);
            expect(template?.template.tools[0].description).toBe('Tool de test');
            expect(template?.template.tools[0].parameters.properties.param2).toBeUndefined();

            // 2. Modifier le template ne doit PAS affecter le prototype original
            template!.template.name = 'Modified Template Name';
            template!.template.capabilities.push(LLMCapability.WebSearch);

            expect(originalPrototype.name).toBe('Modified Prototype Name'); // Reste modifié comme avant
            expect(originalPrototype.capabilities).not.toContain(LLMCapability.WebSearch);
        });

        it('doit générer un ID unique et inclure les métadonnées correctes', () => {
            const prototype: Agent = {
                id: 'proto-456',
                name: 'Marketing Expert',
                role: 'Marketing Specialist',
                systemPrompt: 'Expert en marketing digital',
                llmProvider: LLMProvider.Anthropic,
                model: 'claude-3-sonnet-20240229',
                capabilities: [LLMCapability.Chat],
                tools: [],
                outputConfig: { format: 'text' as const, temperature: 0.7 },
                historyConfig: { enabled: false },
                creator_id: RobotId.Bos,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const template = addPrototypeToTemplates(prototype, 'Mon Template Marketing', 'Template personnalisé');

            expect(template).not.toBeNull();
            expect(template?.id).toMatch(/^custom_\d+_[a-z0-9]+$/);
            expect(template?.name).toBe('Mon Template Marketing');
            expect(template?.description).toBe('Template personnalisé');
            expect(template?.isCustom).toBe(true);
            expect(template?.sourcePrototypeId).toBe('proto-456');
            expect(template?.robotId).toBe(RobotId.Bos);
            expect(template?.category).toBeDefined();
            expect(template?.icon).toBeDefined();
        });

        it('doit refuser de créer un doublon pour le même prototype', () => {
            const prototype: Agent = {
                id: 'proto-789',
                name: 'Data Analyst',
                role: 'Analyst',
                systemPrompt: 'Analyse de données',
                llmProvider: LLMProvider.Gemini,
                model: 'gemini-pro',
                capabilities: [LLMCapability.Chat],
                tools: [],
                outputConfig: { format: 'text' as const, temperature: 0.7 },
                historyConfig: { enabled: false },
                creator_id: RobotId.Phil,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Premier ajout
            const template1 = addPrototypeToTemplates(prototype);
            expect(template1).not.toBeNull();

            // Tentative de deuxième ajout
            const template2 = addPrototypeToTemplates(prototype);
            expect(template2).toBeNull(); // Doit échouer

            // Vérifier qu'un seul template existe
            const templates = loadCustomTemplates();
            expect(templates.length).toBe(1);
        });

        it('doit déterminer automatiquement la catégorie et l\'icône', () => {
            const automationPrototype: Agent = {
                id: 'proto-auto',
                name: 'Automation Bot',
                role: 'Automation Expert',
                systemPrompt: 'Spécialiste en automatisation de workflows',
                llmProvider: LLMProvider.Gemini,
                model: 'gemini-pro',
                capabilities: [LLMCapability.Chat],
                tools: [],
                outputConfig: { format: 'text' as const, temperature: 0.7 },
                historyConfig: { enabled: false },
                creator_id: RobotId.Tim,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const template = addPrototypeToTemplates(automationPrototype);

            expect(template?.category).toBe('automation');
            expect(template?.icon).toBe('🤖');
        });
    });

    describe('deleteCustomTemplate()', () => {
        it('doit supprimer un template existant', () => {
            const prototype: Agent = {
                id: 'proto-del',
                name: 'To Delete',
                role: 'Test',
                systemPrompt: 'Test',
                llmProvider: LLMProvider.Gemini,
                model: 'gemini-pro',
                capabilities: [LLMCapability.Chat],
                tools: [],
                outputConfig: { format: 'text' as const, temperature: 0.7 },
                historyConfig: { enabled: false },
                creator_id: RobotId.Archi,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const template = addPrototypeToTemplates(prototype);
            expect(template).not.toBeNull();

            // Vérifier qu'il existe
            let templates = loadCustomTemplates();
            expect(templates.length).toBe(1);

            // Supprimer
            const deleted = deleteCustomTemplate(template!.id);
            expect(deleted).toBe(true);

            // Vérifier qu'il n'existe plus
            templates = loadCustomTemplates();
            expect(templates.length).toBe(0);
        });

        it('doit retourner false si le template n\'existe pas', () => {
            const deleted = deleteCustomTemplate('nonexistent-id');
            expect(deleted).toBe(false);
        });
    });

    describe('updateCustomTemplate()', () => {
        it('doit mettre à jour les métadonnées d\'un template', () => {
            const prototype: Agent = {
                id: 'proto-upd',
                name: 'To Update',
                role: 'Test',
                systemPrompt: 'Test',
                llmProvider: LLMProvider.Gemini,
                model: 'gemini-pro',
                capabilities: [LLMCapability.Chat],
                tools: [],
                outputConfig: { format: 'text' as const, temperature: 0.7 },
                historyConfig: { enabled: false },
                creator_id: RobotId.Archi,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const template = addPrototypeToTemplates(prototype);
            expect(template).not.toBeNull();

            // Mettre à jour
            const updated = updateCustomTemplate(template!.id, {
                name: 'Updated Name',
                description: 'Updated description',
                icon: '🌟'
            });

            expect(updated).toBe(true);

            // Vérifier les changements
            const templates = loadCustomTemplates();
            const updatedTemplate = templates.find(t => t.id === template!.id);

            expect(updatedTemplate?.name).toBe('Updated Name');
            expect(updatedTemplate?.description).toBe('Updated description');
            expect(updatedTemplate?.icon).toBe('🌟');

            // Vérifier que le template interne n'a PAS été modifié
            expect(updatedTemplate?.template.name).toBe('To Update');
        });
    });

    describe('getAllTemplates()', () => {
        it('doit fusionner templates prédéfinis et personnalisés', () => {
            const prototype: Agent = {
                id: 'proto-merge',
                name: 'Custom Template',
                role: 'Test',
                systemPrompt: 'Test',
                llmProvider: LLMProvider.Gemini,
                model: 'gemini-pro',
                capabilities: [LLMCapability.Chat],
                tools: [],
                outputConfig: { format: 'text' as const, temperature: 0.7 },
                historyConfig: { enabled: false },
                creator_id: RobotId.Archi,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            addPrototypeToTemplates(prototype);

            const allTemplates = getAllTemplates(AGENT_TEMPLATES);

            // Doit contenir les templates prédéfinis + le personnalisé
            expect(allTemplates.length).toBe(AGENT_TEMPLATES.length + 1);

            const customTemplate = allTemplates.find((t: any) => t.isCustom === true);
            expect(customTemplate).toBeDefined();
            expect(customTemplate?.name).toContain('Custom Template');
        });
    });

    describe('Copie profonde - Scénario complexe', () => {
        it('doit gérer correctement des modifications imbriquées multiples', () => {
            const complexTool: Tool = {
                name: 'complex_tool',
                description: 'Complex tool',
                parameters: {
                    type: 'object',
                    properties: {
                        nested: {
                            type: 'object',
                            properties: {
                                deep: { type: 'string', description: 'Deep prop' }
                            }
                        }
                    },
                    required: ['nested']
                }
            };

            const prototype: Agent = {
                id: 'proto-complex',
                name: 'Complex Prototype',
                role: 'Complex',
                systemPrompt: 'Complex prompt',
                llmProvider: LLMProvider.Gemini,
                model: 'gemini-pro',
                capabilities: [LLMCapability.Chat, LLMCapability.FunctionCalling],
                tools: [complexTool],
                outputConfig: { format: 'text' as const, temperature: 0.7 },
                historyConfig: { enabled: true },
                creator_id: RobotId.Archi,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const template = addPrototypeToTemplates(prototype);

            // Modifications profondes sur le prototype original
            (prototype.tools[0].parameters as any).properties.nested.properties.deep = {
                type: 'number',
                description: 'Modified deep prop'
            };
            (prototype.tools[0].parameters as any).properties.newProp = {
                type: 'boolean',
                description: 'New prop'
            };

            // Vérifier l'indépendance totale
            const templateTool = template!.template.tools[0];
            expect((templateTool.parameters as any).properties.nested.properties.deep.type).toBe('string');
            expect((templateTool.parameters as any).properties.nested.properties.deep.description).toBe('Deep prop');
            expect((templateTool.parameters as any).properties.newProp).toBeUndefined();
        });
    });
});
