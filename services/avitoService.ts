// FIX: Corrected import path for types
import type { Job, SearchSettings } from '../types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

type AvitoJobResult = Omit<Job, 'id' | 'kanbanStatus' | 'profileId' | 'userId' | 'history' | 'notes'>;

const functions = getFunctions(app);
const findAvitoJobsCallable = httpsCallable<{
    clientId: string;
    clientSecret: string;
    searchSettings: {
        query: string;
        location: string;
        salary: number;
        limit: number;
    }
}, { jobs: AvitoJobResult[] }>(functions, 'findAvitoJobs');

export const findJobsOnAvitoAPI = async (settings: SearchSettings, clientId: string, clientSecret: string): Promise<AvitoJobResult[]> => {
    try {
        const result = await findAvitoJobsCallable({
            clientId,
            clientSecret,
            searchSettings: {
                query: settings.positions,
                location: settings.location,
                salary: settings.salary,
                limit: settings.limit
            }
        });

        // Данные из вызываемой функции находятся в свойстве `data`
        return result.data.jobs;

    } catch (error: any) {
        console.error('Ошибка при вызове Firebase-функции для Avito:', error);
        // Firebase Functions SDK возвращает структурированные ошибки
        const message = error.message || 'Не удалось получить вакансии с Avito через Firebase Functions.';
        throw new Error(message);
    }
};