import React, { useState } from 'react';
import { RobotMenuItem, RobotId } from '../types';
import { IconMenuItem } from './IconMenuItem';
import { useLocalization } from '../hooks/useLocalization';

interface IconSidebarProps {
  robotMenuData: RobotMenuItem[];
  currentPath: string;
  onNavigate: (robotId: RobotId, path: string) => void;
  className?: string;
}

interface RobotSubMenuProps {
  robotName: string;
  nestedItems: RobotMenuItem[];
  currentPath: string;
  onNavigate: (robotId: RobotId, path: string) => void;
  onClose: () => void;
}

const RobotSubMenu: React.FC<RobotSubMenuProps> = ({ 
  robotName,
  nestedItems, 
  currentPath, 
  onNavigate, 
  onClose 
}) => {
  const { t } = useLocalization();

  return (
    <div className="absolute left-16 top-0 bg-gray-800 border border-gray-600 rounded-lg shadow-xl
                    min-w-48 p-2 z-50 animate-in slide-in-from-left-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-600 mb-2">
        <span className="text-sm font-semibold text-indigo-400">{robotName}</span>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white w-5 h-5 flex items-center justify-center"
        >
          ×
        </button>
      </div>
      
      {/* Menu Items */}
      <div className="space-y-1">
        {nestedItems.map((item) => {
          const isActive = currentPath.startsWith(item.path);
          const IconComponent = item.iconComponent;
          
          return (
            <div
              key={item.id}
              className={`
                flex items-center p-2 rounded cursor-pointer transition-colors
                ${isActive 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
              onClick={() => {
                onNavigate(item.id, item.path);
                onClose();
              }}
            >
              {IconComponent && <IconComponent className="w-4 h-4 mr-3" />}
              <span className="text-sm">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const IconSidebar: React.FC<IconSidebarProps> = ({ 
  robotMenuData, 
  currentPath, 
  onNavigate, 
  className = '' 
}) => {
  const [activeSubMenuRobot, setActiveSubMenuRobot] = useState<RobotId | null>(null);

  const handleItemClick = (robotId: RobotId, path: string) => {
    const robot = robotMenuData.find(r => r.id === robotId);
    
    // If robot has nested items, toggle submenu instead of direct navigation
    if (robot && robot.nestedItems && robot.nestedItems.length > 0) {
      setActiveSubMenuRobot(activeSubMenuRobot === robotId ? null : robotId);
      return;
    }
    
    // Close any open submenu
    setActiveSubMenuRobot(null);
    onNavigate(robotId, path);
  };

  const handleSubNavigation = (robotId: RobotId, path: string) => {
    onNavigate(robotId, path);
  };

  const closeSubMenu = () => {
    setActiveSubMenuRobot(null);
  };

  return (
    <aside className={`
      relative w-16 bg-gray-800 border-r border-gray-700/50 
      flex flex-col items-center py-4 space-y-3
      ${className}
    `}>
      {robotMenuData.map((robot) => {
        const isActive = currentPath.startsWith(robot.path);
        const hasSubMenu = robot.nestedItems && robot.nestedItems.length > 0;
        const isSubMenuOpen = activeSubMenuRobot === robot.id;
        
        return (
          <div key={robot.id} className="relative">
            <IconMenuItem
              item={robot}
              isActive={isActive}
              onItemClick={handleItemClick}
            />
            
            {/* Robot SubMenu */}
            {hasSubMenu && isSubMenuOpen && (
              <RobotSubMenu
                robotName={robot.name}
                nestedItems={robot.nestedItems}
                currentPath={currentPath}
                onNavigate={handleSubNavigation}
                onClose={closeSubMenu}
              />
            )}
          </div>
        );
      })}
      
      {/* Click outside to close submenu */}
      {activeSubMenuRobot && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={closeSubMenu}
        />
      )}
    </aside>
  );
};