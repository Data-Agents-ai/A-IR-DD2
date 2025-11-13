import { useState, useEffect, useCallback, useRef } from 'react';
import webSocketService from '../services/webSocketService';

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userInfo?: {
    name: string;
    color: string;
  };
  timestamp: number;
}

interface UseCollaborativeCursorReturn {
  cursors: Map<string, CursorPosition>;
  updateMyCursor: (x: number, y: number) => void;
}

export const useCollaborativeCursor = (): UseCollaborativeCursorReturn => {
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const lastUpdateTime = useRef<number>(0);
  const updateThrottle = 50; // 50ms throttle pour les curseurs

  useEffect(() => {
    const handleUserCursorUpdated = (data: { x: number; y: number; userId: string }) => {
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.set(data.userId, {
          ...data,
          timestamp: Date.now()
        });
        return newCursors;
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(data.userId);
        return newCursors;
      });
    };

    // S'abonner aux événements
    webSocketService.on('userCursorUpdated', handleUserCursorUpdated);
    webSocketService.on('userLeft', handleUserLeft);

    // Nettoyage des curseurs anciens (toutes les 5 secondes)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        const newCursors = new Map();
        prev.forEach((cursor, userId) => {
          if (now - cursor.timestamp < 10000) { // Garder pendant 10 secondes
            newCursors.set(userId, cursor);
          }
        });
        return newCursors;
      });
    }, 5000);

    // Nettoyage
    return () => {
      webSocketService.off('userCursorUpdated', handleUserCursorUpdated);
      webSocketService.off('userLeft', handleUserLeft);
      clearInterval(cleanupInterval);
    };
  }, []);

  const updateMyCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastUpdateTime.current > updateThrottle) {
      webSocketService.updateCursor(x, y);
      lastUpdateTime.current = now;
    }
  }, []);

  return {
    cursors,
    updateMyCursor,
  };
};