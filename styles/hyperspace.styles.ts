/**
 * @file hyperspace.styles.ts
 * @description Classes Tailwind CSS et utilitaires pour effets Glow Cyan futuristes
 * @domain UX - Design System
 * 
 * UTILISATION:
 * - Import des classes prédéfinies pour glow cyan
 * - Utilitaires CSS-in-JS compatibles avec Tailwind
 * - Animations réutilisables
 */

import type { CSSProperties } from 'react';

// ============================================
// COULEURS HYPERSPACE
// ============================================

export const HYPERSPACE_COLORS = {
    // Cyan primaire
    cyanPrimary: '#00D9FF',
    cyanLight: '#00FFFF',
    cyanDark: '#0096C8',
    cyanMuted: '#00D9FF80',
    
    // Backgrounds
    bgDeep: '#000510',
    bgMedium: '#001020',
    bgLight: '#001428',
    
    // Accents
    white: '#FFFFFF',
    starWhite: '#E0FFFF',
} as const;

// ============================================
// CLASSES TAILWIND PERSONNALISÉES
// ============================================

/**
 * Classes Tailwind pour effets glow cyan
 * À ajouter dans tailwind.config.js extend
 */
export const tailwindExtend = {
    colors: {
        'hyperspace-cyan': {
            DEFAULT: '#00D9FF',
            50: '#E0FFFF',
            100: '#B3F5FF',
            200: '#66EBFF',
            300: '#33E2FF',
            400: '#00D9FF',
            500: '#00B8D9',
            600: '#0096B3',
            700: '#00748C',
            800: '#005266',
            900: '#003040',
        },
        'hyperspace-bg': {
            DEFAULT: '#000510',
            light: '#001020',
            medium: '#001428',
        }
    },
    boxShadow: {
        'glow-cyan-sm': '0 0 10px rgba(0, 217, 255, 0.3)',
        'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.4)',
        'glow-cyan-lg': '0 0 40px rgba(0, 217, 255, 0.5)',
        'glow-cyan-xl': '0 0 60px rgba(0, 217, 255, 0.6)',
        'neon-cyan': '0 0 10px #00D9FF, 0 0 20px #00D9FF, 0 0 40px #00D9FF',
    },
    animation: {
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 1.5s ease-in-out infinite',
        'hyperspace-reveal': 'hyperspace-reveal 0.8s ease-out forwards',
    },
    keyframes: {
        'neon-pulse': {
            '0%, 100%': {
                textShadow: '0 0 10px rgba(0, 217, 255, 0.8), 0 0 20px rgba(0, 217, 255, 0.5), 0 0 40px rgba(0, 217, 255, 0.3)',
            },
            '50%': {
                textShadow: '0 0 15px rgba(0, 217, 255, 1), 0 0 30px rgba(0, 217, 255, 0.7), 0 0 60px rgba(0, 217, 255, 0.5)',
            },
        },
        'glow-pulse': {
            '0%, 100%': {
                opacity: '1',
                boxShadow: '0 0 10px #00D9FF, 0 0 20px #00D9FF',
            },
            '50%': {
                opacity: '0.7',
                boxShadow: '0 0 15px #00D9FF, 0 0 30px #00D9FF',
            },
        },
        'hyperspace-reveal': {
            '0%': {
                filter: 'brightness(2) blur(10px)',
            },
            '50%': {
                filter: 'brightness(1.5) blur(2px)',
            },
            '100%': {
                filter: 'brightness(1) blur(0)',
            },
        },
    },
};

// ============================================
// CLASSES CSS PRÊTES À L'EMPLOI
// ============================================

/**
 * Classes CSS pour utilisation directe avec className
 */
export const glowClasses = {
    // Texte avec glow
    textGlow: 'text-hyperspace-cyan drop-shadow-[0_0_10px_rgba(0,217,255,0.8)]',
    textGlowStrong: 'text-hyperspace-cyan drop-shadow-[0_0_20px_rgba(0,217,255,1)]',
    
    // Bordures avec glow
    borderGlow: 'border-hyperspace-cyan/50 shadow-glow-cyan',
    borderGlowStrong: 'border-hyperspace-cyan shadow-glow-cyan-lg',
    
    // Boutons
    buttonGlow: `
        bg-gradient-to-r from-hyperspace-cyan/20 to-hyperspace-cyan/10
        border border-hyperspace-cyan/50
        text-hyperspace-cyan
        shadow-glow-cyan
        hover:shadow-glow-cyan-lg
        hover:border-hyperspace-cyan
        transition-all duration-300
    `,
    
    // Cards
    cardGlow: `
        bg-hyperspace-bg-light/50
        border border-hyperspace-cyan/20
        hover:border-hyperspace-cyan/40
        hover:shadow-glow-cyan-sm
        transition-all duration-300
    `,
    
    // Indicateurs
    dotGlow: 'w-2 h-2 rounded-full bg-hyperspace-cyan shadow-neon-cyan animate-glow-pulse',
};

