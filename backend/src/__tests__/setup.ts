// Backend test setup
// Configure global test environment
import mongoose from 'mongoose';

// Extend Jest timeout for async operations
jest.setTimeout(30000); // Augmenter à 30s pour connexion MongoDB

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-unit-tests';
process.env.ENCRYPTION_KEY = 'test-master-encryption-key-32-chars-minimum-length-required';
process.env.MONGODB_URI = 'mongodb://localhost:27017/irdd-test';

// Hook global: connexion MongoDB AVANT tous les tests
beforeAll(async () => {
    const MONGODB_URI_TEST = process.env.MONGODB_URI || 'mongodb://localhost:27017/irdd-test';
    await mongoose.connect(MONGODB_URI_TEST);
});

// Hook global: déconnexion MongoDB APRÈS tous les tests
afterAll(async () => {
    // Nettoyer base de données test
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    }
});

// Hook après chaque test: vider collections (isolation tests)
// ATTENTION: Préserve la collection 'users' pour réutiliser testUserId
afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            // Préserver users (gérés par afterAll de chaque suite de tests)
            if (key !== 'users') {
                await collections[key].deleteMany({});
            }
        }
    }
});
