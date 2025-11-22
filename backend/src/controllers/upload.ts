import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import fs from 'fs/promises'
import path from 'path'
import BadRequestError from '../errors/bad-request-error'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // ДОБАВЬ ПРОВЕРКУ ПАПОК
    try {
        const uploadDir = path.join(__dirname, '../public/images');
        const tempDir = path.join(__dirname, '../public/temp');
        
        // Проверяем существование папок
        await fs.access(uploadDir);
        await fs.access(tempDir);
        console.log('✅ Upload directories exist');
    } catch (error) {
        console.log('❌ Upload directories missing:', error);
    }

    console.log('🔄 UPLOAD - NODE_ENV:', process.env.NODE_ENV);
    console.log('🔄 UPLOAD - UPLOAD_PATH:', process.env.UPLOAD_PATH);
    console.log('🔄 UPLOAD - UPLOAD_PATH_TEMP:', process.env.UPLOAD_PATH_TEMP);
    
    if ((req as any).fileValidationError) {
        return next(new BadRequestError((req as any).fileValidationError))
    }
    
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }
    
    try {
        const fileName = req.file.filename;
        console.log('✅ File saved as:', fileName);
        
        return res.status(constants.HTTP_STATUS_CREATED).json({
            fileName
        })
    } catch (error) {
        console.log('❌ Upload error:', error);
        return next(error)
    }
}

export default {}