// ============================================
// STYLES INLINE (CSS-in-JS)
// ============================================

/**
 * Styles inline pour composants sans Tailwind
 */
export const inlineStyles = {
    // Texte neon
    neonText: {
        color: HYPERSPACE_COLORS.cyanPrimary,
        textShadow: `
            0 0 10px rgba(0, 217, 255, 0.8),
            0 0 20px rgba(0, 217, 255, 0.5),
            0 0 40px rgba(0, 217, 255, 0.3)
        `,
    },
    
    // Texte neon animé
    neonTextAnimated: {
        color: HYPERSPACE_COLORS.cyanPrimary,
        animation: 'neon-pulse 2s ease-in-out infinite',
    },
    
    // Bordure glow
    glowBorder: {
        border: `1px solid ${HYPERSPACE_COLORS.cyanMuted}`,
        boxShadow: `0 0 20px rgba(0, 217, 255, 0.2)`,
    },
    
    // Bouton futuriste
    futuristicButton: {
        background: `linear-gradient(135deg, rgba(0, 217, 255, 0.2) 0%, rgba(0, 150, 200, 0.2) 100%)`,
        border: `1px solid rgba(0, 217, 255, 0.3)`,
        borderRadius: '8px',
        color: HYPERSPACE_COLORS.cyanPrimary,
        padding: '12px 24px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
    },
    
    // Card futuriste
    futuristicCard: {
        background: 'rgba(0, 20, 40, 0.5)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '12px',
        transition: 'all 0.3s ease',
    },
    
    // Background gradient
    hyperspaceBackground: {
        background: `linear-gradient(135deg, ${HYPERSPACE_COLORS.bgDeep} 0%, ${HYPERSPACE_COLORS.bgMedium} 50%, ${HYPERSPACE_COLORS.bgDeep} 100%)`,
    },
};

// ============================================
// UTILITAIRES
// ============================================

/**
 * Génère un style de glow avec intensité personnalisée
 */
export const createGlow = (intensity: number = 1): CSSProperties => ({
    boxShadow: `
        0 0 ${10 * intensity}px rgba(0, 217, 255, ${0.3 * intensity}),
        0 0 ${20 * intensity}px rgba(0, 217, 255, ${0.2 * intensity}),
        0 0 ${40 * intensity}px rgba(0, 217, 255, ${0.1 * intensity})
    `,
});

/**
 * Génère un text-shadow neon avec intensité personnalisée
 */
export const createNeonText = (intensity: number = 1): CSSProperties => ({
    color: HYPERSPACE_COLORS.cyanPrimary,
    textShadow: `
        0 0 ${10 * intensity}px rgba(0, 217, 255, ${0.8 * intensity}),
        0 0 ${20 * intensity}px rgba(0, 217, 255, ${0.5 * intensity}),
        0 0 ${40 * intensity}px rgba(0, 217, 255, ${0.3 * intensity})
    `,
});

/**
 * Génère un gradient background hyperspace
 */
export const createHyperspaceGradient = (angle: number = 135): string => 
    `linear-gradient(${angle}deg, ${HYPERSPACE_COLORS.bgDeep} 0%, ${HYPERSPACE_COLORS.bgMedium} 50%, ${HYPERSPACE_COLORS.bgDeep} 100%)`;

// ============================================
// CSS KEYFRAMES (pour injection dans <style>)
// ============================================

export const keyframesCSS = `
    @keyframes neon-pulse {
        0%, 100% {
            text-shadow:
                0 0 10px rgba(0, 217, 255, 0.8),
                0 0 20px rgba(0, 217, 255, 0.5),
                0 0 40px rgba(0, 217, 255, 0.3);
        }
        50% {
            text-shadow:
                0 0 15px rgba(0, 217, 255, 1),
                0 0 30px rgba(0, 217, 255, 0.7),
                0 0 60px rgba(0, 217, 255, 0.5);
        }
    }
    
    @keyframes glow-pulse {
        0%, 100% {
            opacity: 1;
            box-shadow: 0 0 10px #00D9FF, 0 0 20px #00D9FF;
        }
        50% {
            opacity: 0.7;
            box-shadow: 0 0 15px #00D9FF, 0 0 30px #00D9FF;
        }
    }
    
    @keyframes hyperspace-reveal {
        0% {
            filter: brightness(2) blur(10px);
        }
        50% {
            filter: brightness(1.5) blur(2px);
        }
        100% {
            filter: brightness(1) blur(0);
        }
    }
    
    @keyframes star-twinkle {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
    
    @keyframes slide-in-left {
        0% {
            opacity: 0;
            transform: translateX(-100%);
        }
        100% {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slide-in-up {
        0% {
            opacity: 0;
            transform: translateY(20px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

export default {
    HYPERSPACE_COLORS,
    tailwindExtend,
    glowClasses,
    inlineStyles,
    createGlow,
    createNeonText,
    createHyperspaceGradient,
    keyframesCSS,
};
