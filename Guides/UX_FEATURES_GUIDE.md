# Guide UX et Fonctionnalités - A-IR-DD2

> **Objectif** : Référence complète pour comprendre rapidement l'expérience utilisateur, les workflows et les fonctionnalités de l'application.

---

## 🎯 Vue d'ensemble

**A-IR-DD2** est un orchestrateur de workflow multi-agents avec support de multiples LLM. L'interface est conçue avec un style **gaming futuriste** inspiré de Blur Racing (néons cyan/violet, effets laser, animations fluides).

### Vision V2 : Architecture "5 Robots Manufacturiers"

L'application évolue vers un système où **5 robots spécialisés** créent des prototypes pour orchestrer des workflows :

| Robot | Spécialité | Prototypes gérés |
|-------|-----------|------------------|
| **Archi** | Architecture & orchestration | Agents, logique workflow |
| **Bos** | Supervision & monitoring | Debugging, coûts, logs |
| **Com** | Connectivité externe | APIs, authentification, webhooks |
| **Phil** | Transformation de données | Files, parsing, validation |
| **Tim** | Événements & scheduling | Triggers, rate limiting, async |

---

## 🖥️ Structure de l'Interface

### 1. **Sidebar Verticale à Icônes** (V2)

**Objectif** : Maximiser l'espace canvas pour l'éditeur de workflow React Flow.

```
┌─────┐
│  🏠 │  Accueil (non implémenté)
│  🔧 │  Archi → Prototypage
│  👁️ │  Bos → Supervision
│  🔌 │  Com → Connexions
│  📊 │  Phil → Données
│  ⏱️ │  Tim → Événements
└─────┘
```

**Interaction** :
- Hover → Tooltip avec nom du robot (traduit)
- Clic → Affiche sous-menu contextuel (pour Archi) ou page dédiée (autres robots)

#### Archi - Sous-menu Prototypage

Clic sur Archi ouvre un sous-menu flottant :
- **Créer Prototype** → Ouvre `ArchiPrototypingPage`
- **Bibliothèque** → Liste des prototypes existants
- Fermeture : clic extérieur ou bouton X

---

### 2. **Canvas Workflow** (React Flow)

**Zone centrale** : Édition visuelle des workflows avec drag & drop.

#### Nœuds Agents (V2AgentNode)

Chaque agent apparaît comme un **nœud interactif** :

```
┌─────────────────────────────┐
│ 🤖 Agent Name         [−][✕]│  ← Header (drag, minimize, close)
├─────────────────────────────┤
│ 💬 Chat Messages           │  ← Historique conversationnel
│                             │
│ [Image avec overlay hover] │  ← Images avec boutons fullscreen/edit
│                             │
├─────────────────────────────┤
│ [📎] [🖼️] [Input] [Send]   │  ← Mediabar
└─────────────────────────────┘
```

**Capabilities-driven UI** :
- Icône 📎 → visible si `FileUpload` capability
- Icône 🖼️ → visible si `ImageGeneration` OU `ImageModification`
- Bouton Edit (sur image) → visible si `ImageModification`

---

### 3. **Système de Capabilities LLM**

Les fonctionnalités UI s'affichent dynamiquement selon les capabilities de l'agent :

```typescript
enum LLMCapability {
  Chat,                  // Conversation basique
  FileUpload,            // Upload de fichiers
  ImageGeneration,       // Génération d'images via prompt
  ImageModification,     // Édition d'images existantes
  WebSearch,             // Recherche web intégrée
  URLAnalysis,           // Analyse de contenu URL
  FunctionCalling,       // Appel de fonctions/tools
  OutputFormatting,      // JSON structuré, Markdown
  Embedding,             // Génération d'embeddings
  OCR,                   // Reconnaissance optique
  Reasoning,             // Raisonnement avancé (DeepSeek)
  CacheOptimization,     // Cache de prompts (DeepSeek)
  LocalDeployment,       // Déploiement local (LMStudio)
  CodeSpecialization     // Spécialisation code (LMStudio)
}
```

**Règles d'affichage** :
- `ImageGeneration` seule → Bouton "Generate" dans panneau
- `ImageModification` seule → Bouton "Import Image" uniquement
- Les deux → "Import" + "Generate" + "Edit" après génération/import

---

## 🎨 Workflows Utilisateur

### Workflow 1 : Création d'Agent (Prototypage Archi)

