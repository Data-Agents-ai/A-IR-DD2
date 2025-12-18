# 🤖 Guide Utilisateur: Utiliser un LLM Local (Ollama, LMStudio)

**Dernière mise à jour**: 18 Décembre 2025  
**Compréhensibilité**: Utilisateur non-technique ⭐⭐☆  

---

## 🎯 Qu'est-ce qu'un LLM Local?

Un **LLM Local** est une intelligence artificielle qui tourne sur **votre ordinateur** au lieu du cloud:

| Cloud LLM | LLM Local |
|---|---|
| OpenAI (ChatGPT) | Ollama |
| Google (Gemini) | LMStudio |
| Anthropic (Claude) | Jan AI |
| | Votre ordi 💻 |

**Avantages LLM Local:**
- ✅ Gratuit (pas de coût API)
- ✅ Privé (données restent chez vous)
- ✅ Rapide (pas de latence réseau)
- ⚠️ Modèles plus petits (7B au lieu de 70B)

---

## 🚀 Setup en 3 Étapes

### Étape 1: Installer Ollama

**Windows:**
1. Allez sur https://ollama.ai
2. Cliquez "Download for Windows"
3. Installez et lancez
4. Terminal: `ollama run mistral` (télécharge le modèle)

**Mac:**
1. Allez sur https://ollama.ai
2. Cliquez "Download for Mac"
3. Installez et lancez

**Linux:**
```bash
curl https://ollama.ai/install.sh | sh
ollama run mistral
```

Ollama démarre sur **http://localhost:11434** (port par défaut)

### Étape 2: Configurer dans A-IR-DD2

1. Ouvrez l'application A-IR-DD2
2. Cliquez **Settings** (⚙️ en haut à droite)
3. Trouvez section **"LLM local (on premise)"**
4. Entrez l'endpoint: `http://localhost:11434`
5. Cliquez **"Test & Save"**
6. Attendez ~15 secondes
7. Si ✅ vert → Configuration réussie!

### Étape 3: Créer un Agent

1. Cliquez **"+Créer Prototype"** (ou agent)
2. Choisissez **LLM local (on premise)** dans le dropdown
3. Sélectionnez le modèle détecté (ex: "mistral")
4. Configurez votre agent (système prompt, etc.)
5. Cliquez **Sauvegarder**
6. Envoyez un message → L'agent répond! 🎉

---

## 📋 Modèles Recommandés

### Pour Commencer
| Modèle | Taille | Vitesse | Qualité | Commande |
|---|---|---|---|---|
| **Mistral** | 7B | Rapide ⚡ | Moyen | `ollama run mistral` |
| **Llama2** | 7B | Rapide ⚡ | Moyen | `ollama run llama2` |
| **Qwen** | 7B | Rapide ⚡ | Bon | `ollama run qwen:7b` |

### Pour Développement
| Modèle | Spécialité | Commande |
|---|---|---|
| **Qwen Coder** | Code | `ollama run qwen2.5-coder:7b` |
| **Mistral v0.3** | Général + fonctions | `ollama run mistral:v0.3` |
| **Llama 3.2** | Vision + chat | `ollama run llama2-vision` |

### Pour Performance
| Modèle | Taille | RAM Utilisée | Commande |
|---|---|---|---|
| **Qwen 2B** | 2B | 4-6 GB | `ollama run qwen:2b` |
| **Phi 3** | 3B | 6-8 GB | `ollama run phi3` |
| **Qwen 7B** | 7B | 10-12 GB | `ollama run qwen:7b` |
| **Mistral 7B** | 7B | 10-12 GB | `ollama run mistral` |
| **Llama 13B** | 13B | 16-20 GB | `ollama run llama2:13b` |

**RAM Requise**: Modèle + Système + Buffer ≈ 2x taille modèle

---

## 🔧 Dépannage

### ❌ "Connection refused" ou "Cannot reach endpoint"

**Cause**: Ollama/LMStudio ne tourne pas

**Solution:**
1. Vérifiez que Ollama est lancé (icône dans taskbar)
2. Terminal: `ollama serve` pour démarrer manuellement
3. Vérifiez le port: `http://localhost:11434` (Ollama) ou `http://localhost:3928` (LMStudio)

### ❌ "No models available"

**Cause**: Ollama lancé mais aucun modèle téléchargé

