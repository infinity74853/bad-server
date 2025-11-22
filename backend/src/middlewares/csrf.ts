import { NextFunction, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import UnauthorizedError from '../errors/unauthorized-error';

// Хранилище для CSRF токенов (в продакшене используй Redis)
const csrfTokens = new Set<string>();

// Генерация CSRF токена
export const generateCSRFToken = (): string => {
    const token = randomBytes(32).toString('hex');
    csrfTokens.add(token);
    return token;
};

// Валидация CSRF токена
export const validateCSRFToken = (token: string): boolean => csrfTokens.has(token);

// Удаление использованного токена
export const removeCSRFToken = (token: string): void => {
    csrfTokens.delete(token);
};

// CSRF middleware
export const csrfProtection = (req: Request, _res: Response, next: NextFunction) => {
    // Пропускаем GET запросы и запросы аутентификации
    if (req.method === 'GET' || req.path.startsWith('/auth/')) {
        return next();
    }

    const csrfToken = req.headers['x-csrf-token'] as string;

    if (!csrfToken || !validateCSRFToken(csrfToken)) {
        return next(new UnauthorizedError('Невалидный CSRF токен'));
    }

    // Удаляем использованный токен (optional - можно не удалять для SPA)
    removeCSRFToken(csrfToken);
    
    next();
};

// Middleware для установки CSRF токена в куки
export const setCSRFToken = (_req: Request, res: Response, next: NextFunction) => {
    // ДОБАВЬ ЭТУ ПРОВЕРКУ:
    if (res.headersSent) {
        return next();
    }
    
    const csrfToken = generateCSRFToken();
    
    // Устанавливаем токен в куки для SPA
    res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false, // Доступен из JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000, // 1 час
    });

    // Также отправляем в заголовке для удобства
    res.setHeader('X-CSRF-Token', csrfToken);
    
    next();
};
