# ÉTAPE 4: Test d'Isolation des Sessions - Guide Complet

## 🎯 Objectif
Valider que les sessions guest et authentifiées ne se contaminent **JAMAIS** l'une l'autre.

---

## 📋 Pré-requis
1. **Browser DevTools ouvert** (F12)
2. **Application tab** du DevTools en focus
3. **Application → Local Storage** accessible
4. **Backend running** (port 3001)
5. **Frontend running** (port 5173)

---

## 🧪 SCÉNARIO 1: Guest Mode → Save Config → Login

### ÉTAPE 1.1: Démarrer en mode Guest (Vierge)
```
1. Clear localStorage: DevTools → Application → Clear All
2. Reload page (F5)
3. Check: Page devrait afficher "Settings / 0 configured" (aucun config)
4. Verify localStorage: clé 'llm_configs_guest' n'existe PAS
```

**Expected Console Logs:**
```
[App] No stored configs (guest), using defaults
[App] Loaded fresh LLM configs: 10 providers
```

**Expected localStorage state:**
```
❌ llm_configs_guest: NOT PRESENT
❌ llmAgentWorkflow_configs: NOT PRESENT
```

---

### ÉTAPE 1.2: En Guest Mode - Activer Mistral
```
1. Clic sur "Settings" modal
2. Chercher "Mistral" provider
3. Toggle "Enabled" → ON
4. NOTE: Ne pas remplir d'API key (reste vide)
5. Close modal avec X ou Escape
```

**Expected localStorage state (vérifier dans DevTools):**
```
✅ llm_configs_guest: DOIT exister
   - Mistral: enabled=true, apiKey=""
   - Autres: enabled=false
```

---

### ÉTAPE 1.3: Logout Guest Mode (Simulated)
```
1. Reload page (F5) - simule "closing the tab"
2. Check localStorage: 'llm_configs_guest' DOIT ENCORE EXISTER
   (on n'a pas logged in, donc pas de wipeGuestData)
3. Check Settings: Mistral DOIT TOUJOURS être enabled
   (guest data persiste dans localStorage)
```

**Expected Console Logs:**
```
[App] No stored configs (guest), using defaults
[App] Loaded fresh LLM configs: 10 providers
[App] LMStudio config loaded from localStorage (guest mode): ...
```

---

### ÉTAPE 1.4: Login (Premier utilisateur)
```
1. Clic sur "Login" ou icône utilisateur
2. Email: testuser1@example.com
3. Password: password123
4. Submit
```

**Expected Events:**
```
a) AuthContext logout event si première fois
b) wipeGuestData() called
c) Configs reset à defaults
d) Redirect vers workflow (logged in)
```

**Expected localStorage state (CRITIQUE):**
```
❌ llm_configs_guest: DOIT ÊTRE VIDE ou NON-EXISTENT
   (wipeGuestData() l'a wiped)
❌ llmAgentWorkflow_configs: DOIT ÊTRE VIDE
   (legacy key aussi wiped)
✅ auth_data_v1: DOIT exister (user, accessToken, refreshToken)
```

**Expected Console Logs:**
```
[AuthContext] Wiping guest data before login: {totalKeys: X}
[AuthContext] Guest data wipe result: {success: true, keysRemoved: [...]}
[AuthContext] LLM API keys fetched successfully: X keys
[App] Auth state changed, reloading LLM configs: {isAuthenticated: true, hasAccessToken: true}
[App] Authenticated user - not loading from localStorage
[App] Loaded fresh LLM configs: 10 providers
```

---

### ÉTAPE 1.5: Authenticated User - Check Settings
```
1. Ouvrir Settings modal
2. Check: Tous les providers doivent avoir enabled=false, apiKey=""
   (Mistral guest config DOIT être gone)
3. Close modal
```

**Expected state:**
```
✅ Mistral: enabled=false (guest override disparu!)
✅ Tous les providers: vierges (configs utilisateur pas encore sauvegardées)
```

---

### ÉTAPE 1.6: Authenticated User - Enable OpenAI
```
1. Settings modal → OpenAI
2. Toggle "Enabled" → ON
3. Mettre API key: sk-test-openai-12345
4. Close modal (auto-save)
```

**Expected localStorage state:**
```
⚠️ llm_configs_guest: DOIT RESTER VIDE
✅ auth_data_v1: DOIT exister avec user + tokens
🔒 MONGODB (backend): OpenAI config sauvegardé CHIFFRÉ
```

**Note:** Les configs authentifiées sont sauvegardées en MongoDB, **PAS dans localStorage**

---

### ÉTAPE 1.7: Logout
```
1. Clic logout (icône utilisateur → Logout)
2. Vérifier redirection vers guest mode
```

**Expected Events:**
```
a) wipeGuestData() called (logout nettoie aussi guest data)
b) Auth state → isAuthenticated=false
c) Configs reset à defaults
```

**Expected localStorage state (ULTRA-CRITIQUE):**
```
❌ llm_configs_guest: DOIT ÊTRE VIDE
❌ llmAgentWorkflow_configs: DOIT ÊTRE VIDE
❌ auth_data_v1: DOIT ÊTRE SUPPRIMÉ
```

**Expected Console Logs:**
```
[AuthContext] Wiping guest data on logout: {totalKeys: X}
[AuthContext] Guest data wipe result: {success: true, keysRemoved: [...]}
[App] Auth state changed, reloading LLM configs: {isAuthenticated: false, hasAccessToken: false}
[App] No stored configs (guest), using defaults
[App] Loaded fresh LLM configs: 10 providers
```

