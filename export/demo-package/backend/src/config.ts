// backend/src/config.ts

// A whitelist of Python script names (without the .py extension) that are allowed to be executed by the backend.
// This is a security measure to prevent arbitrary code execution.
export const WHITELISTED_PYTHON_TOOLS = [
    'search_web_py',
];
