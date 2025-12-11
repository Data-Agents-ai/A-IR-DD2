const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/a-ir-dd2-dev';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword123';

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

const User = mongoose.model('User', UserSchema);

async function validatePasswordHash(plainPassword, storedHash) {
    try {
        return await bcrypt.compare(plainPassword, storedHash);
    } catch (error) {
        console.error('❌ Erreur lors de la validation bcrypt:', error.message);
        return false;
    }
}

async function generatePasswordHash(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

async function fixTestUser() {
    console.log('\n🔧 Script de Diagnostic et Correction du Compte Test\n');
    console.log(`📍 MongoDB URI: ${MONGO_URI}`);
    console.log(`👤 Compte Test: ${TEST_EMAIL}`);
    console.log(`🔐 Mot de passe: ${TEST_PASSWORD}\n`);

    try {
        // Connexion MongoDB
        console.log('🔌 Connexion à MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connecté à MongoDB\n');

        // Charger l'utilisateur test
        console.log(`🔍 Recherche de ${TEST_EMAIL}...`);
        const user = await User.findOne({ email: TEST_EMAIL });

        if (!user) {
            console.log('❌ Utilisateur test non trouvé!');
            console.log('📋 Création du compte test...\n');

            const newHash = await generatePasswordHash(TEST_PASSWORD);
            const newUser = new User({
                email: TEST_EMAIL,
                password: newHash,
                role: 'user',
                isActive: true
            });

            await newUser.save();
            console.log('✅ Compte test créé avec succès!');
            console.log(`📧 Email: ${TEST_EMAIL}`);
            console.log(`🔐 Password: ${TEST_PASSWORD}`);
            console.log(`🆔 ID: ${newUser._id}\n`);
        } else {
            console.log(`✅ Utilisateur trouvé!`);
            console.log(`   🆔 ID: ${user._id}`);
            console.log(`   👥 Rôle: ${user.role}`);
            console.log(`   ✓ Actif: ${user.isActive}`);
            console.log(`   📅 Créé: ${new Date(user.createdAt).toISOString()}`);
            console.log(`   📝 Dernière maj: ${new Date(user.updatedAt).toISOString()}\n`);

            // Valider le hash
            console.log('🔐 Validation du hash bcrypt...');
            const isValid = await validatePasswordHash(TEST_PASSWORD, user.password);

            if (isValid) {
                console.log('✅ Hash valide! Le mot de passe correspond parfaitement.\n');
            } else {
                console.log('⚠️  Hash invalide! Le mot de passe NE correspond PAS.');
                console.log('🔧 Correction du hash en cours...\n');

                const newHash = await generatePasswordHash(TEST_PASSWORD);
                user.password = newHash;
                user.updatedAt = new Date();
                await user.save();

                console.log('✅ Hash mis à jour avec succès!');
                console.log(`   Hash ancien: ${user.password.substring(0, 30)}...`);
                console.log(`   Hash nouveau: ${newHash.substring(0, 30)}...\n`);

                // Re-valider
                const reValidate = await validatePasswordHash(TEST_PASSWORD, newHash);
                if (reValidate) {
                    console.log('✅ Validation du nouveau hash: SUCCÈS\n');
                } else {
                    console.log('❌ Validation du nouveau hash: ÉCHOUÉ\n');
                }
            }
        }

        console.log('━'.repeat(60));
        console.log('\n✅ SCRIPT TERMINÉ AVEC SUCCÈS!\n');
        console.log('📝 RÉSUMÉ FINAL:');
        console.log(`   Email: ${TEST_EMAIL}`);
        console.log(`   Password: ${TEST_PASSWORD}`);
        console.log(`   Status: PRÊT POUR LE TEST D'AUTHENTIFICATION ✅\n`);
        console.log('➡️  Prochaine étape: Tester la connexion via l\'application');
        console.log('   1. Lancez le frontend: npm run dev');
        console.log('   2. Allez à http://localhost:5173');
        console.log('   3. Cliquez "Connexion"');
        console.log(`   4. Entrez: ${TEST_EMAIL} / ${TEST_PASSWORD}\n`);

    } catch (error) {
        console.error('\n❌ ERREUR lors de l\'exécution du script:');
        console.error(error.message || error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Connexion MongoDB fermée\n');
    }
}

// Exécution
fixTestUser().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
