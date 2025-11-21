/* eslint-disable no-param-reassign */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose, { Document, HydratedDocument, Model, Types } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';

import { ACCESS_TOKEN, REFRESH_TOKEN } from '../config';
import UnauthorizedError from '../errors/unauthorized-error';

export enum Role {
    Customer = 'customer',
    Admin = 'admin',
}

// Исправляем интерфейс - добавляем временные метки
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    tokens?: { token: string }[];
    roles: Role[];
    phone: string;
    totalAmount: number;
    orderCount: number;
    orders: Types.ObjectId[];
    lastOrderDate: Date | null;
    lastOrder: Types.ObjectId | null;
    createdAt: Date; // ДОБАВЛЯЕМ: поле из timestamps
    updatedAt: Date; // ДОБАВЛЯЕМ: поле из timestamps
}

// Интерфейс для безопасного возврата пользователя
export interface ISafeUser {
    _id: Types.ObjectId;
    name: string;
    email: string;
    phone: string;
    totalAmount: number;
    orderCount: number;
    orders: Types.ObjectId[];
    lastOrderDate: Date | null;
    lastOrder: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

interface IUserMethods {
    generateAccessToken(): string;
    generateRefreshToken(): Promise<string>;
    toJSON(): any;
    calculateOrderStats(): Promise<void>;
    comparePassword(password: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser, {}, IUserMethods> {
    findUserByCredentials: (
        email: string,
        password: string
    ) => Promise<HydratedDocument<IUser, IUserMethods>>;
}

const userSchema = new mongoose.Schema<IUser, IUserModel, IUserMethods>(
    {
        name: {
            type: String,
            default: 'Евлампий',
            minlength: [2, 'Минимальная длина поля "name" - 2'],
            maxlength: [30, 'Максимальная длина поля "name" - 30'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Поле "email" должно быть заполнено'],
            unique: true,
            lowercase: true,
            trim: true,
            validate: {
                validator: (v: string) => validator.isEmail(v),
                message: 'Поле "email" должно быть валидным email-адресом',
            },
        },
        password: {
            type: String,
            required: [true, 'Поле "password" должно быть заполнено'],
            select: false
            // УДАЛЕНА ВАЛИДАЦИЯ - она блокирует MD5 хэши из базы
        },
        tokens: [
            {
                token: { required: true, type: String },
            },
        ],
        roles: {
            type: [String],
            enum: Object.values(Role),
            default: [Role.Customer],
        },
        phone: {
            type: String,
            trim: true,
        },
        lastOrderDate: {
            type: Date,
            default: null,
        },
        lastOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'order',
            default: null,
        },
        totalAmount: { type: Number, default: 0 },
        orderCount: { type: Number, default: 0 },
        orders: [
            {
                type: Types.ObjectId,
                ref: 'order',
            },
        ],
    },
    {
        versionKey: false,
        timestamps: true, // Это автоматически добавит createdAt и updatedAt
        toJSON: {
            virtuals: true,
            transform: (_doc, ret) => {
                // Более безопасный подход - создаем новый объект только с нужными полями
                const {
                    _id,
                    name,
                    email,
                    phone,
                    totalAmount,
                    orderCount,
                    orders,
                    lastOrderDate,
                    lastOrder,
                    createdAt,
                    updatedAt
                } = ret;

                return {
                    _id,
                    name,
                    email,
                    phone,
                    totalAmount,
                    orderCount,
                    orders,
                    lastOrderDate,
                    lastOrder,
                    createdAt,
                    updatedAt
                };
            },
        },
    }
);

userSchema.pre('save', async function hashingPassword(next) {
    try {
        if (this.isModified('password')) {
            // Хэшируем только если пароль не начинается с $ (уже хэширован)
            if (!this.password.startsWith('$')) {
                const saltRounds = 12;
                this.password = await bcrypt.hash(this.password, saltRounds);
            }
        }
        next();
    } catch (error) {
        next(error as Error);
    }
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword: string): Promise<boolean> {
    // ВРЕМЕННО: проверяем и bcrypt и MD5
    const bcryptMatch = await bcrypt.compare(candidatePassword, this.password);
    
    // Если bcrypt не сработал, проверяем MD5 (для старых паролей)
    if (!bcryptMatch) {
        const md5Hash = crypto.createHash('md5').update(candidatePassword).digest('hex');
        return md5Hash === this.password;
    }
    
    return true;
};

userSchema.methods.generateAccessToken = function generateAccessToken() {
    const user = this;
    return jwt.sign(
        {
            _id: user._id.toString(),
            email: user.email,
            roles: user.roles,
        },
        ACCESS_TOKEN.secret,
        {
            expiresIn: ACCESS_TOKEN.expiry,
            subject: user.id.toString(),
            issuer: 'weblarek-backend',
        }
    );
};

userSchema.methods.generateRefreshToken = async function generateRefreshToken() {
    const user = this;
    
    const refreshToken = jwt.sign(
        {
            _id: user._id.toString(),
        },
        REFRESH_TOKEN.secret,
        {
            expiresIn: REFRESH_TOKEN.expiry,
            subject: user.id.toString(),
            issuer: 'weblarek-backend',
        }
    );

    const rTknHash = crypto
        .createHmac('sha256', REFRESH_TOKEN.secret)
        .update(refreshToken)
        .digest('hex');

    user.tokens = user.tokens || [];
    user.tokens.push({ token: rTknHash });
    
    if (user.tokens.length > 5) {
        user.tokens = user.tokens.slice(-5);
    }
    
    await user.save();

    return refreshToken;
};

userSchema.statics.findUserByCredentials = async function findByCredentials(
    email: string,
    password: string
) {
    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await this.findOne({ email: normalizedEmail })
        .select('+password +tokens')
        .orFail(() => new UnauthorizedError('Неправильные почта или пароль'));

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new UnauthorizedError('Неправильные почта или пароль');
    }

    return user;
};

userSchema.methods.calculateOrderStats = async function calculateOrderStats() {
    const user = this;
    const orderStats = await mongoose.model('order').aggregate([
        { $match: { customer: user._id } },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$totalAmount' },
                lastOrderDate: { $max: '$createdAt' },
                orderCount: { $sum: 1 },
                lastOrder: { $last: '$_id' },
            },
        },
    ]);

    if (orderStats.length > 0) {
        const stats = orderStats[0];
        user.totalAmount = stats.totalAmount;
        user.orderCount = stats.orderCount;
        user.lastOrderDate = stats.lastOrderDate;
        user.lastOrder = stats.lastOrder;
    } else {
        user.totalAmount = 0;
        user.orderCount = 0;
        user.lastOrderDate = null;
        user.lastOrder = null;
    }

    await user.save();
};

userSchema.index({ email: 1 });
userSchema.index({ 'tokens.token': 1 });

const UserModel = mongoose.model<IUser, IUserModel>('user', userSchema);

export default UserModel;
