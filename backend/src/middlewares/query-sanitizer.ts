import { Request, Response, NextFunction } from 'express';
import { checkRawQueryString } from '../utils/nosql-sanitize';

/**
 * Middleware для проверки query строки на NoSQL-инъекции
 */
export const querySanitizer = (req: Request, _res: Response, next: NextFunction) => {
    try {
        // Проверяем сырую query строку
        if (req.originalUrl.includes('?')) {
            const queryString = req.originalUrl.split('?')[1];
            checkRawQueryString(queryString);
        }
        next();
    } catch (error) {
        next(error);
    }
};
