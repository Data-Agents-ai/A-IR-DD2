/**
 * @file backend/__tests__/integration/llm-configs.integration.test.ts
 * @description Tests d'intégration pour les routes LLM (Jalon 3 - Phase 2)
 * @scope Backend Integration - LLM Configs & API Keys Management
 * 
 * SÉCURITÉ TESTÉE:
 * ✅ Chiffrement AES-256-GCM des API keys
 * ✅ Déchiffrement server-side uniquement
 * ✅ API keys JAMAIS retournées en GET
 * ✅ Authentification JWT requise
 * ✅ Isolation données par user
 * ✅ Validation schema Zod
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../server';
import { User } from '../../models/User.model';
import { LLMConfig } from '../../models/LLMConfig.model';
import jwt from 'jsonwebtoken';

// Mock users pour tests
const mockUser1 = {
    _id: new mongoose.Types.ObjectId(),
    email: 'user1@example.com',
    password: 'hashedPassword123',
    role: 'user',
};

const mockUser2 = {
    _id: new mongoose.Types.ObjectId(),
    email: 'user2@example.com',
    password: 'hashedPassword456',
    role: 'user',
};

// Générer tokens JWT pour tests
const generateToken = (userId: string) => {
    return jwt.sign(
        { id: userId, email: `user${userId}@example.com` },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
    );
};

describe('LLM Configs Integration Tests (Jalon 3 - Phase 2)', () => {
    let token1: string;
    let token2: string;

    beforeAll(async () => {
        // Tokens pour chaque utilisateur
        token1 = generateToken(mockUser1._id.toString());
        token2 = generateToken(mockUser2._id.toString());

        // Créer utilisateurs
        await User.insertMany([mockUser1, mockUser2]);
    });

    afterAll(async () => {
        // Nettoyage
        await LLMConfig.deleteMany({});
        await User.deleteMany({});
    });

    afterEach(async () => {
        // Nettoyer configs après chaque test
        await LLMConfig.deleteMany({});
    });

    describe('POST /api/llm-configs (Upsert)', () => {
        test('should create LLMConfig with encrypted API key', async () => {
            const response = await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'OpenAI',
                    enabled: true,
                    apiKey: 'sk-proj-test-key-12345',
                    capabilities: { streaming: true, tools: true }
                });

            expect(response.status).toBe(200);
            expect(response.body.provider).toBe('OpenAI');
            expect(response.body.enabled).toBe(true);
            expect(response.body.hasApiKey).toBe(true);
            expect(response.body.apiKey).toBeUndefined(); // SECURITY: API key NOT in response

            // Vérifier que API key est chiffrée en BDD
            const storedConfig = await LLMConfig.findById(response.body.id);
            expect(storedConfig?.apiKeyEncrypted).toBeDefined();
            expect(storedConfig?.apiKeyEncrypted).not.toBe('sk-proj-test-key-12345'); // NOT plaintext
        });

        test('should update existing config (upsert)', async () => {
            // Créer config initiale
            await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'Anthropic',
                    enabled: true,
                    apiKey: 'old-api-key',
                    capabilities: { streaming: true }
                });

            // Updater même config
            const response = await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'Anthropic',
                    enabled: false, // Changed
                    apiKey: 'new-api-key',
                    capabilities: { streaming: false, vision: true }
                });

            expect(response.status).toBe(200);
            expect(response.body.enabled).toBe(false);
            expect(response.body.capabilities.vision).toBe(true);

            // Vérifier qu'il n'existe qu'1 config Anthropic pour l'user
            const allConfigs = await LLMConfig.find({ userId: mockUser1._id });
            const anthropicConfigs = allConfigs.filter(c => c.provider === 'Anthropic');
            expect(anthropicConfigs).toHaveLength(1);
        });

        test('should reject without authentication', async () => {
            const response = await request(app)
                .post('/api/llm-configs')
                .send({
                    provider: 'OpenAI',
                    enabled: true,
                    apiKey: 'sk-proj-test',
                    capabilities: {}
                });

            expect(response.status).toBe(401);
        });

        test('should reject invalid provider', async () => {
            const response = await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'InvalidProvider',
                    enabled: true,
                    apiKey: 'sk-proj-test',
                    capabilities: {}
                });

            expect(response.status).toBe(400);
        });

        test('should reject empty API key', async () => {
            const response = await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'OpenAI',
                    enabled: true,
                    apiKey: '',
                    capabilities: {}
                });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/llm-configs (List)', () => {
        beforeEach(async () => {
            // Créer plusieurs configs pour user1
            await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'OpenAI',
                    enabled: true,
                    apiKey: 'sk-proj-openai',
                    capabilities: { streaming: true }
                });

            await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'Anthropic',
                    enabled: false,
                    apiKey: 'sk-ant-anthropic',
                    capabilities: { vision: true }
                });

            // Config pour user2 (isolation test)
            await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token2}`)
                .send({
                    provider: 'Gemini',
                    enabled: true,
                    apiKey: 'google-gemini-key',
                    capabilities: { multimodal: true }
                });
        });

        test('should list user configs without API keys', async () => {
            const response = await request(app)
                .get('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);

            // Vérifier structure réponse (pas d'API keys)
            response.body.forEach((config: any) => {
                expect(config.apiKey).toBeUndefined();
                expect(config.apiKeyEncrypted).toBeUndefined();
                expect(config.hasApiKey).toBe(true); // Indicateur présence key
                expect(config.provider).toBeDefined();
                expect(config.enabled).toBeDefined();
                expect(config.capabilities).toBeDefined();
            });
        });

        test('should filter by enabled status', async () => {
            const response = await request(app)
                .get('/api/llm-configs?enabled=true')
                .set('Authorization', `Bearer ${token1}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].provider).toBe('OpenAI');
            expect(response.body[0].enabled).toBe(true);
        });

        test('should isolate configs by user', async () => {
            const user1Response = await request(app)
                .get('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`);

            const user2Response = await request(app)
                .get('/api/llm-configs')
                .set('Authorization', `Bearer ${token2}`);

            // User1 sees 2 configs (OpenAI, Anthropic)
            expect(user1Response.body).toHaveLength(2);
            expect(user1Response.body.map((c: any) => c.provider)).toEqual(['Anthropic', 'OpenAI']);

            // User2 sees 1 config (Gemini)
            expect(user2Response.body).toHaveLength(1);
            expect(user2Response.body[0].provider).toBe('Gemini');
        });

        test('should reject without authentication', async () => {
            const response = await request(app)
                .get('/api/llm-configs');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/llm-configs/:provider (Get Single)', () => {
        beforeEach(async () => {
            await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'OpenAI',
                    enabled: true,
                    apiKey: 'sk-proj-test',
                    capabilities: { streaming: true }
                });
        });

        test('should get config by provider without API key', async () => {
            const response = await request(app)
                .get('/api/llm-configs/OpenAI')
                .set('Authorization', `Bearer ${token1}`);

            expect(response.status).toBe(200);
            expect(response.body.provider).toBe('OpenAI');
            expect(response.body.apiKey).toBeUndefined();
            expect(response.body.hasApiKey).toBe(true);
        });

        test('should return 404 for non-existent provider', async () => {
            const response = await request(app)
                .get('/api/llm-configs/NonExistent')
                .set('Authorization', `Bearer ${token1}`);

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/llm-configs/:provider', () => {
        beforeEach(async () => {
            await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'OpenAI',
                    enabled: true,
                    apiKey: 'sk-proj-test',
                    capabilities: { streaming: true }
                });
        });

        test('should delete config by provider', async () => {
            const response = await request(app)
                .delete('/api/llm-configs/OpenAI')
                .set('Authorization', `Bearer ${token1}`);

            expect(response.status).toBe(200);

            // Vérifier que config a été supprimée
            const listResponse = await request(app)
                .get('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`);

            expect(listResponse.body).toHaveLength(0);
        });

        test('should return 404 for non-existent provider', async () => {
            const response = await request(app)
                .delete('/api/llm-configs/NonExistent')
                .set('Authorization', `Bearer ${token1}`);

            expect(response.status).toBe(404);
        });
    });

    describe('🔐 Security Tests', () => {
        test('should encrypt API keys with AES-256-GCM', async () => {
            const apiKey = 'sk-proj-security-test-key';

            await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'OpenAI',
                    enabled: true,
                    apiKey,
                    capabilities: {}
                });

            const storedConfig = await LLMConfig.findOne({ userId: mockUser1._id });
            expect(storedConfig?.apiKeyEncrypted).toBeDefined();

            // API key ne doit pas être lisible
            expect(storedConfig?.apiKeyEncrypted).not.toContain(apiKey);

            // Déchiffrement doit récupérer la clé originale
            const decrypted = storedConfig?.getDecryptedApiKey();
            expect(decrypted).toBe(apiKey);
        });

        test('should NOT expose encrypted key in HTTP response', async () => {
            const response = await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'Anthropic',
                    enabled: true,
                    apiKey: 'sk-ant-secret-key',
                    capabilities: {}
                });

            expect(response.body.apiKeyEncrypted).toBeUndefined();
            expect(response.body.apiKey).toBeUndefined();
            expect(response.body.hasApiKey).toBe(true); // Indicateur seulement
        });

        test('should isolate keys by userId + salt', async () => {
            // User1 crée config
            await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token1}`)
                .send({
                    provider: 'OpenAI',
                    enabled: true,
                    apiKey: 'same-key-value',
                    capabilities: {}
                });

            // User2 crée config avec même API key
            await request(app)
                .post('/api/llm-configs')
                .set('Authorization', `Bearer ${token2}`)
                .send({
                    provider: 'OpenAI',
                    enabled: true,
                    apiKey: 'same-key-value',
                    capabilities: {}
                });

            const config1 = await LLMConfig.findOne({ userId: mockUser1._id });
            const config2 = await LLMConfig.findOne({ userId: mockUser2._id });

            // Même plaintext, mais encrypted différemment (salt par user)
            expect(config1?.apiKeyEncrypted).not.toBe(config2?.apiKeyEncrypted);
        });
    });
});