---

## 🧪 SCÉNARIO 2: Guest → Guest (Isolation Test)

### ÉTAPE 2.1: Démarrer Guest Mode (Nouveau)
```
1. Si pas déjà fait: Clear localStorage
2. Reload page
```

---

### ÉTAPE 2.2: Guest - Enable Gemini
```
1. Settings → Gemini
2. Toggle Enabled → ON
3. Close modal
```

**Expected localStorage:**
```
✅ llm_configs_guest: {Gemini: enabled=true, ...}
```

---

### ÉTAPE 2.3: Reload Page (Simule nouvelle visite du guest)
```
1. F5 (reload)
2. Check Settings: Gemini DOIT TOUJOURS être enabled
```

**Expected:**
```
✅ Guest data persiste entre reloads
```

---

## 🧪 SCÉNARIO 3: Login with Another User (Multi-user Test)

### ÉTAPE 3.1: Logout (du scenario précédent si loggé)
```
1. Click logout
2. Vérifier guest data wiped
```

---

### ÉTAPE 3.2: Guest - Enable Perplexity
```
1. Settings → Perplexity
2. Toggle Enabled → ON
```

**Expected localStorage:**
```
✅ llm_configs_guest: {Perplexity: enabled=true}
```

---

### ÉTAPE 3.3: Login with Different User
```
1. Login
2. Email: testuser2@example.com
3. Password: password456
```

**Expected localStorage state:**
```
❌ llm_configs_guest: DOIT ÊTRE VIDE (wipeGuestData!)
❌ Perplexity config DOIT DISPARAÎTRE
✅ auth_data_v1: Nouveau user's tokens
```

**Expected Settings:**
```
✅ Perplexity: enabled=false (guest config gone!)
✅ All providers: vierges (new user)
```

---

### ÉTAPE 3.4: User2 - Enable Anthropic
```
1. Settings → Anthropic
2. Toggle Enabled → ON
3. Add API key: sk-ant-test-12345
```

**Expected:**
```
✅ Anthropic saved in MongoDB pour User2
❌ localStorage VIDE (user2 doesn't touch localStorage)
```

---

### ÉTAPE 3.5: Logout User2
```
1. Logout
```

**Expected:**
```
❌ llm_configs_guest: VIDE
❌ Anthropic config DISPARU
✅ Back to guest mode, vierge
```

---

## ✅ Checklist Final

### localStorage Cleanliness
- [ ] Guest mode: `llm_configs_guest` peut contenir des configs (normal)
- [ ] Authenticated: `llm_configs_guest` DOIT être vide
- [ ] Authenticated: `llmAgentWorkflow_configs` DOIT être vide
- [ ] After logout: TOUS les secrets wiped

### Config Isolation
- [ ] Guest config ne saute jamais vers authenticated session
- [ ] Authenticated config ne saute jamais vers guest session
- [ ] Logout wipe guest + auth data
- [ ] New user doesn't see previous user's data

### Cross-User Isolation
- [ ] User1 enables OpenAI
- [ ] Logout → wipe
- [ ] Login as User2 → User2 ne voit pas OpenAI enabled
- [ ] User2 enables Anthropic (dans MongoDB)
- [ ] Logout → wipe
- [ ] Login as User1 → User1 voit OpenAI enabled (restored from DB), pas Anthropic

### Console Cleanliness
- [ ] No "Cannot read payload" errors (or ignorable)
- [ ] No "message channel closed" errors
- [ ] All logs show correct flow

---

## 🐛 Troubleshooting

### If Guest Config Appears After Login:
```
→ Check: wipeGuestData() was called?
→ Check: getAllGuestKeys() includes LLM_CONFIGS?
→ Check: getLLMConfigsKey() value matches guestDataUtils?
```

### If User Config Appears in Wrong Session:
```
→ Check: Authentication state change detected in App.tsx?
→ Check: useEffect([isAuthenticated, accessToken]) triggered?
→ Check: loadLLMConfigs() respects auth state?
```

### If Authenticated User Can't Load Saved Configs:
```
→ Check: useLLMConfigs hook called in SettingsModal?
→ Check: /api/llm-configs endpoint responding?
→ Check: Backend MongoDB has configs for user?
```

---

## 📊 Expected Behavior Matrix

| State | llm_configs_guest | auth_data_v1 | MongoDB | Settings Show |
|-------|-------------------|--------------|---------|----------------|
| Guest (fresh) | ❌ | ❌ | - | defaults only |
| Guest (configs) | ✅ (custom) | ❌ | - | custom guest |
| Auth (after login) | ❌ (wiped) | ✅ | - | API defaults |
| Auth (after save) | ❌ (wiped) | ✅ | ✅ | API saved |
| Guest (after logout) | ❌ (wiped) | ❌ | - | defaults only |

---

## 🚀 Running Automated Tests (ÉTAPE 5)

Once manual testing passes, we'll create Jest tests for:
```bash
npm test -- --testNamePattern="SessionIsolation"
```

Tests will verify:
- ✅ Guest data storage/retrieval
- ✅ Guest data wipe on login/logout
- ✅ Auth data hydration
- ✅ Config isolation between users
- ✅ localStorage key consistency

