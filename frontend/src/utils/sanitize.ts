/**
 * Базовая санитизация текста на фронтенде
 */
export const sanitizeText = (text: string): string => {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    // Создаем временный элемент для декодирования HTML entities
    const tempElement = document.createElement('div');
    tempElement.textContent = text;
    return tempElement.innerHTML;
};