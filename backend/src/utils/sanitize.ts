/**
 * Санитизация HTML для защиты от XSS
 * Экранирует опасные символы и удаляет потенциально вредоносный код
 */

export const sanitizeHTML = (dirty: string): string => {
    if (!dirty || typeof dirty !== 'string') {
        return dirty;
    }
    
    // Базовое экранирование HTML символов
    let sanitized = dirty
        .replace(/&/g, '&amp;')   // Должно быть первым!
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');

    // Удаляем опасные конструкции
    sanitized = sanitized
        .replace(/javascript:/gi, '') // Удаляем javascript: протокол
        .replace(/vbscript:/gi, '')   // Удаляем vbscript: протокол  
        .replace(/on\w+\s*=/gi, '')   // Удаляем обработчики событий (onclick=, onload=)
        .replace(/expression\(/gi, '') // Удаляем CSS expressions
        .replace(/url\(/gi, '')       // Удаляем url() в CSS
        .replace(/<script/gi, '&lt;script') // Дополнительная защита от script тегов
        .replace(/<\/script/gi, '&lt;/script');

    return sanitized.trim();
};