**Solution:**
```bash
ollama run mistral  # Télécharge et lance Mistral 7B
```

Attendez le téléchargement (~3-5 GB, ~10 min selon connexion)

### ❌ L'agent répond très lentement

**Cause 1**: Modèle trop gros pour votre RAM
- Solution: Utilisez Qwen 2B ou Phi 3 (plus légers)

**Cause 2**: Manque de RAM disponible
- Solution: Fermez autres applications, augmentez RAM si possible

### ❌ Le port 11434 est occupé

**Cause**: Ollama déjà lancé elsewhere, ou autre service

**Solution:**
```bash
# Changez le port Ollama (exemple: 11435)
OLLAMA_HOST=localhost:11435 ollama serve

# Puis configurez A-IR-DD2 avec: http://localhost:11435
```

---

## 💡 Cas d'Usage

### 1. Développeur: Code Generation
```
LLM: Qwen 2.5 Coder 7B
Prompt: "Écris une fonction Python qui..."
→ Réponse: Code complet + explications
```

### 2. Writer: Brainstorming
```
LLM: Mistral 7B
Prompt: "Donne-moi 5 idées de titres pour..."
→ Réponse: Liste créative
```

### 3. Analyseur: Parsing Data
```
LLM: Llama 3.2
Prompt: "Parse ce JSON et extrait..."
Capacité: JSON mode → Output structuré
```

---

## ⚡ Tips & Tricks

### 1. Multi-Modèles
Vous pouvez avoir plusieurs modèles et **les charger tous**:
```bash
# Terminal 1
ollama run mistral

# Terminal 2
ollama run qwen:7b

# Terminal 3
ollama run llama2
```
Puis dans A-IR-DD2, testez → Tous s'affichent! 🎯

### 2. Optimiser Performance
- Fermez navigateur / autres apps (libère RAM)
- Utilisez Qwen 2B si vous avez <8GB RAM
- Activez GPU dans Ollama pour plus de vitesse

### 3. Améliorer Qualité
- Utiliser Mistral au lieu de Qwen pour meilleure réponse
- Augmenter `temperature` (plus créatif) ou diminuer (plus focus)
- Ajouter des exemples dans le système prompt

### 4. Déboguer une Mauvaise Réponse
1. Testez directement: `curl http://localhost:11434/v1/chat/completions`
2. Vérifiez le modèle sélectionné
3. Vérifiez le système prompt
4. Essayez un modèle différent

---

## 📊 Comparaison: Local vs Cloud

| Aspect | Local (Ollama) | Cloud (OpenAI) |
|---|---|---|
| **Coût** | Gratuit | 0.003-0.03 $/msg |
| **Latence** | 100-500ms | 1-5 sec (réseau) |
| **Privé** | Oui ✅ | Non (envoyé à OpenAI) |
| **Qualité** | Moyen (7B) | Excellent (70B+) |
| **RAM Requis** | 8-16GB | 0 GB (cloud) |
| **Hors-ligne** | Oui ✅ | Non (besoin internet) |
| **Fonctions** | Basique | Avancées (vision, etc.) |

**Quand utiliser Local?**
- Budget limité
- Données sensibles
- Développement / prototypage
- Hors-ligne

**Quand utiliser Cloud?**
- Besoin de meilleure qualité
- Vision / multimodal avancé
- Pas de serveur local
- Haute charge (pas de RAM limites)

---

## 🎓 Apprendre Plus

### Resources
- **Ollama Docs**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **Model Library**: https://ollama.ai/library
- **LMStudio**: https://lmstudio.ai
- **Jan AI**: https://jan.ai

### Community
- Ollama Discord: https://discord.gg/ollama
- Reddit: r/LocalLLaMA

---

## ✅ Checklist Setup

- [ ] Ollama installé et lancé
- [ ] Modèle téléchargé (`ollama run mistral`)
- [ ] A-IR-DD2 configuré avec endpoint
- [ ] Test & Save ✅ succès
- [ ] Agent créé avec LLM local
- [ ] Premier message envoyé → réponse reçue ✅

---

**Succès! Vous utilisez un LLM local! 🎉**

Questions? Consultez le [Guide Technique](../technique/local_llm/ARCHITECTURE_OPTION_C_HYBRID.md) ou demandez à votre équipe.
