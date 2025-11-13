import React, { useState } from 'react';
import { RobotMenuItem, RobotId } from '../types';
import { IconMenuItem } from './IconMenuItem';
import { ArchiSubMenu } from './ArchiSubMenu';
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
  position?: { top: number; left: number };
}

const RobotSubMenu: React.FC<RobotSubMenuProps> = ({
  robotName,
  nestedItems,
  currentPath,
  onNavigate,
  onClose,
  position = { top: 0, left: 64 }
}) => {
  const { t } = useLocalization();

  return (
    <div
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl min-w-[240px]"
      style={{
        top: `${position?.top || 0}px`,
        left: `${position?.left || 64}px`,
        // Style laser/gaming uniforme avec ArchiSubMenu
        background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
        borderColor: '#4f46e5',
        boxShadow: '0 0 20px rgba(79, 70, 229, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Header du submenu */}
      <div className="px-4 py-3 border-b border-gray-600">
        <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide">
          {t(robotName)}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {t('robot_specialization')}
        </p>
      </div>

      {/* Items de navigation */}
      <div className="py-2">
        {nestedItems.map((item) => {
          const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
          const IconComponent = item.iconComponent;

          return (
            <button
              key={item.path}
              onClick={() => {
                onNavigate(item.id, item.path);
                onClose();
              }}
              className={`
                w-full px-4 py-3 flex items-center space-x-3 text-left transition-all duration-200
                hover:bg-indigo-500/20 hover:border-l-2 hover:border-indigo-400
                ${isActive
                  ? 'bg-indigo-500/30 border-l-2 border-indigo-400 text-indigo-300'
                  : 'text-gray-300 hover:text-white'
                }
              `}
            >
              {/* Icône */}
              <div className={`
                w-5 h-5 flex-shrink-0 transition-colors duration-200
                ${isActive ? 'text-indigo-400' : 'text-gray-400'}
              `}>
                {IconComponent && <IconComponent />}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className={`
                  text-sm font-medium transition-colors duration-200
                  ${isActive ? 'text-indigo-300' : 'text-gray-300'}
                `}>
                  {t(item.name)}
                </div>
                {item.description && (
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {t(item.description)}
                  </div>
                )}
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="w-2 h-2 bg-indigo-400 rounded-full flex-shrink-0"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer avec info robot */}
      <div className="px-4 py-2 border-t border-gray-600 bg-gray-900/50">
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <span>{t(robotName)}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
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

    // ARCHI SPECIAL CASE: selon le plan architectural V2
    // ArchiSubMenu doit être rendu uniquement pour Archi en position absolue
    if (robotId === RobotId.Archi && robot && robot.nestedItems && robot.nestedItems.length > 0) {
      setActiveSubMenuRobot(activeSubMenuRobot === robotId ? null : robotId);
      return;
    }

    // For other robots with nested items, use standard submenu
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
      {robotMenuData.map((robot, index) => {
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

            {/* ARCHI SPECIALIZED SUBMENU - Selon plan architectural V2 */}
            {robot.id === RobotId.Archi && isSubMenuOpen && hasSubMenu && (
              <ArchiSubMenu
                nestedItems={robot.nestedItems}
                currentPath={currentPath}
                onNavigate={handleSubNavigation}
                onClose={closeSubMenu}
                position={{
                  top: index * 56 + 16, // Position relative à l'item parent
                  left: 64 // Adjacent à la sidebar (width: 64px)
                }}
              />
            )}

            {/* Standard Robot SubMenu pour les autres robots */}
            {robot.id !== RobotId.Archi && hasSubMenu && isSubMenuOpen && (
              <RobotSubMenu
                robotName={robot.name}
                nestedItems={robot.nestedItems}
                currentPath={currentPath}
                onNavigate={handleSubNavigation}
                onClose={closeSubMenu}
                position={{
                  top: index * 56 + 16, // Position relative à l'item parent
                  left: 64 // Adjacent à la sidebar (width: 64px)
                }}
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