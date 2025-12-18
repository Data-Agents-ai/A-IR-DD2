import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import config from '../config/environment';

export interface IUser extends Document {
    email: string;
    password: string; // Hash uniquement
    role: 'admin' | 'user' | 'viewer';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: [true, 'Email requis'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email invalide']
    },
    password: {
        type: String,
        required: [true, 'Mot de passe requis'],
        minlength: [8, 'Minimum 8 caractères']
    },
    role: {
        type: String,
        enum: ['admin', 'user', 'viewer'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date
}, {
    timestamps: true,
    strict: false // Permettre les champs additionnels
});

// Middleware: Hash password avant sauvegarde
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    // SOLID: Utiliser bcrypt.rounds depuis config centralisée
    const salt = await bcrypt.genSalt(config.bcrypt.rounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Méthode: Vérifier mot de passe
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
