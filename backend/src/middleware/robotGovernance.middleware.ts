/**
 * Robot Governance Middleware
 * Valide que le creatorId dans le body correspond aux règles métier
 */
import { Request, Response, NextFunction } from 'express';
import { canCreateResource, isValidRobotId, RobotId } from '../constants/robots';

/**
 * Middleware: Valide que le creatorId a le droit de créer le type de ressource
 * @param resourceType - Type de ressource à créer ('agent', 'connection', etc.)
 */
export const validateRobotPermission = (resourceType: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { creatorId } = req.body;

        // 1. Vérifier format RobotId
        if (!creatorId || !isValidRobotId(creatorId)) {
            return res.status(400).json({
                error: 'Validation échouée',
                details: [{
                    field: 'creatorId',
                    message: `RobotId invalide. Attendu: AR_001, BOS_001, COM_001, PHIL_001, ou TIM_001`,
                    code: 'INVALID_ROBOT_ID'
                }]
            });
        }

        // 2. Vérifier permissions métier
        if (!canCreateResource(creatorId as RobotId, resourceType)) {
            return res.status(403).json({
                error: 'Permission refusée',
                message: `Le robot ${creatorId} n'est pas autorisé à créer des ressources de type '${resourceType}'`,
                code: 'ROBOT_PERMISSION_DENIED'
            });
        }

        // 3. Validation OK → Continuer
        next();
    };
};
