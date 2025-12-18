#!/bin/bash
# API Quick Test - Validate route corrections are live

echo "🧪 Quick Test: Agent-Instances Route Accessibility"
echo "=================================================="
echo ""

# Test 1: Invalid workflowId format
echo "1️⃣  Testing invalid workflowId (should return 400)..."
curl -s -X GET http://localhost:3001/api/workflows/invalid-id/instances \
  -H "Content-Type: application/json" | jq . 2>/dev/null || echo "No response"
echo ""

# Test 2: Valid ObjectId format but no auth
echo "2️⃣  Testing valid ObjectId format (should return 401 or 200)..."
curl -s -X GET http://localhost:3001/api/workflows/507f1f77bcf86cd799439011/instances \
  -H "Content-Type: application/json" | jq . 2>/dev/null || echo "No response"
echo ""

# Test 3: POST with invalid format
echo "3️⃣  Testing POST with invalid workflowId..."
curl -s -X POST http://localhost:3001/api/workflows/bad/instances \
  -H "Content-Type: application/json" \
  -d '{"prototypeId":"test","name":"Test","role":"assistant","systemPrompt":"Test","llmProvider":"openai","llmModel":"gpt-4","capabilities":[],"position":{"x":100,"y":100},"robotId":"AR_001"}' \
  | jq . 2>/dev/null || echo "No response"
echo ""

echo "✅ Accessibility test complete."