1. **Clic sidebar** → Icône Archi (🔧)
2. **Sous-menu** → "Créer Prototype"
3. **Formulaire** (`ArchiPrototypingPage`) :
   - Nom, description, tags
   - **Sélection LLM** → Auto-détecte capabilities disponibles
   - **Prompt système** → Instructions de l'agent
   - **Tools** → Sélection dans whitelist Python
   - **Output Config** → JSON schema (optionnel)
   - **History Config** → Résumé automatique au-delà de limites (tokens/mots/messages)
4. **Validation** → Vérifie `creator_id` (doit être "archi")
5. **Ajout au workflow** → Drag prototype sur canvas

### Workflow 2 : Génération d'Image

**Cas A : Agent avec ImageGeneration**

1. **Clic icône 🖼️** dans mediabar
2. **Panneau ImageGenerationPanel** s'ouvre :
   - Textarea pour prompt
   - Bouton "Generate"
3. **Génération** → Image s'affiche dans panneau
4. **Actions** :
   - "Add to Chat" → Envoie au chat de l'agent
   - "Edit" (si `ImageModification`) → Ouvre panneau modification

**Cas B : Agent avec ImageModification seule**

1. **Clic icône 🖼️** → Panneau s'ouvre SANS textarea
2. **Bouton "Import Image"** uniquement
3. **Import** → Image chargée s'affiche
4. **Actions** :
   - "Add to Chat" → Envoie directement
   - "Edit" → Ouvre panneau modification avec prompt

### Workflow 3 : Modification d'Image

**Depuis panneau génération** :
1. Clic "Edit" → `ImageModificationPanel` s'ouvre
2. Preview image source
3. Textarea prompt (ex: "Rendre l'arrière-plan flou")
4. "Modify" → LLM génère nouvelle version
5. "Add to Chat" → Envoie au chat

**Depuis chat (hover overlay)** :
1. Hover sur image dans message → Overlay apparaît
2. Boutons :
   - **⛶ Fullscreen** (cyan) → Affichage plein écran
   - **✎ Edit** (violet, si capability) → Ouvre panneau modification

### Workflow 4 : Conversation avec Agent

1. **Input texte** dans mediabar
2. **Attachement fichier** (optionnel, si `FileUpload`)
3. **Clic Send** → Message utilisateur ajouté
4. **Streaming LLM** → Réponse apparaît progressivement
5. **Tool calls** (si `FunctionCalling`) :
   - Icône 🔧 sur message
   - Résultat outil affiché en gris

**Gestion historique** (`HistoryConfig`) :
- **Désactivé** → Chaque message est standalone
- **Activé sans limite** → Tout l'historique envoyé
- **Activé avec limites** → Résumé auto si dépassement :
  ```
  Tokens: 500 / Mots: 200 / Messages: 10
  → Résumé généré par LLM
  → Seuls résumé + dernier message envoyés
  ```

---

## 🌐 Système de Traduction (i18n)

### Langues supportées
- 🇫🇷 Français (par défaut)
- 🇬🇧 Anglais
- 🇪🇸 Espagnol
- 🇩🇪 Allemand
- 🇵🇹 Portugais

### Hook d'utilisation
```typescript
const { t, currentLanguage, changeLanguage } = useLocalization();

// Traduction simple
<h1>{t('archi_prototyping_header')}</h1>

// Traduction avec interpolation
<h1>{t('imageGen_title', { agentName: 'GPT-4' })}</h1>
```

### Clés de traduction par domaine

**Navigation** : `robot_archi_name`, `nav_prototyping`, `nav_library`...  
**Archi Prototyping** : `archi_*` (form labels, validation)  
**Tim Events** : `tim_*` (triggers, scheduling)  
**Phil Data** : `phil_*` (transformations, validation)  
**Com Connections** : `com_*` (API, auth)  
**Image Panels** : `imageGen_*`, `imageMod_*`

---

## 🎮 Style Gaming & Animations

### Palette de couleurs

```css
/* Primaires */
--cyan-neon: #00D9FF;      /* Actions, hover states */
--purple-neon: #A855F7;    /* Secondaire, édition */
--gray-dark: #1F2937;      /* Backgrounds */
--gray-light: #D1D5DB;     /* Texte */

/* États */
--success: #10B981;
--error: #EF4444;
--warning: #F59E0B;
```

### Classes réutilisables

**Boutons laser** :
```css
.laser-glow {
  box-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
  transition: all 0.2s;
}
.laser-glow:hover {
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.8);
  transform: scale(1.1);
}
```

