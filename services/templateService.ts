/**
 * TemplateService - Gestion des templates d'agents
 * 
 * Responsabilités :
 * - Ajout de prototypes existants aux templates
 * - Sauvegarde/chargement des templates personnalisés
 * - Suppression de templates personnalisés
 * - Fusion avec les templates prédéfinis
 */

import { Agent, RobotId } from '../types';
import { AgentTemplate } from '../data/agentTemplates';

const CUSTOM_TEMPLATES_STORAGE_KEY = 'custom_agent_templates';

export interface CustomTemplate extends AgentTemplate {
    isCustom: true;
    sourcePrototypeId?: string; // ID du prototype d'origine si créé depuis un prototype
}

/**
 * Charger les templates personnalisés depuis le localStorage
 */
export const loadCustomTemplates = (): CustomTemplate[] => {
    try {
        const stored = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
        if (!stored) return [];

        const templates = JSON.parse(stored) as CustomTemplate[];
        return templates;
    } catch (error) {
        console.error('Erreur lors du chargement des templates personnalisés:', error);
        return [];
    }
};

/**
 * Sauvegarder les templates personnalisés dans le localStorage
 */
const saveCustomTemplates = (templates: CustomTemplate[]): boolean => {
    try {
        localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des templates:', error);
        return false;
    }
};

/**
 * Ajouter un prototype existant aux templates
 * 
 * PRINCIPE: Clone complet du prototype (valeurs, pas référence)
 * Le template est une COPIE INDÉPENDANTE du prototype
 * 
 * @param prototype - Le prototype à convertir en template
 * @param customName - Nom personnalisé optionnel pour le template
 * @param customDescription - Description personnalisée optionnelle
 * @returns Le template créé ou null en cas d'erreur
 */
export const addPrototypeToTemplates = (
    prototype: Agent,
    customName?: string,
    customDescription?: string
): CustomTemplate | null => {
    try {
        // Validation
        if (!prototype || !prototype.id) {
            console.error('Prototype invalide');
            return null;
        }

        // Charger les templates existants
        const existingTemplates = loadCustomTemplates();

        // Vérifier si un template existe déjà pour ce prototype
        const existingIndex = existingTemplates.findIndex(t => t.sourcePrototypeId === prototype.id);

        if (existingIndex !== -1) {
            console.warn('Un template existe déjà pour ce prototype');
            return null;
        }

        // Déterminer la catégorie en fonction du rôle
        const category: CustomTemplate['category'] = determineCategory(prototype.role, prototype.systemPrompt);

        // Déterminer l'icône en fonction du nom/rôle
        const icon = determineIcon(prototype.name, prototype.role);

        // Créer le template (COPIE PROFONDE pour éviter les références)
        const newTemplate: CustomTemplate = {
            id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: customName || `Template: ${prototype.name}`,
            description: customDescription || `Template créé depuis le prototype "${prototype.name}"`,
            category: category,
            robotId: prototype.creator_id || RobotId.Archi,
            icon: icon,
            isCustom: true,
            sourcePrototypeId: prototype.id,
            template: {
                // Clone profond de toutes les propriétés (pas de référence)
                name: prototype.name,
                role: prototype.role,
                systemPrompt: prototype.systemPrompt,
                llmProvider: prototype.llmProvider,
                model: prototype.model,
                capabilities: [...prototype.capabilities], // Copie du tableau
                tools: prototype.tools.map(tool => ({
                    // Copie profonde de chaque tool
                    name: tool.name,
                    description: tool.description,
                    parameters: JSON.parse(JSON.stringify(tool.parameters)) // Clone profond de l'objet parameters
                })),
                outputConfig: { ...prototype.outputConfig }, // Copie de l'objet outputConfig
                historyConfig: prototype.historyConfig ? {
                    ...prototype.historyConfig,
                    // Clone des propriétés imbriquées si elles existent
                } : undefined as any
            }
        };

        // Ajouter à la liste
        const updatedTemplates = [...existingTemplates, newTemplate];

        // Sauvegarder
        const saved = saveCustomTemplates(updatedTemplates);

        if (!saved) {
            console.error('Échec de la sauvegarde du template');
            return null;
        }

        return newTemplate;
    } catch (error) {
        console.error('Erreur lors de l\'ajout du prototype aux templates:', error);
        return null;
    }
};

/**
 * Supprimer un template personnalisé
 * 
 * @param templateId - ID du template à supprimer
 * @returns true si supprimé avec succès, false sinon
 */
