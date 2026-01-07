# 🧪 ÉTAPE 4 - Test de Régression: Isolation des Sessions Guest/Authenticated

## 🔴 ACTUALIZACIÓN - ROOT CAUSE DÉCOUVERT & FIXÉ

**Problème Réel:** App.tsx ne rechargeait JAMAIS les llmConfigs quand isAuthenticated changeait!
**Solution:** Ajouter useEffect dans AppContent pour recharger configs au login/logout

👉 Voir: [ROOT_CAUSE_REAL_FIX.md](./Guides/ROOT_CAUSE_REAL_FIX.md) pour explication détaillée

## Objectif
Vérifier que les données guest et authenticated sont complètement isolées et qu'il n'y a pas de fuite de données lors des transitions guest ↔ authenticated.

## Scenario de Test - Full Cycle

### 1️⃣ **Initial: Guest Mode**
**ACTION:** Ouvrir http://localhost:5173 en mode incognito (ou nouveau profil)
- ✅ Expected: App affiche "Guest Mode" (pas d'utilisateur)
- ✅ Expected: Pas de données LLM configs

**VERIFICATION CONSOLE:**
```
[useLLMConfigs] Auth state changed: {
  isAuthenticated: false,
  hasAccessToken: null,
  willUseApi: false
}
```

---

### 2️⃣ **Guest Add API Key**
**ACTION:** Settings → Add OpenAI key: `sk-test-openai-guest`
- ✅ Expected: Modal saves without errors
- ✅ Expected: Key appears in SettingsModal (masked)

**VERIFICATION CONSOLE:**
```
[useLLMConfigs] updateConfig called: {
  provider: "OpenAI",
  useApi: false,
  hasToken: false,
  apiKeyLength: 18
}
[LLMConfigService] Saved 1 configs to localStorage
```

**VERIFICATION LOCALSTORAGE (DevTools → Application → Storage):**
```
llm_configs_guest = [{ provider: "OpenAI", apiKey: "sk-test-openai-guest", enabled: true }]
```

---

### 3️⃣ **Guest Login as User A**
**ACTION:** Login with test@test.fr / password123
- ✅ Expected: Login succeeds
- ✅ Expected: **useEffect [isAuth, token] TRIGGERS immediately**
- ✅ Expected: loadLLMConfigs(true, token) called
- ✅ Expected: **App.tsx llmConfigs cleared** (set to defaults)
- ✅ Expected: useLLMConfigs hook loads User A configs from DB

**VERIFICATION CONSOLE:**
```
[App] Auth state changed, reloading LLM configs: {
  isAuthenticated: true,
  hasAccessToken: true
}
[App] Loaded fresh LLM configs: 19 providers
[App] Authenticated user - not loading from localStorage

[useLLMConfigs] loadConfigs called with API
```

**VERIFICATION SETTINGS MODAL:**
```
✅ OpenAI: GONE (was guest's key, NOT loaded from localStorage!)
✅ Gemini: PRESENT (User A's DB key) 
✅ Mistral: PRESENT (User A's DB key)
```

**VERIFICATION LOCALSTORAGE:**
```
llm_configs_guest = (empty or old guest data - App ignores it anyway)
auth_data_v1 = { user: { id: "695d6ac...", email: "test@test.fr" }, ... }
```

---

### 4️⃣ **User A Modifies Settings**
**ACTION:** Settings → Add Anthropic key: `sk-ant-user-a-anthropic`
- ✅ Expected: Saves to API
- ✅ Expected: Appears in modal

**VERIFICATION CONSOLE:**
```
[useLLMConfigs] updateConfig called: {
  provider: "Anthropic",
  useApi: true,
  hasToken: true,
  apiKeyLength: 24
}
[LLMConfigService] Saving to API endpoint /api/llm-configs
```

**VERIFICATION DATABASE (MongoDB):**
```
db.llm_configs.findOne({ userId: "695d6ac...", provider: "Anthropic" })
→ Should exist with encrypted apiKey
```

---

### 5️⃣ **User A Logout**
**ACTION:** Click Logout button
- ✅ Expected: Session clears
- ✅ Expected: **useEffect [isAuth, token] TRIGGERS immediately**
- ✅ Expected: loadLLMConfigs(false, null) called
- ✅ Expected: **App.tsx llmConfigs reloaded from localStorage** (empty guest)

**VERIFICATION CONSOLE:**
```
[App] Auth state changed, reloading LLM configs: {
  isAuthenticated: false,
  hasAccessToken: null
}
[App] Loaded fresh LLM configs: 19 providers
[App] Guest mode - loading from localStorage

[useLLMConfigs] loadConfigs called with localStorage
```

**VERIFICATION SETTINGS MODAL:**
```
✅ OpenAI: GONE (guest's old key - not loaded!)
✅ Gemini: GONE (was User A's key)
✅ Mistral: GONE (was User A's key)
✅ Anthropic: GONE (was User A's key)
```

**VERIFICATION LOCALSTORAGE:**
```
llm_configs_guest = (empty - no guest data from Phase 2)
auth_data_v1 = (empty - logged out)
```

---

### 6️⃣ **Guest (Second Session) Add Different Key**
**ACTION:** Settings → Add Kimi key: `sk-kimi-guest-2`
- ✅ Expected: Saves to localStorage (NOT to API)
- ✅ Expected: Only Kimi appears (not OpenAI from step 2, not User A's keys)

**VERIFICATION CONSOLE:**
```
[App] Guest mode - loading from localStorage
[useLLMConfigs] updateConfig called: {
  provider: "Kimi K2",
  useApi: false,
  hasToken: false,
  apiKeyLength: 14
}
[LLMConfigService] Saved 1 configs to localStorage
```

**VERIFICATION LOCALSTORAGE:**
```
llm_configs_guest = [{ provider: "Kimi K2", apiKey: "sk-kimi-guest-2", enabled: true }]
```

**VERIFICATION SETTINGS MODAL:**
```
✅ OpenAI: GONE (previous guest session data NOT loaded from localStorage!)
✅ Kimi K2: PRESENT (new guest session)
✅ Anthropic: GONE (never guest data, User A only)
```

---

### 7️⃣ **Guest Login as User A Again**
**ACTION:** Login with test@test.fr / password123
- ✅ Expected: **useEffect [isAuth, token] TRIGGERS**
- ✅ Expected: loadLLMConfigs(true, token) IGNORES localStorage!
- ✅ Expected: Guest Kimi key is NEVER loaded
- ✅ Expected: User A's DB configs loaded (Gemini, Mistral, Anthropic)

**VERIFICATION CONSOLE:**
```
[App] Auth state changed, reloading LLM configs: {
  isAuthenticated: true,
  hasAccessToken: true
}
[App] Loaded fresh LLM configs: 19 providers
[App] Authenticated user - not loading from localStorage ← KEY!

[useLLMConfigs] loadConfigs called with API
```

**VERIFICATION SETTINGS MODAL:**
```
✅ Gemini: PRESENT (User A's DB key)
✅ Mistral: PRESENT (User A's DB key)
✅ Anthropic: PRESENT (User A added in step 4)
✅ Kimi K2: GONE (was guest's key - IGNORED by loadLLMConfigs!)
✅ OpenAI: GONE (never User A's key)
```

**VERIFICATION MONGODB:**
```
db.llm_configs.find({ userId: "695d6ac..." })
→ Should have: Gemini, Mistral, Anthropic
→ Should NOT have: Kimi K2 (guest), OpenAI (guest)
```

---

## ✅ Validation Criteria

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Guest add key (Step 2) | Saved to localStorage | [ ] |
| Guest login (Step 3) | Guest data wiped, DB data loaded | [ ] |
| Guest key not visible after login (Step 3) | OpenAI gone | [ ] |
| User A modifies (Step 4) | Anthropic in DB | [ ] |
| User A logout (Step 5) | All configs cleared from memory | [ ] |
| Guest clean slate (Step 5) | No User A's keys visible | [ ] |
| Guest new key (Step 6) | Only Kimi visible | [ ] |
| Guest login again (Step 7) | User A's keys loaded, guest Kimi wiped | [ ] |

---

## 🔍 Debug Commands (Browser Console)

```javascript
// Check localStorage state
Object.keys(localStorage).forEach(k => {
  const val = localStorage.getItem(k);
  console.log(`${k}:`, val.substring(0, 100) + '...');
});

// Check useLLMConfigs state
// (Requires adding a ref to hook or accessing React DevTools)

// Check AuthContext state
// (Requires Context DevTools extension)
```

---

## 📝 Regression Prevention

This test validates:
- ✅ Guest mode data isolation from authenticated sessions
- ✅ localStorage cleanup on login/logout/register
- ✅ useLLMConfigs memory state reset on auth changes
- ✅ No cross-session data contamination
- ✅ Multi-user scenarios (User A → Guest → User A)

**Files Modified for This Fix:**
1. `contexts/AuthContext.tsx` - Added wipeGuestData() to logout()
2. `hooks/useLLMConfigs.ts` - Added useEffect to clear configs on logout
3. `utils/guestDataUtils.ts` - (No changes, already complete)

---

## 🎯 Next Steps After Validation

If all ✅ pass → ÉTAPE 4: Create unit tests for this scenario
If any ❌ fail → Debug logs and implement additional fixes

