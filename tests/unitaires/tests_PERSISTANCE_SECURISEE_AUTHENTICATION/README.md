# Tests - Organisation du Projet

## Structure Tests Backend

Les tests unitaires backend sont localisés dans `backend/src/__tests__/` pour compatibilité Jest.

### Tests Unitaires Backend (Jest)

**Emplacement** : `backend/src/__tests__/`

**Configuration** : `backend/jest.config.js`
- Preset: ts-jest
- Test environment: node
- Setup: `backend/src/__tests__/setup.ts`
- Timeout: 30s (hooks MongoDB)
- Coverage target: ≥70%

**Tests Implémentés** :

1. **Workflow.model.test.ts** (10 tests)
   - Création workflow avec validation champs requis
   - Flag isDirty + lastSavedAt
   - Contrainte unicité isActive par user
   - Index composés (userId+isActive, userId+updatedAt)

2. **LLMConfig.model.test.ts** (10 tests)
   - Création avec enum provider (OpenAI, Gemini, Anthropic...)
   - Contrainte unique userId+provider
   - Chiffrement AES-256-GCM (setApiKey/getDecryptedApiKey)
   - Salt unique par chiffrement
   - Détection manipulation cipher
   - Index unique + enabled

**Exécution** :
```bash
cd backend
npm test                    # Tous les tests
npm test -- --watch        # Mode watch
npm test -- --coverage     # Avec coverage
```

**État** : ✅ 20/20 tests PASS (100%)

---

## Tests Fonctionnels (À venir)

**Emplacement prévu** : `tests/fonctionnels/tests_PERSISTANCE_SECURISEE_AUTHENTICATION/`

**Objectif** : Valider flows complets
- workflow-crud-flow.test.ts (create → add instances → save → load → delete)
- llm-config-flow.test.ts (POST config → GET all keys → DELETE config)
- agent-prototype-instance-flow.test.ts (create prototype → create instance → modify → delete)

---

## Tests Non-Régression (À venir)

**Emplacement prévu** : `tests/non-regression/tests_PERSISTANCE_SECURISEE_AUTHENTICATION/`

**Objectif** : Garantir compatibilité V1/V2
- guest-mode.test.tsx (vérifier localStorage workflow still works)
- migration-workflow.test.ts (import localStorage → MongoDB)

---

## Convention Nommage

- **Unitaires** : `*.model.test.ts`, `*.middleware.test.ts`, `*.service.test.ts`
- **Fonctionnels** : `*-flow.test.ts`
- **Non-régression** : `*.test.tsx` (composants React), `*.test.ts` (logique)

---

## Documentation Associée

- Spécifications : `documentation/PLAN_JALONS_SYNTHETIQUE.md`
- Rapports : `documentation/JALON3_PHASE1_COMPLETION.md`, `JALON3_PHASE2_COMPLETION.md`
- Setup Jest : `backend/src/__tests__/setup.ts`
