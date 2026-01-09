# 📋 DEV_RULES - Persistence & Security Guidelines

**Date**: 8 Janvier 2026  
**Statut**: ✅ RÉFÉRENCE ACTIVE  
**Objectif**: Document de référence exhaustif pour tous les développements futures de la persistance  
**Audience**: Tout développement impactant la persistance, l'hydratation ou la sécurité des données

---

## 🎯 Vue d'Ensemble - Principes Fondamentaux

Ce document établit les **règles NON-NÉGOCIABLES** pour gérer la persistance des données dans A-IR-DD2 V2.

**Trois modes de fonctionnement existent:**
1. ✅ **Mode Guest (Invité)**: localStorage uniquement, pas de BDD
2. ✅ **Mode Authenticated (Connecté)**: BDD + API, localStorage vidé
3. ✅ **Transition Guest→Auth**: Wipe complet avant hydratation
4. ✅ **Transition Auth→Guest**: Wipe complet avant reset localStorage

---

## 📊 RÈGLE 1: Différenciation Guest vs Authenticated

### 1.1 Mode Guest - localStorage Uniquement

**Contexte**: Utilisateur non-connecté utilisant l'application en mode démo.

**Stockage**:
```
localStorage:
  ├─ guest_app_locale (langage UI)
  ├─ guest_app_theme (thème jour/nuit)
  ├─ llm_configs_guest (clés API en plaintext)
  ├─ guest_workflow_v1 (workflow structure)
  ├─ guest_workflow_nodes_v1 (nodes canvas)
  ├─ guest_workflow_edges_v1 (edges canvas)
  └─ guest_save_mode (mode auto/manuel)
```

**Règles Absolues**:
- ❌ JAMAIS accéder à .env pour clés API guest
- ❌ JAMAIS accéder à BDD
- ✅ UNIQUEMENT localStorage
- ✅ Données en plaintext (pas de chiffrement)
- ✅ Données VOLATILES (perdues au wipe)

**Sécurité**:
- Données publiques (plaintext API keys) = acceptable car mode démo
- Pas de données confidentielles
- Perte acceptable à logout

---

### 1.2 Mode Authenticated - BDD Uniquement

**Contexte**: Utilisateur connecté via email/password.

**Stockage**:
```
MongoDB:
  ├─ user_settings (preferences: language, theme, saveMode)
  ├─ llm_configs (clés API chiffrées AES-256-GCM)
  ├─ workflows (structure + position canvas)
  ├─ agents (prototypes agents)
  ├─ agent_instances (historique exécution chat/images/vidéos/erreurs)
  └─ fs.files + fs.chunks (GridFS pour images/vidéos)

localStorage: ⚠️ VIDÉ COMPLÈTEMENT
  └─ (Aucune donnée volatile = sécurité maximale)
```

**Règles Absolues**:
- ✅ Données chiffrées (AES-256-GCM avec userId salt)
- ✅ Données persistantes
- ✅ Accessibles uniquement avec authToken valide
- ❌ JAMAIS exposer apiKeyEncrypted en response
- ✅ API Key chargée au besoin, jamais en localStorage

**Sécurité**:
- Données privées + chiffrées = sécurité maximale
- Token expiration = accès expiré
- userId filtering = isolation totale entre utilisateurs

---

### 1.3 Tableau Comparatif

| Aspect | Guest | Authenticated |
|--------|-------|-----------------|
| **Stockage** | localStorage | MongoDB (BDD) |
| **Chiffrement** | Non | AES-256-GCM |
| **Persistance** | Volatile | Permanent |
| **Partage données** | Navigateur local | Sécurisé multiuser |
| **Sécurité** | Faible (démo) | Maximale |
| **Récupération erreur** | Perte données | Récupération possible |
| **API keys** | Plaintext localStorage | Chiffrées BDD |
| **Scénario usage** | Prototype / Test | Production |

---

## 🔒 RÈGLE 2: SecurityWipe - Isolation Totale (CRITIQUE)

### 2.1 Qu'est-ce qu'un SecurityWipe?

**Définition**: Effacement COMPLET de TOUTES les données volatiles lors d'une transition d'authentification.

**Événements Déclencheurs**:
- ✅ Utilisateur clique "Login" (transition Guest→Auth)
- ✅ Utilisateur clique "Logout" (transition Auth→Guest)
- ✅ Token expiration (transition Auth→Guest automatique)
- ✅ Session invalide détectée (sécurité)

**Objectif**: **Garantir 0% de fuite de données entre sessions différentes**

---

### 2.2 Checklist de Wipe Obligatoire

**Lors d'une transition AUTH→GUEST (Logout):**

