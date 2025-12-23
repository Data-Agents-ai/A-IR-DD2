// MongoDB Collections & Schema Initialization
// This script creates all required collections and indexes for A-IR-DD2 J4.3

// Switch to application database
db = db.getSiblingDB('a-ir-dd2-dev');

// Create users collection with schema validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
          description: 'User email address (unique)'
        },
        password: {
          bsonType: 'string',
          description: 'Bcrypt hashed password'
        },
        role: {
          bsonType: 'string',
          enum: ['admin', 'user', 'viewer'],
          description: 'User role'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Account creation timestamp'
        },
        updatedAt: {
          bsonType: 'date',
          description: 'Last update timestamp'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Account status'
        },
        lastLogin: {
          bsonType: 'date',
          description: 'Last login timestamp'
        }
      }
    }
  }
});

// Create index on email for faster lookups and uniqueness
db.users.createIndex({ email: 1 }, { unique: true });
console.log('✓ Created users collection with email unique index');

// Create llm_configs collection
db.createCollection('llm_configs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'provider', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        userId: {
          bsonType: 'objectId',
          description: 'Reference to user'
        },
        provider: {
          bsonType: 'string',
          description: 'LLM provider name (gemini, openai, etc.)'
        },
        apiKeyEncrypted: {
          bsonType: 'string',
          description: 'AES-256-GCM encrypted API key'
        },
        capabilities: {
          bsonType: 'object',
          description: 'Available capabilities for this provider'
        },
        isEnabled: {
          bsonType: 'bool',
          description: 'Whether this provider is active'
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Create compound index on userId and provider
db.llm_configs.createIndex({ userId: 1, provider: 1 }, { unique: true });
db.llm_configs.createIndex({ userId: 1 });
console.log('✓ Created llm_configs collection with userId+provider index');

// Create user_settings collection (J4.3 Feature)
db.createCollection('user_settings', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        userId: {
          bsonType: 'objectId',
          description: 'Reference to user'
        },
        llmConfigs: {
          bsonType: 'object',
          description: 'Per-user LLM provider configurations with encrypted keys'
        },
        preferences: {
          bsonType: 'object',
          properties: {
            language: { bsonType: 'string' },
            theme: { bsonType: 'string' }
          },
          description: 'User UI preferences'
        },
        version: {
          bsonType: 'int',
          description: 'Settings version for optimistic concurrency'
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Create index on userId for fast lookups
db.user_settings.createIndex({ userId: 1 }, { unique: true });
console.log('✓ Created user_settings collection (J4.3) with userId index');

// Create workflows collection
db.createCollection('workflows', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'userId', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        userId: {
          bsonType: 'objectId',
          description: 'Reference to user owner'
        },
        name: {
          bsonType: 'string',
          description: 'Workflow name'
        },
        description: {
          bsonType: 'string',
          description: 'Workflow description'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Whether this workflow is currently active'
        },
        lastSavedAt: {
          bsonType: 'date',
          description: 'Last manual save timestamp'
        },
        isDirty: {
          bsonType: 'bool',
          description: 'Has unsaved changes'
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.workflows.createIndex({ userId: 1, isActive: 1 });
db.workflows.createIndex({ userId: 1, updatedAt: -1 });
console.log('✓ Created workflows collection');

// Create agents collection (legacy - kept for backward compatibility)
db.createCollection('agents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'userId', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        userId: {
          bsonType: 'objectId',
          description: 'Reference to user owner'
        },
        name: { bsonType: 'string' },
        description: { bsonType: 'string' },
        tools: { bsonType: 'array' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.agents.createIndex({ userId: 1 });
console.log('✓ Created agents collection (legacy)');

// Create workflow_nodes collection
db.createCollection('workflow_nodes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['ownerId', 'nodeType', 'nodeData', 'position', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        ownerId: {
          bsonType: 'objectId',
          description: 'Reference to user owner'
        },
        nodeType: {
          bsonType: 'string',
          enum: ['agent', 'connection', 'event', 'file'],
          description: 'Type of workflow node'
        },
        nodeData: {
          bsonType: 'object',
          description: 'Node-specific data'
        },
        position: {
          bsonType: 'object',
          required: ['x', 'y'],
          properties: {
            x: { bsonType: 'number' },
            y: { bsonType: 'number' }
          }
        },
        metadata: { bsonType: 'object' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});
db.workflow_nodes.createIndex({ ownerId: 1, nodeType: 1 });
db.workflow_nodes.createIndex({ ownerId: 1, createdAt: -1 });
console.log('✓ Created workflow_nodes collection');

// Create workflow_edges collection
db.createCollection('workflow_edges', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['workflowId', 'userId', 'sourceInstanceId', 'targetInstanceId', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        workflowId: {
          bsonType: 'objectId',
          description: 'Reference to parent workflow'
        },
        userId: {
          bsonType: 'objectId',
          description: 'Reference to user owner'
        },
        sourceInstanceId: {
          bsonType: 'objectId',
          description: 'Source agent instance'
        },
        targetInstanceId: {
          bsonType: 'objectId',
          description: 'Target agent instance'
        },
        sourceHandle: { bsonType: 'string' },
        targetHandle: { bsonType: 'string' },
        edgeType: {
          bsonType: 'string',
          enum: ['default', 'step', 'smoothstep', 'straight']
        },
        animated: { bsonType: 'bool' },
        label: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});
db.workflow_edges.createIndex({ workflowId: 1 });
db.workflow_edges.createIndex({ sourceInstanceId: 1 });
db.workflow_edges.createIndex({ targetInstanceId: 1 });
console.log('✓ Created workflow_edges collection');

// Create agent_prototypes collection
db.createCollection('agent_prototypes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'name', 'role', 'systemPrompt', 'llmProvider', 'llmModel', 'robotId', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        userId: {
          bsonType: 'objectId',
          description: 'Reference to user owner'
        },
        name: { bsonType: 'string' },
        role: { bsonType: 'string' },
        systemPrompt: { bsonType: 'string' },
        llmProvider: { bsonType: 'string' },
        llmModel: { bsonType: 'string' },
        capabilities: { bsonType: 'array' },
        historyConfig: { bsonType: 'object' },
        tools: { bsonType: 'array' },
        outputConfig: { bsonType: 'object' },
        robotId: {
          bsonType: 'string',
          enum: ['AR_001', 'BOS_001', 'COM_001', 'PHIL_001', 'TIM_001'],
          description: 'Robot creator ID'
        },
        isPrototype: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});
db.agent_prototypes.createIndex({ userId: 1, createdAt: -1 });
db.agent_prototypes.createIndex({ userId: 1, robotId: 1 });
console.log('✓ Created agent_prototypes collection');

// Create agent_instances collection (runtime instances in workflows)
db.createCollection('agent_instances', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['workflowId', 'userId', 'name', 'role', 'systemPrompt', 'llmProvider', 'llmModel', 'robotId', 'position', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        workflowId: {
          bsonType: 'objectId',
          description: 'Reference to parent workflow'
        },
        userId: {
          bsonType: 'objectId',
          description: 'Reference to user owner'
        },
        prototypeId: {
          bsonType: 'objectId',
          description: 'Optional reference to source prototype'
        },
        name: { bsonType: 'string' },
        role: { bsonType: 'string' },
        systemPrompt: { bsonType: 'string' },
        llmProvider: { bsonType: 'string' },
        llmModel: { bsonType: 'string' },
        capabilities: { bsonType: 'array' },
        historyConfig: { bsonType: 'object' },
        tools: { bsonType: 'array' },
        outputConfig: { bsonType: 'object' },
        robotId: {
          bsonType: 'string',
          enum: ['AR_001', 'BOS_001', 'COM_001', 'PHIL_001', 'TIM_001']
        },
        position: {
          bsonType: 'object',
          required: ['x', 'y'],
          properties: {
            x: { bsonType: 'number' },
            y: { bsonType: 'number' }
          }
        },
        isMinimized: { bsonType: 'bool' },
        isMaximized: { bsonType: 'bool' },
        zIndex: { bsonType: 'number' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});
db.agent_instances.createIndex({ workflowId: 1, createdAt: -1 });
db.agent_instances.createIndex({ userId: 1, workflowId: 1 });
db.agent_instances.createIndex({ prototypeId: 1 });
console.log('✓ Created agent_instances collection');

console.log('\n✅ All collections created successfully!');
console.log('✅ Schema validation enabled on all collections');
console.log('✅ Indexes created for optimal performance\n');

// Create default test user for development/testing
// Email: test@example.com
// Password: TestPassword123 (hashed with bcrypt rounds: 10)
// NOTE: Schema uses 'password' field (not 'passwordHash') to match backend Mongoose model
db.users.insertOne({
  email: 'test@example.com',
  password: '$2b$10$JkttyuwNvLIxq.f2p9rW8uKD7CFyZZvPZP8jKgRPrBXf2wq8Z2j6u',
  role: 'user',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
console.log('✓ Created test user account');
console.log('  Email: test@example.com');
console.log('  Password: TestPassword123\n');

// Verify collections
const collections = db.getCollectionNames();
console.log('Collections in database:');
collections.forEach(col => console.log(`  - ${col}`));

// Verify test user created
const testUser = db.users.findOne({ email: 'test@example.com' });
if (testUser) {
  console.log(`\n✓ Test user verified in database: ${testUser.email}`);
}
