import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { User, IUser } from '../models/User.model';
import dotenv from 'dotenv';

// Charger .env en premier (au cas où)
dotenv.config();

// Étendre Request d'Express pour inclure user
declare global {
    namespace Express {
        interface User extends IUser { }
    }
}

/**
 * Configuration Passport JWT Strategy
 * Vérifie le token JWT dans le header Authorization: Bearer <token>
 */
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured in .env - Run: node scripts/generate-secrets.js');
}

passport.use(
    new JwtStrategy(
        {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: JWT_SECRET
        },
        async (payload, done) => {
            try {
                const user = await User.findById(payload.sub);
                if (!user || !user.isActive) {
                    return done(null, false);
                }
                return done(null, user);
            } catch (error) {
                return done(error, false);
            }
        }
    )
);

/**
 * Middleware: Requiert authentification JWT valide
 * Injecte req.user avec les données utilisateur
 */
export const requireAuth = passport.authenticate('jwt', { session: false });

/**
 * Middleware: Vérifie que l'utilisateur a l'un des rôles requis
 * @param roles Tableau de rôles autorisés (ex: ['admin', 'user'])
 */
export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const user = req.user as IUser;
        if (!roles.includes(user.role)) {
            return res.status(403).json({
                error: 'Permissions insuffisantes',
                required: roles,
                current: user.role
            });
        }

        next();
    };
};

/**
 * Middleware: Vérifie que l'utilisateur est propriétaire de la ressource
 * @param getUserIdFromRequest Fonction pour extraire l'userId de la ressource
 */
export const requireOwnership = (getUserIdFromRequest: (req: Request) => string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const user = req.user as IUser;
        const resourceUserId = getUserIdFromRequest(req);

        // Admin bypass ownership check
        if (user.id !== resourceUserId && user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès non autorisé à cette ressource' });
        }

        next();
    };
};

export default passport;