```typescript
// ❌ À NETTOYER OBLIGATOIREMENT:

localStorage.removeItem('guest_app_locale');
localStorage.removeItem('guest_app_theme');
localStorage.removeItem('llm_configs_guest');
localStorage.removeItem('guest_workflow_v1');
localStorage.removeItem('guest_workflow_nodes_v1');
localStorage.removeItem('guest_workflow_edges_v1');
localStorage.removeItem('guest_save_mode');

// ❌ STORES ZUSTAND À RESET:
useLocalizationStore.getState().resetAll();
useSaveModeStore.getState().resetAll();
useRuntimeStore.getState().resetAll();     // LLM Configs
useWorkflowStore.getState().resetAll();    // Workflow + Agents
useAuthStore.getState().resetAll();        // Auth data

// ❌ REACT CONTEXT À RESET:
// - AuthContext: User = null, token = null
// - LocalizationContext: language = DEFAULT
// - WorkflowCanvasContext: nodes = [], edges = []

// ✅ RÉSULTAT ATTENDU:
// - Toutes les données d'utilisateur supprimées
// - L'app retourne à l'état "fresh guest"
// - Aucune donnée de l'ancien utilisateur visible
```

**Lors d'une transition GUEST→AUTH (Login):**

```typescript
// ❌ À NETTOYER AVANT HYDRATATION:

localStorage.removeItem('guest_app_locale');  // Guest locale
localStorage.removeItem('llm_configs_guest');  // Guest API keys
localStorage.removeItem('guest_workflow_v1');  // Guest workflow

// ❌ STORES À RESET:
useLocalizationStore.getState().resetAll();
useSaveModeStore.getState().resetAll();
useRuntimeStore.getState().resetAll();
useWorkflowStore.getState().resetAll();

// ✅ ENSUITE: Hydrater depuis BDD
// GET /api/user/workspace
// → Charger workflow utilisateur connecté
// → Charger LLM configs de l'utilisateur
// → Charger préférences utilisateur (language, theme)
```

---

### 2.3 Points Critiques - Erreurs Courantes à ÉVITER

❌ **ERREUR 1**: Garder des données guest en localStorage après login
```typescript
// MAUVAIS:
if (isAuthenticated) {
  const guestConfigs = localStorage.getItem('llm_configs_guest');
  // ❌ Donnée guest reste accessible!
}

// BON:
if (isAuthenticated) {
  localStorage.removeItem('llm_configs_guest');
  const authConfigs = await fetch('/api/llm-configs');
}
```

❌ **ERREUR 2**: Oublier de reset un store après logout
```typescript
// MAUVAIS:
const logout = () => {
  clearAuthToken();
  // ❌ Mais les stores Zustand gardent les données!
  navigate('/login');
};

// BON:
const logout = () => {
  useLocalizationStore.getState().resetAll();
  useSaveModeStore.getState().resetAll();
  useRuntimeStore.getState().resetAll();
  useWorkflowStore.getState().resetAll();
  clearAuthToken();
  navigate('/login');
};
```

❌ **ERREUR 3**: Conserver des références cached aux données utilisateur
```typescript
// MAUVAIS:
const cachedUser = useRef(user);  // ❌ Référence stale après logout

// BON:
const user = useAuth().user;      // ✅ Toujours fraîche du context
```

---

### 2.4 Implémentation Recommandée: AuthContext

```typescript
// contexts/AuthContext.tsx

const login = async (email: string, password: string) => {
  try {
    // 1. Authentification
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {...});
    const { user, accessToken, refreshToken } = await response.json();

    // 2. 🔒 WIPE OBLIGATOIRE - Nettoyer guest data
    localStorage.removeItem('guest_app_locale');
    localStorage.removeItem('llm_configs_guest');
    localStorage.removeItem('guest_workflow_v1');
    localStorage.removeItem('guest_workflow_nodes_v1');
    localStorage.removeItem('guest_workflow_edges_v1');
    localStorage.removeItem('guest_save_mode');

    // 3. Reset tous les stores Zustand
    useLocalizationStore.getState().resetAll();
    useSaveModeStore.getState().resetAll();
    useRuntimeStore.getState().resetAll();
    useWorkflowStore.getState().resetAll();

    // 4. Sauvegarder données auth
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    // 5. 💧 HYDRATATION - Charger depuis BDD
    const workspace = await fetch(`${API_BASE_URL}/api/user/workspace`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).then(r => r.json());

    // 6. Hydrater les stores depuis BDD
    useLocalizationStore.getState().setLocale(workspace.userSettings.language);
    useSaveModeStore.getState().setSaveMode(workspace.userSettings.saveMode);
    useRuntimeStore.getState().updateLLMConfigs(workspace.llmConfigs);
    useWorkflowStore.getState().setWorkflow(workspace.workflow);

    // 7. Mettre à jour auth context
    setUser(user);
    setIsAuthenticated(true);

  } catch (error) {
    console.error('[AuthContext] Login failed:', error);
  }
};

const logout = () => {
  // 1. 🔒 WIPE OBLIGATOIRE - Nettoyer toutes données utilisateur
  useLocalizationStore.getState().resetAll();
  useSaveModeStore.getState().resetAll();
  useRuntimeStore.getState().resetAll();
  useWorkflowStore.getState().resetAll();

  // 2. Supprimer tokens
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');

  // 3. Reset auth context
  setUser(null);
  setIsAuthenticated(false);

  // 4. Redirection
  navigate('/login');
};
```

