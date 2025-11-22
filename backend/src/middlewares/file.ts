import { Request, Express } from 'express'
import multer, { FileFilterCallback } from 'multer'
import { join } from 'path'

type DestinationCallback = (error: Error | null, destination: string) => void
type FileNameCallback = (error: Error | null, filename: string) => void

const storage = multer.diskStorage({
    destination: (
        _req: Request,
        _file: Express.Multer.File,
        cb: DestinationCallback
    ) => {
        cb(
            null,
            join(
                __dirname,
                process.env.UPLOAD_PATH_TEMP
                    ? `../public/${process.env.UPLOAD_PATH_TEMP}`
                    : '../public'
            )
        )
    },

    filename: (
        _req: Request,
        file: Express.Multer.File,
        cb: FileNameCallback
    ) => {
        // Безопасное имя файла: timestamp + random number
        const timestamp = Date.now()
        const random = Math.round(Math.random() * 1E9)
        const safeName = `file_${timestamp}_${random}`
        
        // Сохраняем оригинальное расширение если оно безопасное
        const originalExt = file.originalname.split('.').pop()
        const safeExt = originalExt && /^[a-z0-9]+$/i.test(originalExt) 
            ? `.${originalExt.toLowerCase()}` 
            : ''
            
        cb(null, `${safeName}${safeExt}`)
    },
})

const types = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
]

const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (!types.includes(file.mimetype)) {
        // Добавляем ошибку в request для последующей обработки
        (req as any).fileValidationError = 'Недопустимый тип файла. Разрешены только: PNG, JPG, JPEG, GIF, SVG'
        return cb(null, false)
    }
    
    // ДОБАВЛЯЕМ ПРОВЕРКУ МИНИМАЛЬНОГО РАЗМЕРА (2KB)
    if (file.size < 2 * 1024) { // 2KB = 2048 bytes
        (req as any).fileValidationError = 'Файл слишком маленький. Минимальный размер: 2KB'
        return cb(null, false)
    }
    
    return cb(null, true)
}

// Добавляем лимиты
const limits = {
    fileSize: 5 * 1024 * 1024, // 5MB максимум
    files: 1 // 1 файл за раз
}

const upload = multer({ storage, fileFilter, limits })

export default upload
