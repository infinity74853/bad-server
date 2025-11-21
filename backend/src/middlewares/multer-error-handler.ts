import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import BadRequestError from '../errors/bad-request-error'

export const multerErrorHandler = (
    error: any,
    _req: Request,
    _res: Response,
    next: NextFunction
) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return next(new BadRequestError('Файл слишком большой. Максимальный размер: 5MB'))
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return next(new BadRequestError('Слишком много файлов. Максимум: 1 файл'))
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new BadRequestError('Неожиданное поле с файлом'))
        }
        return next(new BadRequestError(`Ошибка загрузки файла: ${error.message}`))
    }
    next(error)
}

export default multerErrorHandler