---

## 💧 RÈGLE 3: Hydratation Différenciée

### 3.1 Définition

**Hydratation** = Chargement des données au démarrage ou lors d'une transition d'authentification.

**Trois sources possibles:**
1. ✅ **localStorage** (mode Guest)
2. ✅ **BDD via API** (mode Auth)
3. ✅ **Defaults** (premiers démarrage ou erreur)

---

### 3.2 Hydratation Mode Guest

**Trigger**: App.tsx mount + isAuthenticated=false

```typescript
// hooks/useLocalization.ts (GUEST MODE)

useEffect(() => {
  if (isAuthenticated) return; // Skip si connecté

  // Mode Guest: charger depuis localStorage
  const savedLocale = localStorage.getItem('guest_app_locale');
  const locale = savedLocale || DEFAULT_LOCALE; // 'fr'
  
  useLocalizationStore.getState().initialize(locale);

}, [isAuthenticated]);
```

**Données à charger:**
- Language (localStorage: guest_app_locale)
- Theme (localStorage: guest_app_theme)
- SaveMode (localStorage: guest_save_mode)
- LLM Configs (localStorage: llm_configs_guest)
- Workflow (localStorage: guest_workflow_v1 + nodes + edges)

---

### 3.3 Hydratation Mode Authenticated

**Trigger**: Login success + App.tsx mount si user connecté

```typescript
// hooks/useWorkflowData.ts (AUTH MODE)

useEffect(() => {
  if (!isAuthenticated || !accessToken) return;

  const hydrate = async () => {
    try {
      // ✅ Endpoint composite: UN SEUL APPEL
      const response = await fetch(
        `${API_BASE_URL}/api/user/workspace`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const workspace = await response.json();

      // Hydrater tous les stores atomiquement
      useLocalizationStore.getState().setLocale(workspace.userSettings.language);
      useSaveModeStore.getState().setSaveMode(workspace.userSettings.saveMode);
      useRuntimeStore.getState().updateLLMConfigs(workspace.llmConfigs);
      useWorkflowStore.getState().setWorkflow(workspace.workflow);
      useWorkflowStore.getState().setNodes(workspace.workflow.nodes);
      useWorkflowStore.getState().setEdges(workspace.workflow.edges);
      useWorkflowStore.getState().setAgentInstances(workspace.agentInstances);

    } catch (error) {
      console.error('[useWorkflowData] Hydration failed:', error);
      // Fallback: defaults
    }
  };

  hydrate();

}, [isAuthenticated, accessToken]);
```

**Endpoint Composite (Backend)**:
```
GET /api/user/workspace
Headers: Authorization: Bearer <token>

Response: {
  workflow: { id, name, nodes[], edges[], isActive, ... },
  agentInstances: [ ... ],
  agentPrototypes: [ ... ],
  llmConfigs: [ { provider, enabled, capabilities, ... } ], // NO apiKey!
  userSettings: { language, theme, saveMode, ... },
  metadata: { lastLoadedAt, userId }
}
```

**Données à charger:**
- Language + Theme + SaveMode (depuis UserSettings)
- LLM Configs (depuis llm_configs collection, SANS clés plaintext)
- Workflow + Nodes + Edges (depuis workflows collection)
- Agent Instances (historique chat/images/vidéos/erreurs)
- Agent Prototypes (si nécessaire par écran)

---

### 3.4 Hydratation par Refresh (F5)

**Scénario**: Utilisateur connecté appuie sur F5.

**Flow Attendu**:
```
1. App.tsx mount
2. AuthContext: Check localStorage.auth_token
3. Si token valide:
   → useWorkflowData.hydrate() depuis GET /api/user/workspace
   → Tous les stores rechargés
4. User voit ses données comme avant F5
```

