import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { CloseIcon } from './Icons';

export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500/20 border-green-500/30 text-green-100';
      case 'error': return 'bg-red-500/20 border-red-500/30 text-red-100';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-100';
      case 'info': return 'bg-blue-500/20 border-blue-500/30 text-blue-100';
      default: return 'bg-gray-500/20 border-gray-500/30 text-gray-100';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 ${getNotificationStyles(notification.type)}`}
          style={{
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <span className="text-lg mt-0.5">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">
                  {notification.title}
                </h4>
                <p className="text-xs opacity-90">
                  {notification.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-current opacity-70 hover:opacity-100 transition-opacity"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};