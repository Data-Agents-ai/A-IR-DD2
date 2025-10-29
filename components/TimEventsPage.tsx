import React, { useState } from 'react';
import { EventPrototype, LLMConfig, RobotId } from '../types';
import { useDesignStore } from '../stores/useDesignStore';
import { Button, Card } from './UI';
import { PlusIcon, ClockIcon, SettingsIcon, CloseIcon } from './Icons';
import { useNotifications } from '../contexts/NotificationContext';

interface TimEventsPageProps {
  llmConfigs: LLMConfig[];
  onNavigateToWorkflow?: () => void;
}

// Mock store for event prototypes - à remplacer par un vrai store plus tard
const useEventsStore = () => {
  const [events, setEvents] = useState<EventPrototype[]>([]);
  
  const addEvent = (event: Omit<EventPrototype, 'id' | 'creator_id' | 'created_at' | 'updated_at'>) => {
    const newEvent: EventPrototype = {
      ...event,
      id: `event-${Date.now()}`,
      creator_id: RobotId.Tim,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setEvents(prev => [...prev, newEvent]);
    return { success: true, eventId: newEvent.id };
  };
  
  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    return { success: true };
  };
  
  return { events, addEvent, deleteEvent };
};

export const TimEventsPage: React.FC<TimEventsPageProps> = ({ 
  llmConfigs, 
  onNavigateToWorkflow 
}) => {
  const { addNotification } = useNotifications();
  const { events, addEvent, deleteEvent } = useEventsStore();
  const { currentRobotId } = useDesignStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    type: 'trigger' as const,
    schedule: '',
    conditions: {},
    rateLimit: { max_calls: 100, time_window: 3600 }
  });

  const handleCreateEvent = () => {
    if (!newEvent.name.trim()) {
      addNotification({
        type: 'error',
        title: 'Erreur de validation',
        message: 'Le nom de l\'événement est obligatoire',
        duration: 3000
      });
      return;
    }

    if (newEvent.type === 'scheduler' && !newEvent.schedule.trim()) {
      addNotification({
        type: 'error',
        title: 'Erreur de validation',
        message: 'La planification est obligatoire pour un événement planifié',
        duration: 3000
      });
      return;
    }

    const result = addEvent({
      name: newEvent.name,
      type: newEvent.type,
      schedule: newEvent.schedule || undefined,
      conditions: newEvent.conditions,
      rate_limit: newEvent.rateLimit
    });

    if (result.success) {
      addNotification({
        type: 'success',
        title: 'Événement créé',
        message: `"${newEvent.name}" a été créé avec succès`,
        duration: 3000
      });
      setNewEvent({ 
        name: '', 
        type: 'trigger', 
        schedule: '', 
        conditions: {}, 
        rateLimit: { max_calls: 100, time_window: 3600 } 
      });
      setIsCreating(false);
    }
  };

  const handleDeleteEvent = (id: string, name: string) => {
    const result = deleteEvent(id);
    if (result.success) {
      addNotification({
        type: 'success',
        title: 'Événement supprimé',
        message: `"${name}" a été supprimé`,
        duration: 3000
      });
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'scheduler': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'webhook': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'conditional': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'trigger': return '⚡';
      case 'scheduler': return '📅';
      case 'webhook': return '🪝';
      case 'conditional': return '🔀';
      default: return '⏰';
    }
  };

  const formatSchedule = (schedule: string) => {
    if (!schedule) return 'Aucune';
    // Simplification d'affichage pour les expressions cron
    if (schedule.includes('* * * * *')) return 'Chaque minute';
    if (schedule.includes('0 * * * *')) return 'Chaque heure';
    if (schedule.includes('0 0 * * *')) return 'Chaque jour';
    if (schedule.includes('0 0 * * 0')) return 'Chaque semaine';
    return schedule;
  };

  const formatRateLimit = (rateLimit?: { max_calls: number; time_window: number }) => {
    if (!rateLimit) return 'Aucune';
    const hours = rateLimit.time_window / 3600;
    return `${rateLimit.max_calls} calls/${hours}h`;
  };

  return (
    <div className="h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ClockIcon className="w-8 h-8 text-yellow-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Événements & Planification</h1>
              <p className="text-gray-400 text-sm">Gestion temporelle des triggers et événements automatisés</p>
            </div>
          </div>
          
          {/* Robot Indicator */}
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-4 py-2">
            <div className="text-xs text-yellow-300 font-medium">Robot Actuel</div>
            <div className="text-sm text-yellow-100 font-bold">{currentRobotId}</div>
            <div className="text-xs text-yellow-400">Spécialiste Temporel</div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {events.length} événement(s) configuré(s)
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
              <span>Nouvel Événement</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        
        {/* Create New Event */}
        {isCreating && (
          <Card className="p-6 border border-yellow-500/30 bg-yellow-500/5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <PlusIcon className="w-5 h-5" />
              <span>Nouvel Événement</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                  placeholder="Ex: Backup quotidien"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type d'événement</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="trigger">Trigger manuel</option>
                  <option value="scheduler">Planifié (cron)</option>
                  <option value="webhook">Webhook</option>
                  <option value="conditional">Conditionnel</option>
                </select>
              </div>
              
              {newEvent.type === 'scheduler' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Expression cron</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newEvent.schedule}
                      onChange={(e) => setNewEvent({ ...newEvent, schedule: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 font-mono"
                      placeholder="0 9 * * 1-5"
                    />
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setNewEvent({ ...newEvent, schedule: '0 * * * *' })}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                        title="Chaque heure"
                      >
                        1h
                      </button>
                      <button
                        onClick={() => setNewEvent({ ...newEvent, schedule: '0 0 * * *' })}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                        title="Chaque jour"
                      >
                        1j
                      </button>
                      <button
                        onClick={() => setNewEvent({ ...newEvent, schedule: '0 0 * * 0' })}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                        title="Chaque semaine"
                      >
                        1s
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Format: minute heure jour mois jour-semaine</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Limite max appels</label>
                <input
                  type="number"
                  value={newEvent.rateLimit.max_calls}
                  onChange={(e) => setNewEvent({ 
                    ...newEvent, 
                    rateLimit: { ...newEvent.rateLimit, max_calls: parseInt(e.target.value) || 100 }
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-yellow-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Fenêtre temporelle (heures)</label>
                <input
                  type="number"
                  value={newEvent.rateLimit.time_window / 3600}
                  onChange={(e) => setNewEvent({ 
                    ...newEvent, 
                    rateLimit: { ...newEvent.rateLimit, time_window: (parseInt(e.target.value) || 1) * 3600 }
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-yellow-500"
                  min="1"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setIsCreating(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateEvent} className="bg-yellow-600 hover:bg-yellow-700">
                Créer Événement
              </Button>
            </div>
          </Card>
        )}

        {/* Events List */}
        {events.length === 0 && !isCreating ? (
          <Card className="p-8 text-center text-gray-400">
            <ClockIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Aucun événement configuré</h3>
            <p className="mb-4">Créez votre premier événement pour commencer</p>
            <Button 
              onClick={() => setIsCreating(true)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Premier Événement
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {events.map((event) => (
              <Card key={event.id} className="p-4 border-l-4 border-yellow-500 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getEventTypeIcon(event.type)}</span>
                    <div>
                      <h3 className="font-medium text-white">{event.name}</h3>
                      <p className="text-xs text-gray-400 capitalize">{event.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(event.id, event.name)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getEventTypeColor(event.type)}`}>
                      {event.type}
                    </span>
                  </div>
                  
                  {event.schedule && (
                    <div>
                      <span className="text-gray-400">Planning:</span>
                      <p className="text-gray-300 font-mono text-xs">{formatSchedule(event.schedule)}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Limite:</span>
                    <span className="text-gray-300 text-xs">{formatRateLimit(event.rate_limit)}</span>
                  </div>
                  
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                    Créé le {new Date(event.created_at).toLocaleDateString('fr-FR')}
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