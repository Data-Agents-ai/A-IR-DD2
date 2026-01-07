# 🔍 DEBUG CHECKLIST - Session Isolation & Config Loading

## Problème Rapporté
- ✅ Fuite de données partiellement résolue (reset fonctionne)
- ❌ User A ne récupère pas ses configs sauvegardées à la reconnexion

## Flux de Chargement des Configs (ANALYSÉ)

### Quand User A se connecte:

```
1. Login successful
   → AuthContext.saveAuthData() 
   → setState(user, accessToken, refreshToken)
   → isAuthenticated changes: false → true

2. App.tsx useEffect [isAuthenticated, accessToken] TRIGGERS
   → loadLLMConfigs(true, accessToken) called
   → Returns initialLLMConfigs (NOT from localStorage!)
   → setLlmConfigs(initialLLMConfigs)
   ✓ CORRECT: App resets to defaults

3. App passes llmConfigs=defaults to SettingsModal via props
   → SettingsModal useState = defaults
   ✓ CORRECT: Modal initializes with defaults

4. SettingsModal mounts
   → useLLMConfigs hook mounts
   → useEffect [isAuthenticated, accessToken] in hook TRIGGERS
   → loadConfigs() called
   → getAllLLMConfigs({ useApi: true, token: accessToken })
   → API call: GET /api/llm-configs
   → Backend returns User A's configs (with hasApiKey indicators)
   → setConfigs(apiConfigs)
   ✓ CORRECT: Hook loads from API

5. SettingsModal useEffect [isAuthenticated, hookConfigs, hookLoading] TRIGGERS
   → Condition: isAuthenticated && hookConfigs.length > 0 && !hookLoading
   → Converts hookConfigs to LLMConfigWithHasKey format
   → setCurrentLLMConfigs(converted)
   ✓ CORRECT: Modal updates with API configs
```

## Checklist de Vérification

### À demander à l'utilisateur:

1. **Console logs lors du login:**
   ```
   [App] Auth state changed, reloading LLM configs: { isAuthenticated: true, ... }
   [App] Loaded fresh LLM configs: 19 providers
   [useLLMConfigs] Auth state changed: { isAuthenticated: true, ... }
   [useLLMConfigs] loadConfigs called with API
   [SettingsModal] Loading user configs from hook: X providers
   ```
   
2. **Si ces logs manquent:**
   - Quel log manque?
   - Quels logs APPARAISSENT?
   - Y a-t-il des erreurs dans la console?

3. **API Response Check:**
   - Network tab → GET /api/llm-configs
   - Response status: 200 ou erreur?
   - Response body: contient-il les configs?

### Potential Issues to Investigate

- [ ] `getAllLLMConfigs()` API call failing silently
- [ ] Hook loading state not updating correctly
- [ ] SettingsModal useEffect condition not met
- [ ] localStorage still being loaded for auth users
- [ ] Race condition in timing

## Fix Applied

### App.tsx
- ✅ Added useEffect [isAuthenticated, accessToken] to reload configs
- ✅ Modified loadLLMConfigs() to ignore localStorage if authenticated
- ✅ Initialize with initialLLMConfigs instead of calling loadLLMConfigs()

### SettingsModal.tsx
- ✅ Added useEffect to load from useLLMConfigs hook on auth change
- ✅ Convert hook configs to LLMConfigWithHasKey format
- ✅ Use hasApiKey indicator for displaying config status
- ✅ Never expose plaintext API keys for authenticated users

## Next Steps

1. Run full test scenario with console logs visible
2. Check Network tab for API calls
3. Identify which step fails
4. Debug that specific step

---

**Critical Question:** When User A logs in and opens Settings, does the modal:
- A) Show nothing (loading)?
- B) Show defaults (configs not loaded)?
- C) Show User A's old configs correctly?

Answer tells us exactly where the problem is!
