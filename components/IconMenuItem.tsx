import React from 'react';
import { RobotMenuItem, RobotId } from '../types';
import { useLocalization } from '../hooks/useLocalization';

interface IconMenuItemProps {
  item: RobotMenuItem;
  isActive: boolean;
  onItemClick: (robotId: RobotId, path: string) => void;
  className?: string;
}

export const IconMenuItem: React.FC<IconMenuItemProps> = ({ 
  item, 
  isActive, 
  onItemClick, 
  className = '' 
}) => {
  const { t } = useLocalization();
  const IconComponent = item.iconComponent;

  const handleClick = () => {
    onItemClick(item.id, item.path);
  };

  return (
    <div
      className={`
        relative group cursor-pointer
        w-12 h-12 rounded-lg
        flex items-center justify-center
        transition-all duration-200
        ${isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
        }
        ${className}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {IconComponent && <IconComponent className="w-6 h-6" />}
      
      {/* Tooltip */}
      <div className="absolute left-16 bg-gray-900 text-white text-sm px-2 py-1 rounded shadow-lg
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      pointer-events-none whitespace-nowrap z-50">
        {item.name}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1
                        border-4 border-transparent border-r-gray-900"></div>
      </div>
    </div>
  );
};