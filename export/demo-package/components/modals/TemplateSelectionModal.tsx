import React, { useState } from 'react';
import { AgentTemplate, AGENT_TEMPLATES, getTemplatesByRobot, createAgentFromTemplate } from '../../data/agentTemplates';
import { RobotId } from '../../types';
import { Button } from '../UI';
import { CloseIcon } from '../Icons';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  robotId?: RobotId;
  onSelectTemplate: (template: AgentTemplate) => void;
  onCancel: () => void;
}

export const TemplateSelectionModal: React.FC<TemplateSelectionModalProps> = ({
  isOpen,
  robotId,
  onSelectTemplate,
  onCancel
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Filtrer les templates selon le robot sélectionné
  let availableTemplates = robotId 
    ? getTemplatesByRobot(robotId)
    : AGENT_TEMPLATES;

  // Filtrer par catégorie
  if (selectedCategory !== 'all') {
    availableTemplates = availableTemplates.filter(template => template.category === selectedCategory);
  }

  // Filtrer par recherche
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    availableTemplates = availableTemplates.filter(template =>
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query)
    );
  }

  const categories = [
    { key: 'all', label: 'Tous', count: robotId ? getTemplatesByRobot(robotId).length : AGENT_TEMPLATES.length },
    { key: 'assistant', label: 'Assistants', count: (robotId ? getTemplatesByRobot(robotId) : AGENT_TEMPLATES).filter(t => t.category === 'assistant').length },
    { key: 'specialist', label: 'Spécialistes', count: (robotId ? getTemplatesByRobot(robotId) : AGENT_TEMPLATES).filter(t => t.category === 'specialist').length },
    { key: 'automation', label: 'Automatisation', count: (robotId ? getTemplatesByRobot(robotId) : AGENT_TEMPLATES).filter(t => t.category === 'automation').length },
    { key: 'analysis', label: 'Analyse', count: (robotId ? getTemplatesByRobot(robotId) : AGENT_TEMPLATES).filter(t => t.category === 'analysis').length }
  ].filter(cat => cat.count > 0);

  const getRobotColor = (robotId: RobotId) => {
    switch (robotId) {
      case RobotId.Archi: return 'text-purple-400 bg-purple-900/30 border-purple-500';
      case RobotId.Bos: return 'text-blue-400 bg-blue-900/30 border-blue-500';
      case RobotId.Com: return 'text-green-400 bg-green-900/30 border-green-500';
      case RobotId.Phil: return 'text-yellow-400 bg-yellow-900/30 border-yellow-500';
      case RobotId.Tim: return 'text-red-400 bg-red-900/30 border-red-500';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] mx-4 shadow-2xl border border-gray-600 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Choisir un template d'agent</h2>
            {robotId && (
              <p className="text-gray-400 mt-1">Templates pour le robot {robotId}</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher un template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {category.label} ({category.count})
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto">
          {availableTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">Aucun template trouvé</div>
              <p className="text-gray-500 mt-2">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-indigo-500 transition-colors cursor-pointer group"
                  onClick={() => onSelectTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                          {template.name}
                        </h3>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRobotColor(template.robotId)}`}>
                          {template.robotId}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      template.category === 'assistant' ? 'bg-blue-900/30 text-blue-400' :
                      template.category === 'specialist' ? 'bg-purple-900/30 text-purple-400' :
                      template.category === 'automation' ? 'bg-orange-900/30 text-orange-400' :
                      'bg-green-900/30 text-green-400'
                    }`}>
                      {template.category === 'assistant' ? 'Assistant' :
                       template.category === 'specialist' ? 'Spécialiste' :
                       template.category === 'automation' ? 'Automatisation' :
                       'Analyse'}
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">
                        {template.template.llmProvider}
                      </span>
                      {template.template.tools && template.template.tools.length > 0 && (
                        <span className="text-xs text-indigo-400">
                          🛠️ {template.template.tools.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-4 border-t border-gray-600">
          <Button
            onClick={onCancel}
            variant="secondary"
          >
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
};