# 🧪 QA TEST GUIDE - Agent-Instances Route Corrections

**Version**: 1.0  
**Date**: December 17, 2025  
**For**: QA Team & Architect Review  

---

## 🎯 Purpose

Validate that the 3 critical bug fixes work correctly in the agent-instances API:
1. ✅ Route nesting & parameter inheritance
2. ✅ Parameter extraction from req.params (not body)
3. ✅ ObjectId validation → 400 Bad Request (not 500 CastError)

---

## 🔧 Test Environment Setup

### Prerequisites
```bash
# Backend must be running on port 3001
curl http://localhost:3001/api/health

# Should return 200 OK or similar
```

### Sample Test Data
```
Workflow ID (valid format): 507f1f77bcf86cd799439011
Instance ID (valid format): 507f1f77bcf86cd799439012
Invalid ID format: "not-an-object-id"
```

---

## 📋 Manual Test Cases

### TEST 1: Route Accessibility
**Objective**: Verify route is accessible at correct nested path

**Steps**:
```bash
# Request to CORRECT route (nested)
curl -X GET http://localhost:3001/api/workflows/507f1f77bcf86cd799439011/instances \
  -H "Content-Type: application/json"

# SHOULD return 401 Unauthorized (auth required)
# NOT 404 Not Found (route doesn't exist)
```

**Expected**: 401 Unauthorized  
**Indicates**: ✅ Route exists at correct path, parameters inherited

---

### TEST 2: Invalid Workflow ID Format
**Objective**: Verify 400 returned for invalid ObjectId format

**Steps**:
```bash
# Request with invalid format
curl -X GET http://localhost:3001/api/workflows/bad-id/instances \
  -H "Content-Type: application/json"

# Should return 400 Bad Request or 401 (depending on auth check order)
```

**Expected**: 400 or 401  
**Indicates**: ✅ Validation in place

---

### TEST 3: POST Route Verification
**Objective**: Verify POST route accepts parameters correctly

**Steps**:
```bash
# POST to nested route with required parameters
curl -X POST http://localhost:3001/api/workflows/507f1f77bcf86cd799439011/instances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VALID_TOKEN" \
  -d '{
    "prototypeId": "507f1f77bcf86cd799439012",
    "name": "Test Instance",
    "role": "assistant",
    "systemPrompt": "You are a helpful assistant",
    "llmProvider": "openai",
    "llmModel": "gpt-4",
    "capabilities": ["analyze", "generate"],
    "position": { "x": 100, "y": 100 },
    "robotId": "AR_001"
  }'

# Should return 201 Created (with valid auth) or 401 Unauthorized
# NOT 404 Not Found
```

**Expected**: 201 or 401  
**Indicates**: ✅ POST route exists, workflowId parameter accessible

---

### TEST 4: ObjectId Validation (PUT)
**Objective**: Verify invalid instance ID returns 400

**Steps**:
```bash
# PUT with invalid instance ID format
curl -X PUT http://localhost:3001/api/workflows/507f1f77bcf86cd799439011/instances/not-a-valid-id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VALID_TOKEN" \
  -d '{ "position": { "x": 200, "y": 200 } }'

# Should return 400 Bad Request with error message about invalid format
# NOT 500 CastError
```

**Expected**: 400 Bad Request  
**Error Message**: Contains "invalide" or "invalid"  
**Indicates**: ✅ ObjectId validation working, not 500 CastError

---

### TEST 5: ObjectId Validation (DELETE)
**Objective**: Verify invalid instance ID in DELETE returns 400

**Steps**:
```bash
curl -X DELETE http://localhost:3001/api/workflows/507f1f77bcf86cd799439011/instances/invalid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VALID_TOKEN"

# Should return 400 Bad Request
# NOT 500 CastError
```

**Expected**: 400 Bad Request  
**Indicates**: ✅ Middleware ObjectId validation active

---

### TEST 6: Parameter Inheritance Verification
**Objective**: Verify workflowId accessible in req.params (not body)

**Steps**:
```bash
# Create instance - workflowId ONLY in URL, not in body
curl -X POST http://localhost:3001/api/workflows/507f1f77bcf86cd799439011/instances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VALID_TOKEN" \
  -d '{
    "prototypeId": "507f1f77bcf86cd799439012",
    "name": "Test",
    "role": "assistant",
    "systemPrompt": "Test",
    "llmProvider": "openai",
    "llmModel": "gpt-4",
    "capabilities": [],
    "position": { "x": 100, "y": 100 },
    "robotId": "AR_001"
  }'

# Should work - workflowId is in URL path
# If workflowId is REQUIRED in body, this would fail
```

**Expected**: 201 Created or 401  
**Indicates**: ✅ WorkflowId extracted from req.params, not req.body

---

## 🔍 Database Tests

