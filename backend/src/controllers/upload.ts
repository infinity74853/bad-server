import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import BadRequestError from '../errors/bad-request-error'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if ((req as any).fileValidationError) {
        return next(new BadRequestError((req as any).fileValidationError))
    }
    
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }
    
    try {
        // ВОЗВРАЩАЕМ ТОЛЬКО ИМЯ ФАЙЛА БЕЗ ПУТЕЙ
        const fileName = req.file.filename;
        
        return res.status(constants.HTTP_STATUS_CREATED).json({
            fileName
        })
    } catch (error) {
        return next(error)
    }
}

export default {}
