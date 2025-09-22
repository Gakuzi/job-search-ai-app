import type { Job, SearchSettings } from '../types';
import axios from 'axios';

type AvitoJobResult = Omit<Job, 'id' | 'kanbanStatus' | 'profileId' | 'userId' | 'history' | 'notes'>;

export const findJobsOnAvitoAPI = async (settings: SearchSettings): Promise<AvitoJobResult[]> => {
    try {
        const response = await axios.post('/api/avito-search', {
            searchSettings: {
                query: settings.positions,
                location: settings.location,
                salary: settings.salary,
                limit: settings.limit
            }
        });

        if (response.status !== 200) {
            const errorData = response.data;
            throw new Error(errorData.error || 'Произошла ошибка при запросе к API Avito');
        }

        return response.data.jobs;

    } catch (error: any) {
        console.error('Ошибка при вызове API-функции для Avito:', error);
        const message = error.response?.data?.error || error.message || 'Не удалось получить вакансии с Avito.';
        throw new Error(message);
    }
};
