// Tests fonctionnels - Workflow CRUD Flow
// Objectif: Valider le cycle complet de vie d'un workflow avec instances et edges

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import passport from 'passport';
import '../middleware/auth.middleware'; // Importer pour initialiser JWT strategy
import { User } from '../models/User.model';
import { Workflow } from '../models/Workflow.model';
import { AgentPrototype } from '../models/AgentPrototype.model';
import { AgentInstance } from '../models/AgentInstance.model';
import { WorkflowEdge } from '../models/WorkflowEdge.model';
import workflowsRoutes from '../routes/workflows.routes';
import agentPrototypesRoutes from '../routes/agent-prototypes.routes';
import agentInstancesRoutes from '../routes/agent-instances.routes';
import { generateAccessToken } from '../utils/jwt';

// Setup Express app pour tests
const app = express();
app.use(express.json());

// Initialiser Passport (JWT strategy configurée par import auth.middleware)
app.use(passport.initialize());

// Monter les routes
app.use('/api/workflows', workflowsRoutes);
app.use('/api/agent-prototypes', agentPrototypesRoutes);
app.use('/api/agent-instances', agentInstancesRoutes);

describe('Workflow CRUD Flow - Cycle de vie complet', () => {
    let testUser: any;
    let accessToken: string;
    let workflowId: string;
    let prototypeId: string;
    let instance1Id: string;
    let instance2Id: string;

    beforeAll(async () => {
        // Créer utilisateur test
        testUser = await User.create({
            email: `workflow-flow-${Date.now()}@test.com`,
            password: 'hashedpassword12345',
            username: `wfflowtest${Date.now()}`
        });

        // Générer token JWT
        accessToken = generateAccessToken({
            sub: testUser.id,
            email: testUser.email,
            role: testUser.role
        });

        // Étape 1: Créer workflow
        const wfRes = await request(app)
            .post('/api/workflows')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Test Workflow Flow' });
        workflowId = wfRes.body._id;

        // Étape 2: Créer prototype
        const protoRes = await request(app)
            .post('/api/agent-prototypes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Agent Assistant',
                role: 'Assistant général',
                systemPrompt: 'Tu es un assistant IA',
                llmProvider: 'Gemini',
                llmModel: 'gemini-2.0-flash-exp',
                robotId: 'AR_001',
                capabilities: [],
                tools: []
            });
        prototypeId = protoRes.body._id;
    }, 30000);

    afterAll(async () => {
        await User.deleteMany({ _id: testUser._id });
    });

    describe('Flow 1: Création workflow → Ajout instances → Save → Load', () => {
        it('Étape 3: Ajouter première instance au workflow', async () => {
            const response = await request(app)
                .post('/api/agent-instances/from-prototype')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    workflowId,
                    prototypeId,
                    position: { x: 100, y: 100 }
                })
                .expect(201);

            expect(response.body).toHaveProperty('_id');
            expect(response.body.workflowId).toBe(workflowId);
            expect(response.body.name).toBe('Agent Assistant');

            instance1Id = response.body._id;
        });

        it('Étape 4: Ajouter deuxième instance au workflow', async () => {
            const response = await request(app)
                .post('/api/agent-instances/from-prototype')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    workflowId,
                    prototypeId,
                    position: { x: 400, y: 100 }
                })
                .expect(201);

            instance2Id = response.body._id;
        });

        it('Étape 5: Vérifier que workflow est marqué isDirty après ajout instances', async () => {
            const workflow = await Workflow.findById(workflowId);
            console.log('[Étape5] workflow found:', !!workflow);
            console.log('[Étape5] workflow.isDirty:', workflow?.isDirty);
            console.log('[Étape5] workflow keys:', workflow ? Object.keys(workflow.toObject()) : 'N/A');
            
            expect(workflow?.isDirty).toBe(true);
        });

        it('Étape 6: Sauvegarder workflow (marquer comme clean)', async () => {
            const response = await request(app)
                .post(`/api/workflows/${workflowId}/save`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.isDirty).toBe(false);
            expect(response.body.lastSavedAt).toBeDefined();
        });

        it('Étape 7: Charger workflow avec composite GET (workflow + instances)', async () => {
            const response = await request(app)
                .get(`/api/workflows/${workflowId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.workflow).toBeDefined();
            expect(response.body.workflow._id).toBe(workflowId);
            expect(response.body.workflow.isDirty).toBe(false);

            expect(response.body.instances).toHaveLength(2);
            expect(response.body.edges).toHaveLength(0);
        });

        it('Étape 8: Modifier une instance (doit marquer workflow isDirty)', async () => {
            await request(app)
                .put(`/api/agent-instances/${instance1Id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Agent 1 - Modifié',
                    position: { x: 150, y: 150 }
                })
                .expect(200);

            const workflow = await Workflow.findById(workflowId);
            expect(workflow?.isDirty).toBe(true);
        });

        it('Étape 9: Supprimer une instance (cascade delete edges)', async () => {
            await request(app)
                .delete(`/api/agent-instances/${instance2Id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Vérifier instance supprimée
            const instance = await AgentInstance.findById(instance2Id);
            expect(instance).toBeNull();

            // Vérifier workflow still exists
            const workflow = await Workflow.findById(workflowId);
            expect(workflow).toBeDefined();
        });

        it('Étape 10: Supprimer workflow (cascade delete instances + edges)', async () => {
            await request(app)
                .delete(`/api/workflows/${workflowId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Vérifier workflow supprimé
            const workflow = await Workflow.findById(workflowId);
            expect(workflow).toBeNull();

            // Vérifier instance restante supprimée
            const instance = await AgentInstance.findById(instance1Id);
            expect(instance).toBeNull();
        });
    });

    describe('Flow 2: Contrainte workflow actif unique', () => {
        it('Doit désactiver ancien workflow actif lors création nouveau', async () => {
            // Créer premier workflow actif
            const wf1 = await request(app)
                .post('/api/workflows')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ name: 'Workflow 1' })
                .expect(201);

            expect(wf1.body.isActive).toBe(true);

            // Créer second workflow actif
            const wf2 = await request(app)
                .post('/api/workflows')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ name: 'Workflow 2' })
                .expect(201);

            expect(wf2.body.isActive).toBe(true);

            // Vérifier que premier est désactivé
            const reloadedWf1 = await Workflow.findById(wf1.body._id);
            expect(reloadedWf1?.isActive).toBe(false);

            // Cleanup
            await Workflow.deleteMany({ _id: { $in: [wf1.body._id, wf2.body._id] } });
        });
    });
});
