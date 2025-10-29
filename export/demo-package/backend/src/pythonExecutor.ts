// backend/src/pythonExecutor.ts
// FIX: Removed the triple-slash directive for node types and added a manual declaration for `__dirname`.
// The `/// <reference types="node" />` directive was causing a "Cannot find type definition file for 'node'" error,
// likely due to an issue with the build environment's type resolution.
// Since this project runs in a CommonJS Node.js environment, `__dirname` is a globally available variable.
// By declaring it manually, we inform TypeScript of its existence and resolve the "Cannot find name '__dirname'" error
// without relying on the broken type reference.
declare const __dirname: string;

import { spawn } from 'child_process';
import path from 'path';
import { WHITELISTED_PYTHON_TOOLS } from './config';

// The manual calculation of __dirname using ESM features (import.meta.url) has been removed.
// This project is configured as a CommonJS module (see tsconfig.json),
// where `__dirname` is a globally available variable. The previous code created a module-type conflict,
// causing the 'exports is not defined' error.

export const executePythonTool = (toolName: string, args: object): Promise<object> => {
    return new Promise((resolve, reject) => {
        if (!WHITELISTED_PYTHON_TOOLS.includes(toolName)) {
            return reject(new Error(`Tool '${toolName}' is not whitelisted for execution.`));
        }

        // Resolve the path from the current file's directory to the project root, then to the utils folder.
        // This now correctly uses the __dirname provided by the CommonJS environment.
        const scriptPath = path.join(__dirname, `../../../utils/pythonTools/${toolName}.py`);
        const argsJsonString = JSON.stringify(args);

        const pythonProcess = spawn('python3', [scriptPath, argsJsonString]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}. Stderr: ${stderrData}`);
                // Try to parse error from stderr if it's JSON, otherwise use the raw string
                try {
                    const errorJson = JSON.parse(stderrData);
                    return reject(new Error(errorJson.error || `Python script for '${toolName}' failed.`));
                } catch(e) {
                     return reject(new Error(stderrData || `Python script for '${toolName}' failed with exit code ${code}.`));
                }
            }
            if (stderrData) {
                console.warn(`Python script for '${toolName}' wrote to stderr but exited with code 0: ${stderrData}`);
            }
            try {
                const result = JSON.parse(stdoutData);
                resolve(result);
            } catch (error) {
                console.error(`Failed to parse JSON output from python script '${toolName}'. Output: ${stdoutData}`);
                reject(new Error(`Failed to parse JSON output from python script '${toolName}'.`));
            }
        });
        
        pythonProcess.on('error', (err) => {
             console.error(`Failed to start python process for '${toolName}'. Error: ${err.message}`);
             reject(new Error(`Failed to start python process for '${toolName}'. Is Python 3 installed and in your PATH?`));
        });
    });
};
