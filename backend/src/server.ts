// backend/src/server.ts
// FIX: Explicitly import Request and Response from 'express' to resolve conflicts with global types and fix type errors in route handlers.
import express, { Request, Response } from 'express';
import cors from 'cors';
import { executePythonTool } from './pythonExecutor';

const app = express();
const port = 3001;

// Enable CORS for requests from the frontend's default development port
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('LLM Agent Workflow Backend is running.');
});

app.post('/api/execute-python-tool', async (req: Request, res: Response) => {
    const { toolName, args } = req.body;

    if (typeof toolName !== 'string' || typeof args !== 'object' || args === null) {
        return res.status(400).json({ success: false, error: 'Invalid request body. "toolName" (string) and "args" (object) are required.' });
    }

    try {
        const result = await executePythonTool(toolName, args);
        res.json({ success: true, result });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during tool execution.';
        console.error(`Error executing tool '${toolName}':`, errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});

app.listen(port, () => {
    console.log(`Backend server for Python tool execution is running at http://localhost:${port}`);
});