# Script de préparation de la démo
# Copie tous les fichiers nécessaires en excluant les dossiers de développement et les clés API

$sourceDir = ".."
$targetDir = "demo-package"

# Supprimer le dossier cible s'il existe
if (Test-Path $targetDir) {
    Remove-Item -Path $targetDir -Recurse -Force
}

# Créer le dossier cible
New-Item -ItemType Directory -Path $targetDir

# Fichiers/dossiers à exclure (pour référence future)
# $excludeItems = @(
#     "node_modules",
#     "documentation", 
#     ".env.local",
#     ".env",
#     "export",
#     "test-*.js",
#     ".git",
#     "*.log"
# )

# Dossiers à inclure explicitement
$includeDirs = @(
    "backend",
    "components", 
    "contexts",
    "data",
    "hooks",
    "i18n", 
    "services",
    "stores",
    "utils",
    ".github"
)

# Copier les dossiers
foreach ($dir in $includeDirs) {
    $sourcePath = Join-Path $sourceDir $dir
    $targetPath = Join-Path $targetDir $dir
    
    if (Test-Path $sourcePath) {
        Write-Host "Copie du dossier: $dir"
        Copy-Item -Path $sourcePath -Destination $targetPath -Recurse -Force
        
        # Supprimer node_modules dans backend si présent
        $backendNodeModules = Join-Path $targetPath "node_modules"
        if (Test-Path $backendNodeModules) {
            Remove-Item -Path $backendNodeModules -Recurse -Force
        }
    }
}

# Fichiers racine à copier
$rootFiles = @(
    "package.json",
    "package-lock.json", 
    "tsconfig.json",
    "vite.config.ts",
    "index.html",
    "index.css",
    "index.tsx",
    "App.tsx",
    "types.ts",
    "llmModels.ts",
    "README.md",
    ".gitignore"
)

foreach ($file in $rootFiles) {
    $sourcePath = Join-Path $sourceDir $file
    $targetPath = Join-Path $targetDir $file
    
    if (Test-Path $sourcePath) {
        Write-Host "Copie du fichier: $file"
        Copy-Item -Path $sourcePath -Destination $targetPath -Force
    }
}

# Créer un fichier .env.local de template
$envTemplate = @"
# Configuration API Keys for LLM Workflow Orchestrator
# 
# REQUIRED: At least one API key must be configured for the application to work
# 
# Google Gemini (Recommended - Free tier available)
# Get your key at: https://aistudio.google.com/api-keys
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Additional LLM Providers
# Uncomment and configure as needed:

# OPENAI_API_KEY=your_openai_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here  
# MISTRAL_API_KEY=your_mistral_api_key_here
# GROK_API_KEY=your_grok_api_key_here
# PERPLEXITY_API_KEY=your_perplexity_api_key_here
# QWEN_API_KEY=your_qwen_api_key_here
# KIMI_API_KEY=your_kimi_api_key_here

# Note: The application will work with just GEMINI_API_KEY configured
# Other providers are optional and can be enabled later
"@

$envTemplate | Out-File -FilePath (Join-Path $targetDir ".env.local") -Encoding UTF8

Write-Host ""
Write-Host "✅ Préparation terminée!"
Write-Host "📁 Dossier créé: $targetDir"
Write-Host ""
Write-Host "Prochaines étapes:"
Write-Host "1. Compresser le dossier '$targetDir' en ZIP"
Write-Host "2. Le destinataire devra:"
Write-Host "   - Extraire le ZIP"
Write-Host "   - Configurer .env.local avec ses clés API" 
Write-Host "   - Exécuter: npm install"
Write-Host "   - Exécuter: cd backend; npm install; cd .."
Write-Host "   - Démarrer: npm run dev (frontend) + cd backend; npm run dev (backend)"