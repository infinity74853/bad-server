import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// Разрешенные расширения для статических файлов
const ALLOWED_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
    '.css', '.js', '.html', '.txt', '.json', '.ico',
    '.woff', '.woff2', '.ttf', '.eot'
];

export default function serveStatic(baseDir: string) {
    console.log(`🛡️ ServeStatic initialized for directory: ${baseDir}`);
    
    return (req: Request, res: Response, next: NextFunction) => {
        const requestedPath = req.path;
        
        // Пропускаем API маршруты сразу
        if (requestedPath.startsWith('/api/') || 
            requestedPath.startsWith('/auth/') || 
            requestedPath.startsWith('/product') ||
            requestedPath.startsWith('/order/') ||
            requestedPath.startsWith('/customer/') ||
            requestedPath.startsWith('/upload/')) {
            return next();
        }

        // Пропускаем запросы без расширения (скорее всего это API маршруты)
        const extension = path.extname(requestedPath).toLowerCase();
        if (!extension && requestedPath !== '/') {
            return next();
        }

        // Проверяем только разрешенные расширения
        if (extension && !ALLOWED_EXTENSIONS.includes(extension)) {
            return next();
        }

        console.log(`📁 ServeStatic processing: ${requestedPath}`);
        
        // Более строгая проверка path traversal
        if (requestedPath.includes('..') || requestedPath.includes('//') || requestedPath.includes('\\')) {
            console.log(`🚨 BLOCKED Path Traversal: ${requestedPath}`);
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        // Запрещаем пути, начинающиеся с точек
        if (requestedPath.startsWith('.') || /^\.{2,}/.test(requestedPath)) {
            console.log(`🚨 BLOCKED Dot path: ${requestedPath}`);
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const fullPath = path.join(baseDir, requestedPath);
        const resolvedPath = path.resolve(fullPath);
        const resolvedBaseDir = path.resolve(baseDir);

        console.log(`🔍 Path check: ${resolvedPath}`);
        console.log(`🔍 Base dir: ${resolvedBaseDir}`);

        if (!resolvedPath.startsWith(resolvedBaseDir)) {
            console.log(`🚨 BLOCKED Outside base dir: ${requestedPath}`);
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        // Проверяем существование файла
        fs.access(resolvedPath, fs.constants.F_OK, (err) => {
            if (err) {
                console.log(`❌ File not found: ${requestedPath}`);
                return next();
            }

            fs.stat(resolvedPath, (statErr, stats) => {
                if (statErr || !stats.isFile()) {
                    console.log(`❌ Not a file: ${requestedPath}`);
                    return next();
                }

                console.log(`✅ Serving file: ${requestedPath}`);
                return res.sendFile(resolvedPath, (sendErr) => {
                    if (sendErr) {
                        console.error('Error sending file:', sendErr);
                        next(sendErr);
                    }
                });
            });
        });
    };
}
