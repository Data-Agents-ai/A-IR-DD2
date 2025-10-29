# 🚀 LLM Workflow Orchestrator - Version Démo

## 📦 Installation Rapide

### 1. **Extraire le ZIP**
- Extraire le fichier `LLM-Workflow-Orchestrator-Demo.zip` dans un dossier de votre choix
- Ouvrir un terminal dans le dossier extrait

### 2. **Configurer les Clés API** ⚠️ **OBLIGATOIRE**
Éditer le fichier `.env.local` et remplacer `your_gemini_api_key_here` par votre vraie clé API :

```bash
# Minimum requis pour faire fonctionner la démo
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX

# Autres providers optionnels (décommenter si besoin)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
```

**🔑 Obtenir une clé Gemini (GRATUITE)** :
- Aller sur : https://aistudio.google.com/api-keys
- Créer un compte Google si nécessaire  
- Cliquer "Create API Key" → "Create API key in new project"
- Copier la clé générée dans `.env.local`

### 3. **Installer les Dépendances**
```bash
# Dépendances frontend (à la racine)
npm install

# Dépendances backend
cd backend
npm install
cd ..
```

### 4. **Démarrer l'Application**

**Terminal 1 - Backend :**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend :**
```bash
npm run dev
```

### 5. **Accéder à l'Application**
Ouvrir : **http://localhost:5173** dans votre navigateur

---

## 🎮 Fonctionnalités de la Démo

### ✨ **Navigation V2 - Robots Spécialisés**
- **🏗️ Archi** : Création de prototypes d'agents
- **👔 Bos** : Supervision et monitoring
- **🔗 Com** : Connexions et intégrations
- **📊 Phil** : Transformation de données  
- **⏰ Tim** : Événements et planification

### 🎨 **UX Laser/Gaming**
- Interface moderne style "jeu vidéo Blur"
- Effets hover sophistiqués
- Dégradés laser cyan/blue
- Animations fluides
- Canvas React Flow futuriste

### 🤖 **Création d'Agents**
1. Aller dans **Archi → Prototypage**
2. Cliquer **"Créer Agent"** ou **"Template"**
3. Configurer le nom, rôle, modèle LLM
4. **"Ajouter au Workflow"** pour le tester

### 💬 **Chat en Temps Réel**
- Conversations avec agents directement dans le canvas
- Support images, fichiers, outils
- Modal plein écran disponible
- Streaming des réponses

### 🔗 **Workflow Visuel**
- Glisser-déposer d'agents sur le canvas
- Connexions entre agents (prochainement)
- Synchronisation prototype ↔ instances
- Gestion d'état robuste avec Zustand

---

## 🔧 **Providers LLM Supportés**

| Provider | Capacités | Configuration |
|----------|-----------|---------------|
| **Gemini** | Chat, Images, Outils, Web | ✅ Inclus dans démo |
| OpenAI | Chat, Images, Outils | Optionnel |
| Anthropic | Chat, Outils | Optionnel |
| Mistral | Chat, Outils, OCR | Optionnel |
| Grok | Chat, Outils | Optionnel |

---

## 🆘 **Support & Dépannage**

### **L'application ne démarre pas ?**
- Vérifier que Node.js 18+ est installé : `node --version`
- Vérifier que les clés API sont dans `.env.local`
- Vérifier que les ports 5173 et 3001 sont libres

### **Erreur "API Key" ?**
- Vérifier que `.env.local` contient une vraie clé Gemini
- Redémarrer les serveurs après modification de `.env.local`

### **Canvas vide ?**
- Créer un agent dans **Archi → Prototypage**
- Cliquer **"Ajouter au Workflow"**
- L'agent apparaît sur le canvas

---

## 📋 **Architecture Technique**

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS
- **Backend** : Node.js + Express + TypeScript  
- **Canvas** : React Flow 11.11.4
- **État** : Zustand 5 (Design Store + Runtime Store)
- **Sécurité** : Clés API locales uniquement, pas de transmission

---

**🎉 Profitez de la démo ! Questions → contact développeur**