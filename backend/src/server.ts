import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketManager } from './websocket/WebSocketManager';
import { spawn } from 'child_process';
import path from 'path';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import lmstudioRoutes from './routes/lmstudio.routes';

// Charger variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ===== SECURITY MIDDLEWARE =====
// Helmet: Sécurise les headers HTTP
app.use(helmet());

// MongoDB query sanitization (prévention injection NoSQL)
app.use(mongoSanitize());

// Configuration CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Routes proxy LMStudio
app.use('/api/lmstudio', lmstudioRoutes);

// Route pour exécuter les outils Python
app.post('/api/execute-python-tool', async (req, res) => {
  try {
    const { toolName, args } = req.body;

    if (!toolName || !args) {
      return res.status(400).json({ error: 'toolName et args requis' });
    }

    const pythonPath = path.join(__dirname, '../../utils/pythonTools', `${toolName}.py`);
    const argsString = JSON.stringify(args);

    const pythonProcess = spawn('python3', [pythonPath, argsString]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({
          error: 'Erreur d\'exécution Python',
          stderr: stderr
        });
      }

      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (parseError) {
        res.status(500).json({
          error: 'Erreur de parsing JSON',
          output: stdout
        });
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erreur serveur',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Créer le serveur HTTP
const httpServer = createServer(app);

// Initialiser WebSocket
const wsManager = new WebSocketManager(httpServer);

// ===== DÉMARRAGE DU SERVEUR =====
async function startServer() {
  try {
    // Tentative connexion MongoDB (non-bloquante pour Jalon 1)
    try {
      await connectDatabase();
    } catch (dbError) {
      console.warn('⚠️  MongoDB non disponible - Mode Guest uniquement');
      console.warn('   Pour activer le mode Authenticated, démarrer MongoDB :');
      console.warn('   - Windows: Installer MongoDB Community Server');
      console.warn('   - Docker: docker run -d -p 27017:27017 --name mongodb mongo:6');
      console.warn('');
    }
    
    // Démarrer le serveur HTTP (même sans MongoDB)
    httpServer.listen(PORT, () => {
      console.log('\n✨ ===== A-IR-DD2 BACKEND DÉMARRÉ ===== ✨');
      console.log(`🚀 Serveur HTTP: http://localhost:${PORT}`);
      console.log(`📡 WebSocket prêt pour les connexions`);
      console.log(`🔐 Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ Jalon 1: Infrastructure prête (MongoDB + Encryption)`);
      console.log(`🔓 Mode Guest: OPÉRATIONNEL (Python tools, WebSocket)`);
      console.log('═══════════════════════════════════════════\n');
    });
  } catch (error) {
    console.error('💀 Erreur critique au démarrage:', error);
    process.exit(1);
  }
}// Lancer le serveur
startServer();

export { };