/**
 * Constantes Robot Governance
 * Définit les RobotIds et leurs mandats métier
 */

export const ROBOT_IDS = {
    ARCHI: 'AR_001',
    BOS: 'BOS_001',
    COM: 'COM_001',
    PHIL: 'PHIL_001',
    TIM: 'TIM_001'
} as const;

export type RobotId = typeof ROBOT_IDS[keyof typeof ROBOT_IDS];

/**
 * Règles de gouvernance : Quel Robot peut créer quel type de ressource
 */
export const ROBOT_RESOURCE_PERMISSIONS = {
    [ROBOT_IDS.ARCHI]: ['agent', 'orchestration'], // Seul Archi crée des Agents
    [ROBOT_IDS.BOS]: ['workflow', 'supervision'],
    [ROBOT_IDS.COM]: ['connection', 'api', 'authentication'],
    [ROBOT_IDS.PHIL]: ['transformation', 'file', 'validation'],
    [ROBOT_IDS.TIM]: ['event', 'trigger', 'schedule', 'rate-limit']
} as const;

/**
 * Validation métier : Vérifie si un Robot a le droit de créer une ressource
 */
export function canCreateResource(robotId: RobotId, resourceType: string): boolean {
    const permissions = ROBOT_RESOURCE_PERMISSIONS[robotId];
    return permissions ? (permissions as readonly string[]).includes(resourceType) : false;
}

/**
 * Validation format RobotId
 */
export function isValidRobotId(robotId: string): robotId is RobotId {
    return Object.values(ROBOT_IDS).includes(robotId as RobotId);
}
