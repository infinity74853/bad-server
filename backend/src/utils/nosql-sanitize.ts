/**
 * Защита от NoSQL-инъекций
 */

import BadRequestError from "../errors/bad-request-error";

// ⚠️ УДАЛЯЕМ опасные операторы! Оставляем только самые базовые
const ALLOWED_OPERATORS = ['$eq']; // ← ТОЛЬКО БЕЗОПАСНЫЕ ОПЕРАТОРЫ

/**
 * Проверяет строку на наличие NoSQL-инъекций
 */
export const hasNoSQLInjection = (str: string): boolean => {
    const dangerousPatterns = [
        /\$[a-z]/i,                    // Все операторы $
        /\[.*\]/,                      // Квадратные скобки
        /\{.*\}/,                      // Фигурные скобки  
        /\$or|\$and|\$nor/i,           // Логические операторы
        /\$where|\$expr/i,             // Опасные операторы
        /this\./i,                     // JavaScript инъекции
        /function/i,                   // Function инъекции
        /while.*\(/i,                  // Циклы
        /sleep.*\(/i,                  // Sleep инъекции
        /benchmark/i                   // Benchmark инъекции
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(str));
};

/**
 * Санитизирует объект фильтра, удаляя опасные операторы
 */
export const sanitizeFilter = (filter: any): any => {
    if (!filter || typeof filter !== 'object') {
        return filter;
    }

    if (Array.isArray(filter)) {
        // Для массивов - санитизируем каждый элемент
        return filter.map(item => sanitizeFilter(item));
    }

    // Для объектов - используем иммутабельный подход
    return Object.keys(filter).reduce((acc: any, key) => {
        // ⚠️ ЗАПРЕЩАЕМ ВСЕ операторы $ кроме разрешенных
        if (key.startsWith('$') && !ALLOWED_OPERATORS.includes(key)) {
            return acc; // Пропускаем опасные операторы
        }

        const value = filter[key];
        
        // Рекурсивно санитизируем вложенные объекты
        const sanitizedValue = (value && typeof value === 'object') 
            ? sanitizeFilter(value) 
            : value;
        
        // Возвращаем новый объект без мутации параметра
        return {
            ...acc,
            [key]: sanitizedValue
        };
    }, {});
};

/**
 * Валидирует и экранирует строку для использования в RegExp
 */
export const escapeRegex = (str: string): string => {
    if (typeof str !== 'string') {
        return '';
    }
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Создает безопасный RegExp для поиска
 */
export const createSafeRegex = (pattern: string, flags = 'i'): RegExp => {
    if (typeof pattern !== 'string') {
        return new RegExp('', flags);
    }
    const escapedPattern = escapeRegex(pattern);
    return new RegExp(escapedPattern, flags);
};

/**
 * Санитизирует строку для использования в запросах
 */
export const sanitizeString = (str: string): string => {
    if (hasNoSQLInjection(str)) {
        throw new Error('Обнаружена попытка NoSQL-инъекции');
    }
    return str;
};

// ✅ ДОБАВЛЯЕМ НОВУЮ ФУНКЦИЮ для санитизации query параметров
export const sanitizeQueryParams = (query: any): any => {
    const sanitized: any = {};
    
    Object.keys(query).forEach((key) => {
        const value = query[key];
        
        // Проверяем ключ на инъекции
        if (hasNoSQLInjection(key)) {
            throw new Error(`Обнаружена NoSQL-инъекция в параметре: ${key}`);
        }
        
        // Проверяем значение на инъекции (если это строка)
        if (typeof value === 'string' && hasNoSQLInjection(value)) {
            throw new Error(`Обнаружена NoSQL-инъекция в значении: ${value}`);
        }
        
        sanitized[key] = value;
    });
    
    return sanitized;
};

/**
 * Рекурсивно проверяет объект на наличие NoSQL-инъекций
 */
export const deepCheckNoSQLInjection = (obj: any, path: string = ''): void => {
    if (!obj || typeof obj !== 'object') {
        return;
    }

    Object.keys(obj).forEach(key => {
        const currentPath = path ? `${path}.${key}` : key;
        const value = obj[key];

        // Проверяем ключ на инъекции
        if (hasNoSQLInjection(key)) {
            throw new Error(`Обнаружена NoSQL-инъекция в пути: ${currentPath}`);
        }

        // Проверяем значение если это строка
        if (typeof value === 'string' && hasNoSQLInjection(value)) {
            throw new Error(`Обнаружена NoSQL-инъекция в значении: ${currentPath} = ${value}`);
        }

        // Рекурсивно проверяем вложенные объекты
        if (value && typeof value === 'object') {
            deepCheckNoSQLInjection(value, currentPath);
        }
    });
};

/**
 * Санитизирует Express request query
 */
export const sanitizeRequestQuery = (query: any): any => {
    try {
        // Глубокая проверка всего query объекта
        deepCheckNoSQLInjection(query);
        
        // Санитизируем фильтры
        return sanitizeFilter(query);
    } catch (error) {
        throw new BadRequestError('Обнаружена попытка NoSQL-инъекции');
    }
};

/**
 * Проверяет сырую URL query строку на NoSQL-инъекции
 */
export const checkRawQueryString = (queryString: string): void => {
    const dangerousOperators = [
        '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$regex',
        '$where', '$exists', '$or', '$and', '$not', '$nor', '$elemMatch',
        '$all', '$size', '$type', '$mod', '$text', '$expr'
    ];

    // ИСКЛЮЧАЕМ search параметр из проверки
    const searchParamRegex = /search=[^&]*/g;
    const queryWithoutSearch = queryString.replace(searchParamRegex, '');
    
    // Проверяем наличие операторов в query строке
    const hasDangerousOperator = dangerousOperators.some(operator => 
        queryWithoutSearch.includes(`${operator}=`) || 
        queryWithoutSearch.includes(`[${operator}]`) ||
        queryWithoutSearch.includes(`{"${operator}"`)
    );
    
    if (hasDangerousOperator) {
        throw new BadRequestError('Обнаружена попытка NoSQL-инъекции');
    }
};
