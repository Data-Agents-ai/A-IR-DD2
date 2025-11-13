import { RobotMenuItem, RobotId } from '../types';
import {
  HardHatIcon,
  AntennaIcon,
  MonitoringIcon,
  FileAnalysisIcon,
  ClockIcon,
  WrenchIcon,
  PlusIcon,
  SettingsIcon,
  DashboardIcon
} from '../components/Icons';

/**
 * Configuration de navigation pour les 5 robots spécialisés du système V2
 * Chaque robot a son icône distinctive et ses sous-menus correspondants à son mandat
 */
export const ROBOT_MENU_DATA: RobotMenuItem[] = [
  {
    id: RobotId.Archi,
    name: 'robot_archi_name',
    iconComponent: HardHatIcon,
    path: '/archi/prototype',
    description: 'robot_archi_description',
    nestedItems: [
      {
        id: RobotId.Archi,
        name: 'nav_prototyping',
        iconComponent: PlusIcon,
        path: '/archi/prototype',
        description: 'nav_prototyping_desc'
      }
    ]
  },
  {
    id: RobotId.Bos,
    name: 'robot_bos_name',
    iconComponent: MonitoringIcon,
    path: '/bos/dashboard',
    description: 'robot_bos_description',
    nestedItems: [
      {
        id: RobotId.Bos,
        name: 'nav_dashboard',
        iconComponent: DashboardIcon,
        path: '/bos/dashboard',
        description: 'nav_dashboard_desc'
      },
      {
        id: RobotId.Bos,
        name: 'nav_monitoring',
        iconComponent: MonitoringIcon,
        path: '/bos/monitoring',
        description: 'nav_monitoring_desc'
      },
      {
        id: RobotId.Bos,
        name: 'nav_debugging',
        iconComponent: WrenchIcon,
        path: '/bos/debugging',
        description: 'nav_debugging_desc'
      },
      {
        id: RobotId.Bos,
        name: 'nav_costs',
        iconComponent: SettingsIcon,
        path: '/bos/costs',
        description: 'nav_costs_desc'
      }
    ]
  },
  {
    id: RobotId.Com,
    name: 'robot_com_name',
    iconComponent: AntennaIcon,
    path: '/com/connections',
    description: 'robot_com_description',
    nestedItems: [
      {
        id: RobotId.Com,
        name: 'nav_connections',
        iconComponent: AntennaIcon,
        path: '/com/connections',
        description: 'nav_connections_desc'
      },
      {
        id: RobotId.Com,
        name: 'nav_authentication',
        iconComponent: SettingsIcon,
        path: '/com/auth',
        description: 'nav_authentication_desc'
      }
    ]
  },
  {
    id: RobotId.Phil,
    name: 'robot_phil_name',
    iconComponent: FileAnalysisIcon,
    path: '/phil/files',
    description: 'robot_phil_description',
    nestedItems: [
      {
        id: RobotId.Phil,
        name: 'nav_files',
        iconComponent: FileAnalysisIcon,
        path: '/phil/files',
        description: 'nav_files_desc'
      },
      {
        id: RobotId.Phil,
        name: 'nav_validation',
        iconComponent: SettingsIcon,
        path: '/phil/validation',
        description: 'nav_validation_desc'
      }
    ]
  },
  {
    id: RobotId.Tim,
    name: 'robot_tim_name',
    iconComponent: ClockIcon,
    path: '/tim/events',
    description: 'robot_tim_description',
    nestedItems: [
      {
        id: RobotId.Tim,
        name: 'nav_events',
        iconComponent: ClockIcon,
        path: '/tim/events',
        description: 'nav_events_desc'
      },
      {
        id: RobotId.Tim,
        name: 'nav_scheduling',
        iconComponent: SettingsIcon,
        path: '/tim/scheduling',
        description: 'nav_scheduling_desc'
      }
    ]
  }
];/**
 * Mapping des capacités par robot selon leur spécialisation
 */
export const ROBOT_CAPABILITIES = {
  [RobotId.Archi]: [
    { id: 'agent_creation', name: 'Création d\'agents', description: 'Définir de nouveaux prototypes d\'agents' },
    { id: 'orchestration', name: 'Orchestration', description: 'Architecture des flux de communication' },
    { id: 'governance', name: 'Gouvernance', description: 'Validation et approbation des modifications' }
  ],
  [RobotId.Bos]: [
    { id: 'supervision', name: 'Supervision', description: 'Monitoring des workflows en cours' },
    { id: 'debugging', name: 'Débogage', description: 'Analyse et résolution des erreurs' },
    { id: 'cost_monitoring', name: 'Suivi des coûts', description: 'Monitoring de l\'utilisation LLM' }
  ],
  [RobotId.Com]: [
    { id: 'api_integration', name: 'Intégrations API', description: 'Connexions vers services externes' },
    { id: 'authentication', name: 'Authentification', description: 'Gestion des accès et permissions' },
    { id: 'data_exchange', name: 'Échange de données', description: 'Protocoles de communication' }
  ],
  [RobotId.Phil]: [
    { id: 'data_transformation', name: 'Transformation', description: 'Conversion et formatage des données' },
    { id: 'validation', name: 'Validation', description: 'Vérification de conformité des données' },
    { id: 'file_handling', name: 'Gestion fichiers', description: 'Upload, processing et stockage' }
  ],
  [RobotId.Tim]: [
    { id: 'event_triggers', name: 'Déclencheurs', description: 'Configuration des événements' },
    { id: 'scheduling', name: 'Planification', description: 'Gestion des exécutions temporelles' },
    { id: 'rate_limiting', name: 'Limitation débit', description: 'Contrôle des appels API' }
  ]
};