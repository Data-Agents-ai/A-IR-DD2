#!/usr/bin/env node

/**
 * Script de nettoyage MongoDB
 * Supprime la collection 'users' pour réinitialiser le validateur de schéma
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://admin:SecurePassword123!@localhost:27017/a-ir-dd2-dev?authSource=admin';

async function cleanupDatabase() {
    const client = new MongoClient(MONGODB_URI);

    try {
        console.log('🔗 Connexion à MongoDB...');
        await client.connect();

        const db = client.db('a-ir-dd2-dev');
        
        console.log('📋 Collections actuelles:');
        const collections = await db.listCollections().toArray();
        collections.forEach(col => console.log(`  - ${col.name}`));

        // Vérifier si la collection 'users' existe
        const userCollectionExists = collections.some(col => col.name === 'users');
        
        if (userCollectionExists) {
            console.log('\n🗑️  Suppression de la collection "users"...');
            await db.collection('users').drop();
            console.log('✅ Collection "users" supprimée');
        } else {
            console.log('\n⚠️  Collection "users" n\'existe pas');
        }

        console.log('\n📋 Collections après nettoyage:');
        const collectionsAfter = await db.listCollections().toArray();
        collectionsAfter.forEach(col => console.log(`  - ${col.name}`));

        console.log('\n✅ Nettoyage terminé. Vous pouvez relancer le backend.');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

cleanupDatabase();
