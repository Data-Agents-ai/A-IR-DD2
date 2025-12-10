# 🧪 TESTS JALON 1 & 2 - Avec MongoDB

## ✅ Test 1: Health Check Backend

```powershell
(Invoke-WebRequest -Uri "http://localhost:3001/api/health").Content
```

**Résultat attendu**: `{"status":"OK","message":"Backend is running"}`

---

## ✅ Test 2: Registration (POST /api/auth/register)

```powershell
$body = @{
    email = "test@example.com"
    password = "Test1234"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$response | ConvertTo-Json
```

**Validations**:
- ✅ Status 201 Created
- ✅ Retourne `user` object (id, email, role)
- ✅ Retourne `accessToken` (JWT)
- ✅ Retourne `refreshToken`
- ✅ Password hashé en DB (vérifiable avec MongoDB Compass)

---

## ✅ Test 3: Login (POST /api/auth/login)

```powershell
$body = @{
    email = "test@example.com"
    password = "Test1234"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

# Sauvegarder tokens
$global:accessToken = $response.accessToken
$global:refreshToken = $response.refreshToken

$response | ConvertTo-Json
```

**Validations**:
- ✅ Status 200 OK
- ✅ Retourne tokens valides
- ✅ `lastLogin` mis à jour

---

## ✅ Test 4: Refresh Token (POST /api/auth/refresh)

```powershell
$body = @{
    refreshToken = $global:refreshToken
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/refresh" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$global:accessToken = $response.accessToken
$response | ConvertTo-Json
```

**Validations**:
- ✅ Status 200 OK
- ✅ Nouveau `accessToken` généré
- ✅ Ancien token reste valide jusqu'à expiration

---

## ✅ Test 5: Protected Route (Simulation)

```powershell
# Test avec token valide
$headers = @{
    Authorization = "Bearer $global:accessToken"
}

Invoke-RestMethod -Uri "http://localhost:3001/api/agents" `
    -Method GET `
    -Headers $headers
```

**Résultat attendu**: 
- Avec token: 200 OK (ou 404 si route pas implémentée)
- Sans token: 401 Unauthorized

---

## ✅ Test 6: Validation Password Policy

```powershell
# Test password faible (devrait échouer)
$body = @{
    email = "weak@example.com"
    password = "weak"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
        -Method POST `
        -Body $body `
        -ContentType "application/json"
} catch {
    $_.Exception.Response.StatusCode
    $_.ErrorDetails.Message
}
```

**Résultat attendu**:
- Status 400 Bad Request
- Message: "Minimum 8 caractères", "1 majuscule requise", etc.

---

## ✅ Test 7: Email Unique

```powershell
# Tenter de créer le même utilisateur 2 fois
$body = @{
    email = "test@example.com"
    password = "Test1234"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
        -Method POST `
        -Body $body `
        -ContentType "application/json"
} catch {
    $_.ErrorDetails.Message
}
```

**Résultat attendu**:
- Status 409 Conflict
- Message: "Email déjà utilisé"

---

## ✅ Test 8: Vérification MongoDB

```powershell
# Se connecter à MongoDB via Docker
docker exec -it a-ir-dd2-mongodb mongosh
```

```javascript
// Dans mongosh
use a-ir-dd2-dev
db.users.find().pretty()
```

**Validations**:
- ✅ Collection `users` existe
- ✅ Password est haché (commence par `$2b$`)
- ✅ Email en lowercase
- ✅ Timestamps `createdAt`, `updatedAt`

---

## 📊 Checklist Validation Jalons 1-2

### Jalon 1: Infrastructure
- [ ] MongoDB connecté
- [ ] Modèles créés (User, Agent, LLMConfig, AgentInstance, WorkflowNode)
- [ ] Encryption utils fonctionnels
- [ ] .env sécurisé

### Jalon 2: Authentification
- [ ] Register fonctionne
- [ ] Login fonctionne
- [ ] Refresh token fonctionne
- [ ] Password policy validée (Zod)
- [ ] Email unique enforced
- [ ] JWT tokens valides
- [ ] Passport middleware opérationnel

### Non-Régression
- [ ] Frontend Guest mode toujours fonctionnel
- [ ] Python tools accessibles
- [ ] WebSocket opérationnel

---

**Date**: 2 décembre 2025  
**MongoDB**: ✅ Docker container `a-ir-dd2-mongodb`  
**Backend**: ✅ http://localhost:3001
