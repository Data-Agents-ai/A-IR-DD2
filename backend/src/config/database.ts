import mongoose from 'mongoose';

/**
 * Configuration et connexion à MongoDB avec retry logic
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/a-ir-dd2-dev';
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 secondes

let isConnected = false;

/**
 * Options de connexion Mongoose
 */
const connectionOptions: mongoose.ConnectOptions = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Force IPv4
};

/**
 * Connecte à MongoDB avec retry automatique
 */
export async function connectDatabase(retryCount = 0): Promise<void> {
    if (isConnected) {
        console.log('📦 MongoDB déjà connecté');
        return;
    }

    try {
        console.log(`🔄 Tentative de connexion à MongoDB (${retryCount + 1}/${MAX_RETRIES})...`);

        await mongoose.connect(MONGODB_URI, connectionOptions);

        isConnected = true;
        console.log('✅ MongoDB connecté avec succès');
        console.log(`📍 URI: ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}`);

    } catch (error) {
        console.error('❌ Erreur de connexion MongoDB:', error instanceof Error ? error.message : error);

        if (retryCount < MAX_RETRIES - 1) {
            console.log(`⏳ Nouvelle tentative dans ${RETRY_DELAY / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return connectDatabase(retryCount + 1);
        } else {
            console.error('💀 Échec de connexion MongoDB après toutes les tentatives');
            console.error('   Le backend fonctionnera en mode Guest uniquement (localStorage)');
            throw new Error('MongoDB non disponible');
        }
    }
}/**
 * Déconnecte proprement de MongoDB
 */
export async function disconnectDatabase(): Promise<void> {
    if (!isConnected) {
        return;
    }

    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log('👋 MongoDB déconnecté');
    } catch (error) {
        console.error('❌ Erreur lors de la déconnexion MongoDB:', error);
        throw error;
    }
}

/**
 * Gère les événements de connexion Mongoose
 */
mongoose.connection.on('connected', () => {
    console.log('📡 Mongoose connecté au serveur MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Erreur Mongoose:', err);
    isConnected = false;
});

mongoose.connection.on('disconnected', () => {
    console.log('🔌 Mongoose déconnecté de MongoDB');
    isConnected = false;
});

/**
 * Gestion graceful shutdown
 */
process.on('SIGINT', async () => {
    await disconnectDatabase();
    process.exit(0);
});

export { isConnected };