**Overlays d'images** :
```css
.group:hover .overlay {
  opacity: 1;
  background: rgba(0, 0, 0, 0.6);
}
```

---

## 📊 Pages Spécialisées des Robots

### TimEventsPage
**Gestion des déclencheurs** :
- Manual triggers
- Scheduled (cron)
- Webhooks
- Conditional events

**UI** : Liste + formulaire création avec validations cron.

### PhilDataPage
**Transformations de données** :
- Parsers (JSON, CSV, XML)
- Validators (schemas)
- Formatters (output)

**UI** : Pipelines de transformation visuels.

### ComConnectionsPage
**Gestion APIs externes** :
- OAuth2 flows
- API keys storage
- Rate limiting
- Retry policies

**UI** : Liste connexions + tests endpoints.

---

## 🔒 Sécurité & Gouvernance

### Validation creator_id

Chaque prototype vérifie son créateur :
```typescript
if (prototype.creator_id !== 'archi' && prototype.type === 'agent') {
  throw new Error('Only Archi can create Agent prototypes');
}
```

### Whitelist Python Tools

Seuls les scripts dans `backend/src/config.ts` :
```typescript
const WHITELISTED_PYTHON_TOOLS = [
  'textAnalysis.py',
  'dataProcessing.py',
  'imageProcessing.py'
];
```

### Stockage API Keys

Les clés LLM sont stockées dans `localStorage` (à migrer vers backend sécurisé).

---

## 🚀 Fonctionnalités Avancées

### WebSocket Real-time Sync
- Collaboration multi-utilisateurs (prévu V2)
- Curseurs collaboratifs
- Synchro état workflow

### Fullscreen Chat Mode
- Clic sur icône expand → Modal plein écran
- Historique complet
- Même mediabar que nœud

### Export/Import Workflows
- Sauvegarde JSON des workflows
- Partage entre utilisateurs
- Versioning (prévu)

---

## 📱 Responsive & Accessibilité

### Breakpoints
- Desktop : > 1024px (optimal)
- Tablet : 768px - 1024px (sidebar collapse)
- Mobile : < 768px (non supporté V1)

### ARIA Labels
Tous les boutons iconiques ont `aria-label` :
```tsx
<button aria-label={t('fullscreenModal_close_aria')}>×</button>
```

### Keyboard Navigation
- `Tab` : Navigation entre champs
- `Enter` : Submit forms
- `Esc` : Fermeture modales/panneaux

---

## 🧪 Testing & Validation

### Points de validation UI

**Prototypage Agent** :
- [ ] Nom requis (3+ caractères)
- [ ] LLM sélectionné avec API key
- [ ] System prompt non vide
- [ ] JSON schema valide (si fourni)
- [ ] History limits cohérents (> 0)

**Image Generation** :
- [ ] Prompt requis si ImageGeneration
- [ ] Import fonctionnel si ImageModification
- [ ] Preview affichée après génération/import
- [ ] Boutons conditionnels selon capabilities

**Chat Agent** :
- [ ] Messages streaming affichés progressivement
- [ ] Tool calls identifiables avec icône
- [ ] Scroll auto vers nouveau message
- [ ] Image overlay visible au hover

---

## 🎯 Checklist Onboarding Agent IA

Pour comprendre rapidement le système :

1. ✅ Lire `PLAN_JALONS_SYNTHETIQUE.md` (vision globale)
2. ✅ Étudier `types.ts` (contrats de données)
3. ✅ Analyser `robotNavigation.ts` (structure navigation)
4. ✅ Consulter ce guide UX
5. ✅ Lire `ARCHITECTURE_GUIDE.md` (patterns code)
6. ✅ Tester workflow complet : créer agent → ajouter au canvas → chatter → générer image

---

## 📞 Ressources Complémentaires

- **Architecture** : `Guides/ARCHITECTURE_GUIDE.md`
- **Plan jalons** : `documentation/PLAN_JALONS_SYNTHETIQUE.md`
- **Analyse initiale** : `documentation/ANALYSE_INITIALE.md`
- **Spec N8N** : `documentation/N8N_WORKFLOW_EDITOR_SPEC.md`
- **LLM Compatibility** : `documentation/LLM_COMPATIBILITY_REPORT.md`

---

**Dernière mise à jour** : 13 novembre 2025  
**Version** : V2.0 (Transition vers architecture 5 robots)