**Implémentation (AuthContext)**:
```typescript
useEffect(() => {
  // Hydratation au mount: restaurer session depuis token en localStorage
  const token = localStorage.getItem('auth_token');
  
  if (token) {
    // Vérifier token valide
    fetch(`${API_BASE_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(user => {
      setUser(user);
      setIsAuthenticated(true);
      setAccessToken(token);
      // useWorkflowData hook va déclencher hydration automatique
    })
    .catch(() => {
      // Token expiré ou invalide
      logout();
    });
  }
}, []);
```

---

### 3.5 Checklist Hydratation

**Avant de développer toute hydratation vérifier:**

- [ ] Quel est le trigger? (mount, login, navigation, F5)
- [ ] Mode guest ou auth? (déterminer localStorage vs API)
- [ ] Quelles données charger? (lister les stores à hydrater)
- [ ] Ordre des appels? (atomique = 1 appel API)
- [ ] Erreur handling? (fallback à defaults)
- [ ] Performance? (< 1 seconde)
- [ ] Tests unitaires? (mock localStorage et API)
- [ ] Tests d'intégration? (full flow guest→auth→F5)

---

## 📱 RÈGLE 4: Récupération des Données par Écran

### 4.1 Principes Généraux

**Chaque écran = 1 "vue" d'un ensemble de données**

**Exemple Architecture:**
```
App.tsx
├─ Header (données globales: user, language, theme)
├─ IconSidebar (navigation menus)
└─ RobotPageRouter
   ├─ ArchiPrototypingPage
   │  ├─ Agents créés par Archi
   │  ├─ LLM Configs (sélection)
   │  └─ Workflow canvas (structure)
   ├─ ComConnectionsPage
   │  ├─ LLM Configs (CRUD)
   │  └─ Connexions API
   ├─ PhilDataPage
   │  ├─ Fichiers générés
   │  └─ Transformations données
   ├─ TimEventsPage
   │  ├─ Events créés
   │  └─ Triggers scheduling
   └─ BosPage (monitoring + debugging)
```

**Règle d'Or:**
- ✅ Chaque écran est **autonome** dans sa récupération de données
- ✅ Les données sont **hydrées une seule fois** via hooks au mount
- ✅ Les modifications déclenche sauvegarde **atomique** (pas de cascade)
- ✅ Les écrans **partagent les stores** Zustand (source unique de vérité)

---

### 4.2 Pattern Recommandé: Custom Hook par Écran

**Exemple: ArchiPrototypingPage → useArchiPrototype()**

```typescript
// hooks/useArchiPrototype.ts

export const useArchiPrototype = () => {
  const { isAuthenticated, accessToken } = useAuth();
  const workflow = useWorkflowStore(s => s.workflow);
  const agents = useWorkflowStore(s => s.agents);
  const llmConfigs = useRuntimeStore(s => s.llmConfigs);
  const [loading, setLoading] = useState(false);

  // 1️⃣ HYDRATATION: Charger données au mount
  useEffect(() => {
    const hydrate = async () => {
      if (!isAuthenticated) {
        // Mode Guest: localStorage
        const guestWorkflow = localStorage.getItem('guest_workflow_v1');
        if (guestWorkflow) {
          useWorkflowStore.getState().setWorkflow(JSON.parse(guestWorkflow));
        }
        return;
      }

      // Mode Auth: BDD
      setLoading(true);
      try {
        // GET /api/user/workspace déjà appelé dans App.tsx
        // Ici on peut charger des données spécifiques à la page
        const response = await fetch(`${API_BASE_URL}/api/agents`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const agentsData = await response.json();
        useWorkflowStore.getState().setAgents(agentsData);
      } catch (error) {
        console.error('[useArchiPrototype] Failed to load agents:', error);
      } finally {
        setLoading(false);
      }
    };

    hydrate();

  }, [isAuthenticated, accessToken]);

  // 2️⃣ SAUVEGARDE: Déclenché par actions utilisateur
  const saveAgent = useCallback(async (agent) => {
    if (!isAuthenticated) {
      // Mode Guest: localStorage
      localStorage.setItem('guest_workflow_v1', JSON.stringify(workflow));
      return;
    }

    // Mode Auth: BDD
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/agents/${agent._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(agent)
        }
      );
      
      if (response.ok) {
        const updated = await response.json();
        useWorkflowStore.getState().updateAgent(updated);
      }
    } catch (error) {
      console.error('[useArchiPrototype] Failed to save agent:', error);
    }
  }, [isAuthenticated, accessToken, workflow]);

  return {
    workflow,
    agents,
    llmConfigs,
    loading,
    saveAgent
  };
};
```

**Utilisation dans le composant:**
```typescript
// components/ArchiPrototypingPage.tsx

export const ArchiPrototypingPage = () => {
  const { workflow, agents, llmConfigs, loading, saveAgent } = useArchiPrototype();

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <WorkflowCanvas agents={agents} workflow={workflow} />
      <AgentForm llmConfigs={llmConfigs} onSave={saveAgent} />
    </div>
  );
};
```

---

### 4.3 Exemple Concret: ComConnectionsPage

**Cas d'usage:**
- Afficher les LLM Configs (clés API activées)
- Permettre ajouter/modifier/supprimer configurations
- Différencier Guest (localStorage) vs Auth (BDD)

**Hydratation:**
```typescript
// hooks/useComConnections.ts

