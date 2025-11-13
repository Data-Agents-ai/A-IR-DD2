import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketManager } from './websocket/WebSocketManager';
import { spawn } from 'child_process';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

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

// Démarrer le serveur
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend démarré sur le port ${PORT}`);
  console.log(`📡 WebSocket prêt pour les connexions`);
});

export {};