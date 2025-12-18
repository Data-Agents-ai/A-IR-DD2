import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config/environment';

// SOLID: Dependency Injection - récupérer les secrets depuis config centralisée
const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRATION = config.jwt.expiration;
const REFRESH_SECRET = config.jwt.refreshSecret;
const REFRESH_EXPIRATION = config.jwt.refreshExpiration;

if (!JWT_SECRET || !REFRESH_SECRET) {
    throw new Error('JWT secrets not configured - check your .env file');
}

export interface JWTPayload {
    sub: string; // User ID
    email: string;
    role: string;
}

/**
 * Génère un access token JWT (courte durée)
 */
export const generateAccessToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION } as SignOptions);
};

/**
 * Génère un refresh token JWT (longue durée)
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRATION } as SignOptions);
};

/**
 * Vérifie et décode un access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

/**
 * Vérifie et décode un refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
    return jwt.verify(token, REFRESH_SECRET) as JWTPayload;
};
