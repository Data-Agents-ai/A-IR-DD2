import React, { useState } from 'react';
import { Button, Card, Modal } from '../UI';
import { PlusIcon, EditIcon, CloseIcon, SaveIcon } from '../Icons';

interface TodoItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
}

interface TodoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TodoModal: React.FC<TodoModalProps> = ({ isOpen, onClose }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState({ title: '', description: '', priority: 'medium' as const });
  const [isCreating, setIsCreating] = useState(false);

  const handleAddTodo = () => {
    if (!newTodo.title.trim()) return;
    
    const todo: TodoItem = {
      id: `todo-${Date.now()}`,
      title: newTodo.title,
      description: newTodo.description,
      priority: newTodo.priority,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    setTodos([...todos, todo]);
    setNewTodo({ title: '', description: '', priority: 'medium' });
    setIsCreating(false);
  };

  const handleToggleStatus = (id: string) => {
    setTodos(todos.map(todo => {
      if (todo.id === id) {
        const newStatus = todo.status === 'pending' ? 'in-progress' : 
                         todo.status === 'in-progress' ? 'completed' : 'pending';
        return { ...todo, status: newStatus };
      }
      return todo;
    }));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-500/10 text-red-300';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10 text-yellow-300';
      case 'low': return 'border-green-500 bg-green-500/10 text-green-300';
      default: return 'border-gray-500 bg-gray-500/10 text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'pending': return '⏳';
      default: return '📝';
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestionnaire de Tâches" size="lg">
      <div className="space-y-6 max-h-96 overflow-y-auto">
        
        {/* Add New Todo */}
        <Card className="p-4">
          {!isCreating ? (
            <Button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center space-x-2 border-2 border-dashed border-gray-600 hover:border-indigo-500 bg-transparent hover:bg-indigo-500/10"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Nouvelle Tâche</span>
            </Button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Titre de la tâche..."
                value={newTodo.title}
                onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <textarea
                placeholder="Description (optionnelle)..."
                value={newTodo.description}
                onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <div className="flex items-center justify-between">
                <select
                  value={newTodo.priority}
                  onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as any })}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">Priorité Basse</option>
                  <option value="medium">Priorité Moyenne</option>
                  <option value="high">Priorité Haute</option>
                </select>
                <div className="flex space-x-2">
                  <Button variant="secondary" onClick={() => setIsCreating(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddTodo} className="bg-green-600 hover:bg-green-700">
                    Créer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Todo List */}
        {todos.length === 0 ? (
          <Card className="p-6 text-center text-gray-400">
            <div className="text-4xl mb-2">📝</div>
            <p>Aucune tâche créée</p>
            <p className="text-sm">Cliquez sur "Nouvelle Tâche" pour commencer</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {todos.map((todo) => (
              <Card key={todo.id} className={`p-4 border-l-4 ${getPriorityColor(todo.priority)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{getStatusIcon(todo.status)}</span>
                      <h3 className={`font-medium ${todo.status === 'completed' ? 'line-through text-gray-500' : 'text-white'}`}>
                        {todo.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                        {todo.priority.toUpperCase()}
                      </span>
                    </div>
                    {todo.description && (
                      <p className={`text-sm ${todo.status === 'completed' ? 'text-gray-500' : 'text-gray-300'}`}>
                        {todo.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Créé le {new Date(todo.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleToggleStatus(todo.id)}
                      className="p-1 text-gray-400 hover:text-indigo-400 transition-colors"
                      title="Changer le statut"
                    >
                      <SaveIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Supprimer"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};