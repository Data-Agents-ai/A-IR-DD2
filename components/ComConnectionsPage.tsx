import React, { useState } from 'react';
import { ConnectionPrototype, LLMConfig, RobotId } from '../types';
import { useDesignStore } from '../stores/useDesignStore';
import { Button, Card } from './UI';
import { PlusIcon, AntennaIcon, SettingsIcon, CloseIcon } from './Icons';
import { useNotifications } from '../contexts/NotificationContext';

interface ComConnectionsPageProps {
  llmConfigs: LLMConfig[];
  onNavigateToWorkflow?: () => void;
}

// Mock store for connections - à remplacer par un vrai store plus tard
const useConnectionsStore = () => {
  const [connections, setConnections] = useState<ConnectionPrototype[]>([]);
  
  const addConnection = (connection: Omit<ConnectionPrototype, 'id' | 'creator_id' | 'created_at' | 'updated_at'>) => {
    const newConnection: ConnectionPrototype = {
      ...connection,
      id: `conn-${Date.now()}`,
      creator_id: RobotId.Com,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setConnections(prev => [...prev, newConnection]);
    return { success: true, connectionId: newConnection.id };
  };
  
  const deleteConnection = (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
    return { success: true };
  };
  
  return { connections, addConnection, deleteConnection };
};

export const ComConnectionsPage: React.FC<ComConnectionsPageProps> = ({ 
  llmConfigs, 
  onNavigateToWorkflow 
}) => {
  const { addNotification } = useNotifications();
  const { connections, addConnection, deleteConnection } = useConnectionsStore();
  const { currentRobotId } = useDesignStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newConnection, setNewConnection] = useState({
    name: '',
    type: 'api' as const,
    endpoint: '',
    authType: 'bearer' as const
  });

  const handleCreateConnection = () => {
    if (!newConnection.name.trim() || !newConnection.endpoint.trim()) {
      addNotification({
        type: 'error',
        title: 'Erreur de validation',
        message: 'Le nom et l\'endpoint sont obligatoires',
        duration: 3000
      });
      return;
    }

    const result = addConnection({
      name: newConnection.name,
      type: newConnection.type,
      endpoint: newConnection.endpoint,
      authentication: {
        type: newConnection.authType,
        credentials: {}
      },
      configuration: {}
    });

    if (result.success) {
      addNotification({
        type: 'success',
        title: 'Connexion créée',
        message: `"${newConnection.name}" a été créée avec succès`,
        duration: 3000
      });
      setNewConnection({ name: '', type: 'api', endpoint: '', authType: 'bearer' });
      setIsCreating(false);
    }
  };

  const handleDeleteConnection = (id: string, name: string) => {
    const result = deleteConnection(id);
    if (result.success) {
      addNotification({
        type: 'success',
        title: 'Connexion supprimée',
        message: `"${name}" a été supprimée`,
        duration: 3000
      });
    }
  };

  const getAuthTypeColor = (type: string) => {
    switch (type) {
      case 'bearer': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'api_key': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'oauth': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'basic': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getConnectionTypeIcon = (type: string) => {
    switch (type) {
      case 'api': return '🔌';
      case 'webhook': return '🪝';
      case 'database': return '🗄️';
      case 'external_service': return '🌐';
      default: return '🔗';
    }
  };

  return (
    <div className="h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AntennaIcon className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Connexions & API</h1>
              <p className="text-gray-400 text-sm">Gestion des connexions externes et authentifications</p>
            </div>
          </div>
          
          {/* Robot Indicator */}
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-2">
            <div className="text-xs text-blue-300 font-medium">Robot Actuel</div>
            <div className="text-sm text-blue-100 font-bold">{currentRobotId}</div>
            <div className="text-xs text-blue-400">Spécialiste Connexions</div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {connections.length} connexion(s) configurée(s)
          </div>
          <div className="flex space-x-3">
            {onNavigateToWorkflow && (
              <Button 
                onClick={onNavigateToWorkflow}
                className="flex items-center space-x-2"
                variant="secondary"
              >
                <span>🗺️</span>
                <span>Voir Workflows</span>
              </Button>
            )}
            <Button 
              onClick={() => setIsCreating(true)}
              className="flex items-center space-x-2"
              variant="primary"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Nouvelle Connexion</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        
        {/* Create New Connection */}
        {isCreating && (
          <Card className="p-6 border border-blue-500/30 bg-blue-500/5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <PlusIcon className="w-5 h-5" />
              <span>Nouvelle Connexion</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom</label>
                <input
                  type="text"
                  value={newConnection.name}
                  onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="Ex: API OpenAI"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select
                  value={newConnection.type}
                  onChange={(e) => setNewConnection({ ...newConnection, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="api">API REST</option>
                  <option value="webhook">Webhook</option>
                  <option value="database">Base de données</option>
                  <option value="external_service">Service externe</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Endpoint</label>
                <input
                  type="url"
                  value={newConnection.endpoint}
                  onChange={(e) => setNewConnection({ ...newConnection, endpoint: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="https://api.exemple.com/v1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Authentification</label>
                <select
                  value={newConnection.authType}
                  onChange={(e) => setNewConnection({ ...newConnection, authType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="oauth">OAuth 2.0</option>
                  <option value="basic">Basic Auth</option>
                  <option value="none">Aucune</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setIsCreating(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateConnection} className="bg-blue-600 hover:bg-blue-700">
                Créer Connexion
              </Button>
            </div>
          </Card>
        )}

        {/* Connections List */}
        {connections.length === 0 && !isCreating ? (
          <Card className="p-8 text-center text-gray-400">
            <AntennaIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Aucune connexion configurée</h3>
            <p className="mb-4">Créez votre première connexion API pour commencer</p>
            <Button 
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Première Connexion
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {connections.map((connection) => (
              <Card key={connection.id} className="p-4 border-l-4 border-blue-500 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getConnectionTypeIcon(connection.type)}</span>
                    <div>
                      <h3 className="font-medium text-white">{connection.name}</h3>
                      <p className="text-xs text-gray-400 capitalize">{connection.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteConnection(connection.id, connection.name)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Endpoint:</span>
                    <p className="text-gray-300 truncate font-mono text-xs">{connection.endpoint}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Auth:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getAuthTypeColor(connection.authentication.type)}`}>
                      {connection.authentication.type}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                    Créé le {new Date(connection.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};