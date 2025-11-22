import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import BadRequestError from '../errors/bad-request-error'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Проверка на кастомные ошибки валидации
    if ((req as any).fileValidationError) {
        return next(new BadRequestError((req as any).fileValidationError))
    }
    
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }
    
    // ДОБАВЬ ПРОВЕРКУ МИНИМАЛЬНОГО РАЗМЕРА ЗДЕСЬ
    if (req.file.size < 2 * 1024) {
        return next(new BadRequestError('Файл слишком маленький. Минимальный размер: 2KB'))
    }
    
    try {
        const fileName = req.file.filename;
        
        return res.status(constants.HTTP_STATUS_CREATED).json({
            fileName
        })
    } catch (error) {
        return next(error)
    }
}

export default {}
