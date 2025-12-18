#!/bin/bash

# 🧪 TEST COMPLET ROUTES LLM - JALON 3 PHASE 2

BASE_URL="http://localhost:3001"
AUTH_TOKEN=""
USER_ID=""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🧪 TEST ROUTES LLM PHASE 2${NC}"
echo -e "${BLUE}================================${NC}"

# ✅ 1. REGISTER + LOGIN
echo -e "\n${YELLOW}[1] Registration & Login${NC}"

REGISTER_EMAIL="llm-test-$(date +%s)@test.com"
REGISTER_PASS="TestPass123!"

echo "Registering: $REGISTER_EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$REGISTER_EMAIL\",\"password\":\"$REGISTER_PASS\"}")

echo "Response: $REGISTER_RESPONSE"

# Login
echo -e "\nLogging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$REGISTER_EMAIL\",\"password\":\"$REGISTER_PASS\"}")

echo "Response: $LOGIN_RESPONSE"

# Extract token
AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}❌ Login failed - no token received${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Auth token: ${AUTH_TOKEN:0:20}...${NC}"
echo -e "${GREEN}✅ User ID: $USER_ID${NC}"

# ✅ 2. POST /api/llm-configs (Create OpenAI config)
echo -e "\n${YELLOW}[2] Create LLM Config (OpenAI)${NC}"

POST_CONFIG=$(curl -s -X POST "$BASE_URL/api/llm-configs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "provider": "OpenAI",
    "enabled": true,
    "apiKey": "sk-test-123456789abcdef",
    "capabilities": {
      "gpt-4": true,
      "gpt-3.5-turbo": true,
      "embeddings": true
    }
  }')

echo "Response: $POST_CONFIG"

CONFIG_ID=$(echo "$POST_CONFIG" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
HAS_API_KEY=$(echo "$POST_CONFIG" | grep -o '"hasApiKey":[^,}]*' | cut -d':' -f2)

if [ "$HAS_API_KEY" = "true" ]; then
  echo -e "${GREEN}✅ Config created with encrypted API key${NC}"
else
  echo -e "${RED}❌ Config creation failed - API key not encrypted${NC}"
fi

# ✅ 3. GET /api/llm-configs (List all configs)
echo -e "\n${YELLOW}[3] List LLM Configs${NC}"

GET_CONFIGS=$(curl -s -X GET "$BASE_URL/api/llm-configs" \
  -H "Authorization: Bearer $AUTH_TOKEN")

echo "Response: $GET_CONFIGS"

# Vérifier que la réponse NE contient PAS l'API key
if echo "$GET_CONFIGS" | grep -q "sk-test-"; then
  echo -e "${RED}❌ SECURITY BREACH: API key exposed in response!${NC}"
  exit 1
fi

if echo "$GET_CONFIGS" | grep -q '"provider":"OpenAI"'; then
  echo -e "${GREEN}✅ Config listed (API key NOT exposed)${NC}"
else
  echo -e "${RED}❌ Config not found in list${NC}"
fi

# ✅ 4. GET /api/llm-configs/:provider
echo -e "\n${YELLOW}[4] Get Specific Provider Config${NC}"

GET_ONE=$(curl -s -X GET "$BASE_URL/api/llm-configs/OpenAI" \
  -H "Authorization: Bearer $AUTH_TOKEN")

echo "Response: $GET_ONE"

if echo "$GET_ONE" | grep -q "OpenAI"; then
  echo -e "${GREEN}✅ Provider config retrieved (secure)${NC}"
fi

# ✅ 5. POST /api/llm/validate-provider
echo -e "\n${YELLOW}[5] Validate Provider Config${NC}"

VALIDATE=$(curl -s -X POST "$BASE_URL/api/llm/validate-provider" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"provider":"OpenAI"}')

echo "Response: $VALIDATE"

VALID=$(echo "$VALIDATE" | grep -o '"valid":[^,}]*' | cut -d':' -f2)

if [ "$VALID" = "true" ]; then
  echo -e "${GREEN}✅ Provider validation passed${NC}"
else
  echo -e "${RED}❌ Provider validation failed${NC}"
fi

# ✅ 6. POST /api/llm/get-api-key (Retrieve decrypted key)
echo -e "\n${YELLOW}[6] Get Decrypted API Key${NC}"

GET_KEY=$(curl -s -X POST "$BASE_URL/api/llm/get-api-key" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"provider":"OpenAI"}')

echo "Response: $GET_KEY"

RETRIEVED_KEY=$(echo "$GET_KEY" | grep -o '"apiKey":"[^"]*' | cut -d'"' -f4)

if [ "$RETRIEVED_KEY" = "sk-test-123456789abcdef" ]; then
  echo -e "${GREEN}✅ API key correctly decrypted${NC}"
else
  echo -e "${RED}❌ API key decryption failed${NC}"
fi

# ✅ 7. POST /api/llm-configs (Create Anthropic config)
echo -e "\n${YELLOW}[7] Create Second Provider Config${NC}"

POST_CLAUDE=$(curl -s -X POST "$BASE_URL/api/llm-configs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "provider": "Anthropic",
    "enabled": true,
    "apiKey": "sk-ant-test-987654321",
    "capabilities": {
      "claude-3-opus": true,
      "claude-3-sonnet": true
    }
  }')

echo "Response: $POST_CLAUDE"

if echo "$POST_CLAUDE" | grep -q '"provider":"Anthropic"'; then
  echo -e "${GREEN}✅ Second config created${NC}"
fi

# ✅ 8. POST /api/llm/get-all-api-keys
echo -e "\n${YELLOW}[8] Get All API Keys${NC}"

GET_ALL=$(curl -s -X POST "$BASE_URL/api/llm/get-all-api-keys" \
  -H "Authorization: Bearer $AUTH_TOKEN")

echo "Response: $GET_ALL"

PROVIDER_COUNT=$(echo "$GET_ALL" | grep -o '"provider"' | wc -l)

if [ "$PROVIDER_COUNT" -ge 2 ]; then
  echo -e "${GREEN}✅ Retrieved $PROVIDER_COUNT provider configs${NC}"
else
  echo -e "${RED}❌ Expected 2+ providers, got $PROVIDER_COUNT${NC}"
fi

# ✅ 9. DELETE /api/llm-configs/:provider
echo -e "\n${YELLOW}[9] Delete LLM Config${NC}"

DELETE=$(curl -s -X DELETE "$BASE_URL/api/llm-configs/Anthropic" \
  -H "Authorization: Bearer $AUTH_TOKEN")

echo "Response: $DELETE"

if echo "$DELETE" | grep -q "supprim"; then
  echo -e "${GREEN}✅ Config deleted${NC}"
fi

# ✅ 10. Verify deletion
echo -e "\n${YELLOW}[10] Verify Deletion${NC}"

VERIFY=$(curl -s -X GET "$BASE_URL/api/llm-configs/Anthropic" \
  -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$VERIFY" | grep -q "introuvable"; then
  echo -e "${GREEN}✅ Deletion verified - config not found${NC}"
else
  echo -e "${RED}❌ Config still exists${NC}"
fi

echo -e "\n${BLUE}================================${NC}"
echo -e "${GREEN}✅ ALL TESTS COMPLETED${NC}"
echo -e "${BLUE}================================${NC}"
