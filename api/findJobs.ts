
import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- Интерфейсы для API Avito ---

// Ответ от сервера авторизации Avito
interface AvitoAuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

// Примерная структура вакансии от Avito API (может потребовать уточнений)
interface AvitoVacancy {
    id: string;
    title: string;
    salary: number | { from: number, to: number };
    company_name: string;
    address: string;
    url: string;
    description: string;
}

// Ответ от API поиска вакансий
interface AvitoSearchResponse {
    items: AvitoVacancy[];
}

// --- Функции для работы с API ---

/**
 * Получает токен доступа от Avito API.
 */
async function getAvitoAuthToken(): Promise<string> {
    // Получаем ключи из переменных окружения. Это безопасный способ.
    const { AVITO_CLIENT_ID, AVITO_CLIENT_SECRET } = process.env;

    if (!AVITO_CLIENT_ID || !AVITO_CLIENT_SECRET) {
        console.error('Ключи API Avito (AVITO_CLIENT_ID, AVITO_CLIENT_SECRET) не найдены в переменных окружения.');
        throw new Error('Ключи API Avito не настроены на сервере.');
    }

    const response = await fetch('https://api.avito.ru/token/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: AVITO_CLIENT_ID,
            client_secret: AVITO_CLIENT_SECRET
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка авторизации в Avito:', errorText);
        throw new Error(`Не удалось авторизоваться в Avito. Статус: ${response.status}`);
    }

    const data: AvitoAuthResponse = await response.json();
    return data.access_token;
}

/**
 * Ищет вакансии через API Avito.
 */
async function searchAvitoJobs(token: string, query: string, location: string, limit: number) {
    // Эндпоинт и параметры поиска могут отличаться, это предположение на основе документации
    const searchUrl = new URL('https://api.avito.ru/core/v1/vacancies');
    searchUrl.searchParams.set('query', query);
    if (location) {
        searchUrl.searchParams.set('location', location); // Уточнить реальное имя параметра
    }
    searchUrl.searchParams.set('limit', limit.toString());

    const response = await fetch(searchUrl.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка поиска вакансий в Avito:', errorText);
        throw new Error(`Ошибка API Avito при поиске. Статус: ${response.status}`);
    }

    const data: AvitoSearchResponse = await response.json();

    // Трансформируем ответ от Avito в наш внутренний формат
    return data.items.map(item => ({
        title: item.title,
        company: item.company_name || 'Компания не указана',
        location: item.address,
        url: item.url,
        description: item.description || 'Нет описания',
    }));
}

// --- Основной обработчик --- 

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { searchSettings } = req.body;
        if (!searchSettings || !searchSettings.positions) {
            return res.status(400).json({ message: 'Отсутствует поисковый запрос (positions)' });
        }

        const authToken = await getAvitoAuthToken();
        const jobs = await searchAvitoJobs(
            authToken,
            searchSettings.positions,
            searchSettings.location || '',
            searchSettings.limit || 20
        );

        return res.status(200).json({ jobs });

    } catch (error: any) {
        console.error("Критическая ошибка в обработчике Avito:", error);
        // Отдаем клиенту чистое сообщение об ошибке
        return res.status(500).json({ message: error.message || 'Внутренняя ошибка сервера' });
    }
}