export const deleteCustomTemplate = (templateId: string): boolean => {
    try {
        const templates = loadCustomTemplates();
        const filteredTemplates = templates.filter(t => t.id !== templateId);

        if (templates.length === filteredTemplates.length) {
            console.warn('Template non trouvé');
            return false;
        }

        return saveCustomTemplates(filteredTemplates);
    } catch (error) {
        console.error('Erreur lors de la suppression du template:', error);
        return false;
    }
};

/**
 * Mettre à jour un template personnalisé
 * 
 * @param templateId - ID du template à mettre à jour
 * @param updates - Champs à mettre à jour
 * @returns true si mis à jour avec succès, false sinon
 */
export const updateCustomTemplate = (
    templateId: string,
    updates: Partial<Pick<CustomTemplate, 'name' | 'description' | 'category' | 'icon'>>
): boolean => {
    try {
        const templates = loadCustomTemplates();
        const index = templates.findIndex(t => t.id === templateId);

        if (index === -1) {
            console.warn('Template non trouvé');
            return false;
        }

        templates[index] = {
            ...templates[index],
            ...updates
        };

        return saveCustomTemplates(templates);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du template:', error);
        return false;
    }
};

/**
 * Obtenir tous les templates (prédéfinis + personnalisés)
 * 
 * @param predefinedTemplates - Templates prédéfinis depuis agentTemplates.ts
 * @returns Liste fusionnée des templates
 */
export const getAllTemplates = (predefinedTemplates: AgentTemplate[]): AgentTemplate[] => {
    const customTemplates = loadCustomTemplates();
    return [...predefinedTemplates, ...customTemplates];
};

/**
 * Déterminer la catégorie d'un agent en fonction de son rôle et prompt
 */
const determineCategory = (role: string, systemPrompt: string): CustomTemplate['category'] => {
    const text = `${role} ${systemPrompt}`.toLowerCase();

    if (text.includes('automat') || text.includes('workflow') || text.includes('script')) {
        return 'automation';
    }
    if (text.includes('analys') || text.includes('data') || text.includes('stat')) {
        return 'analysis';
    }
    if (text.includes('specialist') || text.includes('expert') || text.includes('senior')) {
        return 'specialist';
    }

    return 'assistant'; // Défaut
};

/**
 * Déterminer l'icône d'un agent en fonction de son nom et rôle
 */
const determineIcon = (name: string, role: string): string => {
    const text = `${name} ${role}`.toLowerCase();

    // Catégories techniques
    if (text.includes('code') || text.includes('develop')) return '💻';
    if (text.includes('data') || text.includes('analys')) return '📊';
    if (text.includes('design') || text.includes('ui')) return '🎨';
    if (text.includes('test') || text.includes('qa')) return '🧪';
    if (text.includes('security') || text.includes('secur')) return '🔒';
    if (text.includes('api') || text.includes('integration')) return '🔌';
    if (text.includes('database') || text.includes('sql')) return '🗄️';
    if (text.includes('cloud') || text.includes('devops')) return '☁️';
    if (text.includes('automat')) return '🤖';
    if (text.includes('market')) return '📈';
    if (text.includes('content') || text.includes('writ')) return '✍️';
    if (text.includes('support') || text.includes('help')) return '🆘';
    if (text.includes('research') || text.includes('search')) return '🔍';

    return '⭐'; // Défaut
};

/**
 * Exporter les templates personnalisés vers un fichier JSON
 * 
 * @returns JSON string des templates personnalisés
 */
export const exportCustomTemplates = (): string => {
    const templates = loadCustomTemplates();
    return JSON.stringify(templates, null, 2);
};

/**
 * Importer des templates depuis un fichier JSON
 * 
 * @param jsonString - JSON string contenant les templates
 * @returns Nombre de templates importés
 */
export const importCustomTemplates = (jsonString: string): number => {
    try {
        const importedTemplates = JSON.parse(jsonString) as CustomTemplate[];

        if (!Array.isArray(importedTemplates)) {
            throw new Error('Format invalide');
        }

        const existingTemplates = loadCustomTemplates();

        // Filtrer les doublons (même sourcePrototypeId)
        const newTemplates = importedTemplates.filter(imported =>
            !existingTemplates.some(existing =>
                existing.sourcePrototypeId === imported.sourcePrototypeId
            )
        );

        const mergedTemplates = [...existingTemplates, ...newTemplates];
        saveCustomTemplates(mergedTemplates);

        return newTemplates.length;
    } catch (error) {
        console.error('Erreur lors de l\'importation des templates:', error);
        return 0;
    }
};
