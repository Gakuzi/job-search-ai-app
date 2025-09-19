
import type { Job, SearchSettings } from '../types';

// Убираем все упоминания Firebase. Это теперь универсальный сервис.
// Это тип вакансии, который возвращает наш бэкенд. 
// Он может отличаться от полного типа Job в приложении.
type JobResult = Omit<Job, 'id' | 'kanbanStatus' | 'profileId' | 'userId' | 'history' | 'notes'>;

/**
 * Обращается к нашему бэкенду на Vercel для поиска вакансий.
 * @param settings - Параметры поиска (должность, локация и т.д.).
 * @param geminiApiKey - Ключ API для Gemini, который бэкенд будет использовать для обработки.
 * @returns - Массив найденных вакансий.
 */
export const findJobsOnAvitoAPI = async (settings: SearchSettings, geminiApiKey: string): Promise<JobResult[]> => {
    // Наш новый эндпоинт на Vercel. 
    // Во время локальной разработки и на продакшене путь будет одинаковым.
    const endpoint = '/api/findJobs';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                searchSettings: {
                    positions: settings.positions,
                    location: settings.location,
                    salary: settings.salary,
                    limit: settings.limit
                },
                geminiApiKey // Передаем ключ на бэкенд
            }),
        });

        if (!response.ok) {
            // Если ответ не успешный, пытаемся прочитать сообщение об ошибке от сервера
            const errorData = await response.json();
            throw new Error(errorData.message || `Server responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Ожидаем, что бэкенд вернет объект со свойством `jobs`
        return data.jobs || [];

    } catch (error: any) {
        console.error('Ошибка при вызове функции Vercel:', error);
        throw new Error(error.message || 'Не удалось получить вакансии через Vercel Functions.');
    }
};