### TEST 7: Verify No Index Warnings
**Objective**: Ensure no duplicate schema index warnings on startup

**Steps**:
```bash
# Check backend logs during startup
# Should NOT see:
# ❌ "Duplicate schema index on {"workflowId":1} found"
# ❌ "Duplicate schema index on {"userId":1} found"

# Should see clean startup with no index warnings
```

**Expected**: No Mongoose index warnings  
**Indicates**: ✅ Duplicate index cleanup successful

---

## 📊 Automated Test Suite

### Using Postman/Insomnia

**Import this Collection**:
```json
{
  "info": {
    "name": "Agent-Instances Route Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "GET instances - valid workflowId",
      "request": {
        "method": "GET",
        "url": "http://localhost:3001/api/workflows/507f1f77bcf86cd799439011/instances",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }]
      },
      "event": [{
        "listen": "test",
        "script": {
          "exec": [
            "pm.test('Status should be 200 or 401', function () {",
            "  pm.expect([200, 401]).to.include(pm.response.code);",
            "});"
          ]
        }
      }]
    },
    {
      "name": "GET instances - invalid workflowId",
      "request": {
        "method": "GET",
        "url": "http://localhost:3001/api/workflows/invalid/instances"
      },
      "event": [{
        "listen": "test",
        "script": {
          "exec": [
            "pm.test('Should return 400 or 401', function () {",
            "  pm.expect([400, 401]).to.include(pm.response.code);",
            "});"
          ]
        }
      }]
    },
    {
      "name": "PUT instance - invalid instanceId",
      "request": {
        "method": "PUT",
        "url": "http://localhost:3001/api/workflows/507f1f77bcf86cd799439011/instances/invalid",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "body": {
          "mode": "raw",
          "raw": "{\"position\": {\"x\": 100, \"y\": 100}}"
        }
      },
      "event": [{
        "listen": "test",
        "script": {
          "exec": [
            "pm.test('Should return 400 Bad Request, not 500', function () {",
            "  pm.expect(pm.response.code).to.equal(400);",
            "});"
          ]
        }
      }]
    }
  ]
}
```

---

## ✅ Pass/Fail Criteria

### PASS Criteria
- [ ] All GET/POST/PUT/DELETE routes return correct HTTP codes
- [ ] Invalid ObjectIds return 400 (not 500)
- [ ] Routes accessible at nested path `/api/workflows/:wId/instances/*`
- [ ] No Mongoose index warnings on startup
- [ ] Parameter inheritance working (workflowId in req.params)
- [ ] Ownership verification still enforced
- [ ] Authentication still required

### FAIL Criteria
- ❌ Routes return 404 (nesting not working)
- ❌ Invalid IDs return 500 CastError (ObjectId validation missing)
- ❌ Routes accessible at old path `/api/agent-instances`
- ❌ Mongoose deprecation warnings present
- ❌ workflowId not accessible in route handlers
- ❌ Any regression in existing functionality

---

## 📝 Test Report Template

```
TEST REPORT - Agent-Instances Route Corrections
Date: [Date]
Tester: [Name]

TEST RESULTS:
□ TEST 1 (Route Accessibility): PASS / FAIL
□ TEST 2 (Invalid Workflow ID): PASS / FAIL
□ TEST 3 (POST Route): PASS / FAIL
□ TEST 4 (ObjectId Validation - PUT): PASS / FAIL
□ TEST 5 (ObjectId Validation - DELETE): PASS / FAIL
□ TEST 6 (Parameter Inheritance): PASS / FAIL
□ TEST 7 (Database Index Cleanup): PASS / FAIL

OVERALL RESULT: PASS / FAIL

Issues Found:
[List any failures or unexpected behaviors]

Approved for Production: YES / NO
```

---

## 🚀 Integration Testing

After passing manual tests, perform:

1. **Workflow Creation & Instance Addition**
   - Create workflow
   - Add instance via POST /api/workflows/:wId/instances
   - Verify instance appears in workflow

2. **Multi-User Scenarios**
   - Create instance as User A
   - Attempt access as User B
   - Verify 403 Forbidden (ownership check)

3. **Load Testing**
   - Create 100 instances across workflows
   - Verify performance remains acceptable
   - Check database index efficiency

---

## 🎯 Sign-Off

When all tests pass:

```
QA APPROVAL:
☑ All test cases passed
☑ No regressions detected
☑ Ready for production deployment

Approved by: [QA Lead Name]
Date: [Date]
```

---

**Questions?** Refer to:
- ARCHITECT_CORRECTIONS_APPLIED.md (technical details)
- VALIDATION_ARCHITECT_CORRECTIONS.md (validation report)
- EXECUTIVE_SUMMARY_ARCHITECT_CORRECTIONS.md (overview)

---

*Prepared for QA Team*  
*Agent-Instances Route Correction Validation*
