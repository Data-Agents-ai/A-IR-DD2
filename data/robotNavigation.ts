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
    name: 'Archi',
    iconComponent: HardHatIcon,
    path: '/archi/prototype',
    description: 'Architecte - Créateur de prototypes d\'agents et orchestrateur du système',
    nestedItems: [
      {
        id: RobotId.Archi,
        name: 'Prototypage',
        iconComponent: PlusIcon,
        path: '/archi/prototype',
        description: 'Création et édition des prototypes d\'agents'
      }
    ]
  },
  {
    id: RobotId.Bos,
    name: 'Bos',
    iconComponent: MonitoringIcon,
    path: '/bos/dashboard',
    description: 'Superviseur - Surveillance des workflows, debugging et monitoring des coûts',
    nestedItems: [
      {
        id: RobotId.Bos,
        name: 'Dashboard',
        iconComponent: DashboardIcon,
        path: '/bos/dashboard',
        description: 'Carte globale des workflows et vue d\'ensemble des projets'
      },
      {
        id: RobotId.Bos,
        name: 'Monitoring',
        iconComponent: MonitoringIcon,
        path: '/bos/monitoring',
        description: 'Surveillance en temps réel des workflows actifs'
      },
      {
        id: RobotId.Bos,
        name: 'Debugging',
        iconComponent: WrenchIcon,
        path: '/bos/debugging',
        description: 'Diagnostic et résolution des problèmes de workflows'
      },
      {
        id: RobotId.Bos,
        name: 'Coûts',
        iconComponent: SettingsIcon,
        path: '/bos/costs',
        description: 'Analyse des coûts et optimisation des ressources'
      }
    ]
  },
  {
    id: RobotId.Com,
    name: 'Com',
    iconComponent: AntennaIcon,
    path: '/com/connections',
    description: 'Communicateur - Gestion des API, authentification et intégrations externes',
    nestedItems: [
      {
        id: RobotId.Com,
        name: 'Connexions',
        iconComponent: AntennaIcon,
        path: '/com/connections',
        description: 'Configuration des connexions API et services externes'
      },
      {
        id: RobotId.Com,
        name: 'Authentification',
        iconComponent: SettingsIcon,
        path: '/com/auth',
        description: 'Gestion des clés API et authentifications'
      }
    ]
  },
  {
    id: RobotId.Phil,
    name: 'Phil',
    iconComponent: FileAnalysisIcon,
    path: '/phil/files',
    description: 'Philatéliste - Spécialiste de transformation de données et gestion de fichiers',
    nestedItems: [
      {
        id: RobotId.Phil,
        name: 'Fichiers',
        iconComponent: FileAnalysisIcon,
        path: '/phil/files',
        description: 'Gestion et analyse des fichiers de données'
      },
      {
        id: RobotId.Phil,
        name: 'Validation',
        iconComponent: SettingsIcon,
        path: '/phil/validation',
        description: 'Validation et transformation des données'
      }
    ]
  },
  {
    id: RobotId.Tim,
    name: 'Tim',
    iconComponent: ClockIcon,
    path: '/tim/events',
    description: 'Temporel - Gestionnaire des événements, planification et contrôle des flux asynchrones',
    nestedItems: [
      {
        id: RobotId.Tim,
        name: 'Événements',
        iconComponent: ClockIcon,
        path: '/tim/events',
        description: 'Configuration des triggers et événements temporels'
      },
      {
        id: RobotId.Tim,
        name: 'Planification',
        iconComponent: SettingsIcon,
        path: '/tim/scheduling',
        description: 'Planification des tâches et gestion des calendriers'
      }
    ]
  }
];

/**
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