useEffect(() => {
  const loadConfigs = async () => {
    if (!isAuthenticated) {
      // 👤 Mode Guest
      const guestConfigs = localStorage.getItem('llm_configs_guest');
      const parsed = guestConfigs ? JSON.parse(guestConfigs) : {};
      setConfigs(parsed);
      return;
    }

    // 🔐 Mode Auth
    try {
      const response = await fetch(`${API_BASE_URL}/api/llm-configs`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const configs = await response.json();
      useRuntimeStore.getState().updateLLMConfigs(configs);
    } catch (error) {
      console.error('[useComConnections] Failed to load LLM configs:', error);
    }
  };

  loadConfigs();

}, [isAuthenticated, accessToken]);
```

**Sauvegarde:**
```typescript
const addLLMConfig = async (provider: string, apiKey: string) => {
  if (!isAuthenticated) {
    // 👤 Mode Guest: localStorage
    const configs = JSON.parse(localStorage.getItem('llm_configs_guest') || '{}');
    configs[provider] = { apiKeyPlaintext: apiKey, enabled: true };
    localStorage.setItem('llm_configs_guest', JSON.stringify(configs));
    return;
  }

  // 🔐 Mode Auth: BDD (chiffré)
  try {
    const response = await fetch(`${API_BASE_URL}/api/llm-configs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        provider,
        apiKey  // Backend chiffre avec AES-256-GCM
      })
    });
    const savedConfig = await response.json();
    useRuntimeStore.getState().updateLLMConfigs([...llmConfigs, savedConfig]);
  } catch (error) {
    console.error('[useComConnections] Failed to save LLM config:', error);
  }
};
```

---

### 4.4 Checklist par Écran

**Avant de développer un nouvel écran:**

- [ ] **Hook Custom**: `use[ScreenName]()` créé
- [ ] **Hydratation Guest**: localStorage clés définies
- [ ] **Hydratation Auth**: API endpoint + stores mis à jour
- [ ] **Sauvegarde Guest**: localStorage.setItem() appelé
- [ ] **Sauvegarde Auth**: PUT /api endpoint appelé
- [ ] **Error Handling**: Fallback définis
- [ ] **Loading State**: Spinner affiché pendant async
- [ ] **Tests**: useScreenName.test.ts créé
- [ ] **Documentation**: Quelles données chargées + où

### 4.5 Cas particulier de l'enregistrement automatique des données du workflow pour un utilisateur connecté
1. Stratégie de Déclenchement (Debouncing)
N'enregistrez pas à chaque modification. Utilisez un debounce pour regrouper les actions utilisateur et les retours d'API.

Logique : Attendez un délai d'inactivité (ex: 2 secondes) avant d'envoyer la requête de sauvegarde.

Zustand Middleware : Vous pouvez utiliser un subscribe dans votre store pour surveiller les changements et déclencher la fonction de sauvegarde.

2. Structure du Store Zustand
Votre store doit distinguer les données de travail des métadonnées de synchronisation.

Dirty State : Ajoutez un flag isDirty ou lastSynced pour savoir si le store local est en avance sur la BDD.

Actions hybrides : Vos actions Zustand doivent pouvoir mettre à jour l'état (User Input) ET capturer les réponses de vos agents IA (API Results).

3. Optimisation Backend & MongoDB
Pour un SaaS d'agents, les documents peuvent devenir volumineux.

Mises à jour partielles (PATCH) : N'envoyez pas tout le workflow à chaque fois. Utilisez l'opérateur $set de MongoDB pour ne mettre à jour que les champs modifiés (ex: workflow.steps.2.result).

Atomicité : Utilisez $push pour ajouter des logs ou des résultats d'agents sans écraser le reste du document.

Gestion des conflits (Versioning) : Implémentez un système de version (__v ou timestamp). Si deux agents ou l'utilisateur tentent de sauvegarder simultanément, rejetez la version la plus ancienne pour éviter le "Lost Update".

4. Workflow de Persistance : Le pattern "Optimiste"
Pour une expérience fluide, utilisez l'Optimistic UI :

L'utilisateur modifie un nœud du workflow.

Zustand met à jour l'UI immédiatement (Status : "Enregistrement...").

Le backend MongoDB valide.

Si succès : Status : "Enregistré".

Si erreur : On revient à l'état précédent ou on affiche une alerte de reconnexion.

5. Recommandation pour les résultats d'Agents IA
Puisque vos agents génèrent des données de manière asynchrone :

Websockets : Si l'agent envoie des résultats partiels (streaming), ne sauvegardez dans MongoDB qu'à des intervalles réguliers (ex: toutes les 10 secondes) ou à la fin du stream pour limiter les écritures disque.

Collection séparée : Si les logs des agents sont très lourds, séparez la Configuration du Workflow et les Résultats d'Exécution dans deux collections MongoDB différentes, liées par une référence (workflowId).
---

## 🔐 RÈGLE 5: Règles Systématiques à Respecter

### 5.1 Wipe Obligatoire sur Toute Transition Auth

**Règle Immuable**: À CHAQUE changement d'état d'authentification, **TOUS les stores et localStorage doivent être wiped**.

**Scénarios:**
1. ✅ Login (Guest→Auth): Wipe localStorage guest + reset stores
2. ✅ Logout (Auth→Guest): Wipe stores Zustand + supprimer auth token
3. ✅ Token Expiration: Auto-logout = wipe complet
4. ✅ Switching Users: Logout user A + Login user B = 2x wipe

**Implémentation Centralisée:**
```typescript
// services/securityService.ts

export const SecurityService = {
  wipers: {
    // Wipe TOUT (guest + auth)
    wipeAll: () => {
      // localStorage guest
      localStorage.removeItem('guest_app_locale');
      localStorage.removeItem('guest_app_theme');
      localStorage.removeItem('llm_configs_guest');
      localStorage.removeItem('guest_workflow_v1');
      localStorage.removeItem('guest_workflow_nodes_v1');
      localStorage.removeItem('guest_workflow_edges_v1');
      localStorage.removeItem('guest_save_mode');

      // localStorage auth
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');

      // Stores Zustand
      useLocalizationStore.getState().resetAll();
      useSaveModeStore.getState().resetAll();
      useRuntimeStore.getState().resetAll();
      useWorkflowStore.getState().resetAll();
    },

    // Wipe GUEST (avant auth)
    wipeGuest: () => {
      localStorage.removeItem('guest_app_locale');
      localStorage.removeItem('guest_app_theme');
      localStorage.removeItem('llm_configs_guest');
      localStorage.removeItem('guest_workflow_v1');
      localStorage.removeItem('guest_workflow_nodes_v1');
      localStorage.removeItem('guest_workflow_edges_v1');
      localStorage.removeItem('guest_save_mode');
    },

    // Wipe AUTH (avant guest)
    wipeAuth: () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      useLocalizationStore.getState().resetAll();
      useSaveModeStore.getState().resetAll();
      useRuntimeStore.getState().resetAll();
      useWorkflowStore.getState().resetAll();
    }
  }
};
```

**Utilisation:**
```typescript
const login = async (...) => {
  SecurityService.wipers.wipeGuest();  // Avant hydratation
  // ... login logic ...
};

const logout = () => {
  SecurityService.wipers.wipeAll();
  navigate('/login');
};
```

---

### 5.2 Wipe Écran-Spécifique

**Règle**: Certains écrans nécessitent des wipes particuliers selon le contexte.

**Exemple: WorkflowCanvas**

```typescript
// Le workflow est CRITIQUE
// À chaque transition auth, il doit être wiped + rehydraté atomiquement

const WorkflowCanvas = () => {
  useEffect(() => {
    // Wipe workflow quand auth change
    if (isAuthenticated) {
      useWorkflowStore.getState().resetWorkflow();
      // Puis hydrater depuis BDD
      hydrate();
    } else {
      useWorkflowStore.getState().resetWorkflow();
      // Puis hydrater depuis localStorage
      hydrate();
    }
  }, [isAuthenticated]);
};
```

---

### 5.3 Récupération Après F5 (Refresh)

**Règle**: Utilisateur connecté doit TOUJOURS récupérer son travail après F5.

**Flow:**
```
1. User connecté appuie F5
2. App.tsx mount
3. AuthContext: restaurer token depuis localStorage.auth_token
4. Verify token avec backend
5. Si valide: trigger useWorkflowData hydration
6. GET /api/user/workspace chargé
7. Tous les stores remplis
8. User voit ses données comme avant F5
```

**Implémentation Centralisée (AuthContext):**
```typescript
useEffect(() => {
  // Restore session from localStorage on mount
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  // Verify token is still valid
  fetch(`${API_BASE_URL}/api/auth/verify`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(r => {
    if (r.ok) return r.json();
    throw new Error('Token invalid');
  })
  .then(user => {
    setAccessToken(token);
    setUser(user);
    setIsAuthenticated(true);
    // useWorkflowData hook va déclencher hydration auto
  })
  .catch(() => {
    // Token expiré
    SecurityService.wipers.wipeAll();
    setIsAuthenticated(false);
  });
}, []);
```

---

### 5.4 Règles de Codage Obligatoires

**Dans TOUT développement impactant la persistance:**

✅ **À FAIRE:**
- Créer un custom hook `use[Feature]()` pour la logique
- Implémenter hydratation ET sauvegarde dans le hook
- Séparer mode Guest (localStorage) vs Auth (API)
- Tester localStorage ET API
- Documenter quelle donnée va où
- Appeler SecurityService.wipers au moment adéquat

❌ **À ÉVITER:**
- Accéder directement localStorage dans les composants
- Mixer stores Zustand avec localStorage
- Oublier de wipe un écran/store à logout
- Créer plusieurs sources de vérité (duplication données)
- Exposer apiKeyEncrypted en response API
- Garder références cached aux utilisateurs/données
- Négliger error handling (fallback à defaults)

---

## 🧪 RÈGLE 6: Tests Fonctionnels Obligatoires

### 6.1 Où Placer les Tests?

**Dossier Standard**: `tests/fonctionnels/`

**Nommage**: `[Feature].functional.test.ts`

**Exemple**:
```
tests/
└─ fonctionnels/
   ├─ language-persistence.functional.test.ts
   ├─ llm-config-persistence.functional.test.ts
   ├─ workflow-persistence.functional.test.ts
   └─ security-wipe.functional.test.ts
```

---

### 6.2 Template Test Fonctionnel

```typescript
// tests/fonctionnels/[feature].functional.test.ts

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from 'contexts/AuthContext';
import { LocalizationProvider } from 'contexts/LocalizationContext';

describe('[Feature] Persistence - Functional Tests', () => {

  // 1️⃣ SETUP: Initialiser environnement de test
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Guest Mode (localStorage)', () => {
    test('should load data from localStorage on mount', async () => {
      // Arrange
      localStorage.setItem('guest_app_locale', JSON.stringify('fr'));

      // Act
      render(<App />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Français/i)).toBeInTheDocument();
      });
    });

    test('should save data to localStorage on change', async () => {
      // Arrange
      render(<App />);
      const user = userEvent.setup();

      // Act
      const englishRadio = screen.getByLabelText(/English/i);
      await user.click(englishRadio);

      // Assert
      await waitFor(() => {
        const saved = localStorage.getItem('guest_app_locale');
        expect(JSON.parse(saved)).toBe('en');
      });
    });
  });

  describe('Auth Mode (BDD)', () => {
    test('should load data from API after login', async () => {
      // Mock API
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({
          userSettings: { language: 'en', theme: 'dark' },
          workflow: { nodes: [], edges: [] }
        }))
      );

      // Act
      render(<App />);
      // Simulate login
      const user = userEvent.setup();
      await user.click(screen.getByText(/Login/i));
      await user.type(screen.getByLabelText(/Email/i), 'user@test.com');
      await user.click(screen.getByText(/Submit/i));

      // Assert
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/user/workspace'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: expect.stringContaining('Bearer')
            })
          })
        );
      });
    });
  });

  describe('Security Wipe', () => {
    test('should wipe all guest data on login', async () => {
      // Arrange
      localStorage.setItem('guest_app_locale', 'fr');
      localStorage.setItem('llm_configs_guest', JSON.stringify({ Mistral: {} }));

      // Act
      render(<App />);
      // Simulate login
      const user = userEvent.setup();
      await user.click(screen.getByText(/Login/i));

      // Assert
      await waitFor(() => {
        expect(localStorage.getItem('guest_app_locale')).toBeNull();
        expect(localStorage.getItem('llm_configs_guest')).toBeNull();
      });
    });

    test('should wipe all auth data on logout', async () => {
      // Arrange: simuler utilisateur connecté
      localStorage.setItem('auth_token', 'fake-token');

      // Act
      render(<App />);
      const user = userEvent.setup();
      await user.click(screen.getByText(/Logout/i));

      // Assert
      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBeNull();
        expect(screen.queryByText(/Welcome back/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh (F5) Recovery', () => {
    test('should restore auth user state after F5', async () => {
      // Arrange: utilisateur connecté avec token
      localStorage.setItem('auth_token', 'valid-token');
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({
          user: { id: '123', email: 'test@test.com' },
          workflow: { nodes: [...] }
        }))
      );

      // Act
      render(<App />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Welcome, test@test.com/i)).toBeInTheDocument();
        expect(screen.getByText(/My Workflow/i)).toBeInTheDocument(); // Données chargées
      });
    });

    test('should NOT restore guest data after F5', () => {
      // Arrange
      localStorage.setItem('guest_app_locale', 'en');

      // Act
      render(<App />);

      // Assert
      // Guest data should only be used if NOT authenticated
      // If auth succeeds, guest data is wiped
      expect(localStorage.getItem('guest_app_locale')).toBeNull();
    });
  });

  describe('Concurrent Operations', () => {
    test('should not corrupt state on simultaneous saves', async () => {
      // Arrange
      const user = userEvent.setup();

      // Act: Deux saves en même temps
      render(<App />);
      await Promise.all([
        user.click(screen.getByLabelText(/French/i)),
        user.click(screen.getByText(/Save/i))
      ]);

      // Assert
      const saved = localStorage.getItem('guest_app_locale');
      expect(JSON.parse(saved)).toEqual('fr');
    });
  });

});
```

---

### 6.3 Checklist Test Obligatoire

**Pour tout développement de persistance, créer tests pour:**

- [ ] **Guest Mode**: Load + Save localStorage
- [ ] **Auth Mode**: Load + Save API
- [ ] **Security Wipe**: Login et Logout efface données
- [ ] **Hydratation**: F5 restaure état utilisateur
- [ ] **Transition**: Guest→Auth sans fuite
- [ ] **Error Handling**: API fail = fallback à defaults
- [ ] **Performance**: < 1s pour hydratation
- [ ] **Concurrent**: Pas de corruption state

---

## 📋 CHECKLIST DÉVELOPPEMENT GLOBAL

**Avant de commencer un développement impactant la persistance, vérifier cette checklist:**

### Phase de Planification
- [ ] Lire Dev_rules.md en entier
- [ ] Identifier: Est-ce une feature Guest, Auth, ou les deux?
- [ ] Identifier: Quelle donnée va où (localStorage vs BDD)?
- [ ] Identifier: Quels écrans/stores impactés?
- [ ] Identifier: Y a-t-il un wipe particulier à faire?

### Phase de Conception
- [ ] Créer custom hook `use[Feature]()`
- [ ] Spécifier hydratation (trigger + source données)
- [ ] Spécifier sauvegarde (trigger + endpoint/localStorage)
- [ ] Spécifier error handling (fallback)
- [ ] Spécifier wipe si nécessaire
- [ ] Documenter le comportement Guest vs Auth

### Phase d'Implémentation
- [ ] Implémenter hydratation mode Guest
- [ ] Implémenter hydratation mode Auth
- [ ] Implémenter sauvegarde mode Guest
- [ ] Implémenter sauvegarde mode Auth
- [ ] Ajouter wipe dans AuthContext si nécessaire
- [ ] Ajouter tests unitaires du hook
- [ ] Ajouter tests fonctionnels complets

### Phase de Validation
- [ ] Tests unitaires passent (100%)
- [ ] Tests fonctionnels passent (100%)
- [ ] Tests de non-régression passent (npm test)
- [ ] Manual QA: Guest flow
- [ ] Manual QA: Auth flow
- [ ] Manual QA: Guest→Auth transition
- [ ] Manual QA: Auth→Guest transition
- [ ] Manual QA: F5 refresh

### Phase de Documentation
- [ ] Documenter où vont les données (localStorage vs BDD)
- [ ] Documenter les stores Zustand impactés
- [ ] Documenter les API endpoints appelés
- [ ] Documenter le wipe si applicable
- [ ] Créer fichier test fonctionnel

---

## 🚀 EXEMPLE COMPLET: Feature "SaveMode Persistence"

### Étape 1: Planning
```
✅ Fonctionnalité: SaveMode (auto vs manuel)
✅ Modes supportés: Guest (localStorage) + Auth (BDD)
✅ Données: "auto" | "manuel"
✅ Stores impactés: useSaveModeStore
✅ Écrans impactés: SettingsModal, WorkflowCanvas
✅ Wipe: Oui, à chaque login/logout
```

### Étape 2: Design Hook
```typescript
export const useSaveMode = () => {
  // Hydratation: Guest (localStorage) + Auth (API)
  // Sauvegarde: Guest (localStorage) + Auth (API)
  // Wipe: oui (resetAll action)
  // Error: fallback "auto"
}
```

### Étape 3: Implémentation
```typescript
// hooks/useSaveMode.ts
// stores/useSaveModeStore.ts
// services/saveModeService.ts
// backend: PUT /api/user-settings (saveMode)
```

### Étape 4: Tests
```typescript
// tests/unitaires/useSaveMode.test.ts
// tests/fonctionnels/savemode-persistence.functional.test.ts
```

### Étape 5: Documentation
```
Documentation dans Dev_rules.md:
- SaveMode stocké dans UserSettings.preferences.saveMode
- localStorage key: guest_save_mode
- API endpoint: PUT /api/user-settings
- Stores: useSaveModeStore.resetAll() au logout
```

---

## 📞 QUESTIONS FRÉQUENTES

**Q: Où stocke-t-on les fichiers générés?**  
A: GridFS (fs.files + fs.chunks). MediaId en référence dans agent_instances.content.

**Q: Que faire si l'utilisateur loupe sa déco BDD?**  
A: SecurityWipe via token expiration auto-logout.

**Q: Un utilisateur guest peut-il migrer ses données en auth?**  
A: Oui (optionnel). À implémentér en ÉTAPE 3.

**Q: Pourquoi pas localStorage pour données connectées?**  
A: Sécurité: plaintext localStorage = risque. BDD chiffré = sécurisé.

**Q: Comment gérer multi-workflows par utilisateur?**  
A: ÉTAPE 4 (actuellement: 1 workflow par utilisateur).

---

## 📌 POINTS CRITIQUES À NE PAS OUBLIER

1. **SecurityWipe est NON-NÉGOCIABLE** → À chaque transition auth
2. **Hydratation atomique** → 1 appel API maximum par écran
3. **localStorage = plaintext** → Acceptable guest, inacceptable auth
4. **BDD = chiffré** → AES-256-GCM obligatoire pour données sensibles
5. **Tests obligatoires** → Tests fonctionnels pour tout développement
6. **F5 Recovery** → Utilisateur connecté doit retrouver son travail
7. **Wipe Particulier** → Certains écrans (workflow) ont des règles spéciales

---

**Document créé**: 8 Janvier 2026  
**Version**: 1.0 STABLE  
**Statut**: ✅ RÉFÉRENCE ACTIVE  
**Prochaine mise à jour**: Après ÉTAPE 1 implémentation (validation architecture)

---

*Ce document est LA RÉFÉRENCE pour tous les développements de persistance dans A-IR-DD2 V2. À consulter systématiquement avant chaque implémentation.*
