import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Middleware de validation Zod
 * Valide req.body contre un schéma Zod et retourne erreurs détaillées
 * @param schema Schéma Zod à valider
 */
export const validateRequest = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation échouée',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                        code: e.code
                    }))
                });
            }
            res.status(500).json({ error: 'Erreur validation interne' });
        }
    };
};
