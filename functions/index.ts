/**
 * ==========================================================================================
 * ВАЖНО: ЭТО КОД ДЛЯ FIREBASE FUNCTIONS (BACKEND)
 * ==========================================================================================
 * 
 * Этот файл НЕ является частью вашего frontend-приложения. Его нужно развернуть (deploy)
 * в вашем проекте Firebase, чтобы создать серверную функцию (API endpoint), которая будет
 * безопасно взаимодействовать с API Avito.
 * 
 * --- ШАГИ ПО РАЗВЕРТЫВАНИЮ ---
 * 1.  Установите Firebase CLI: `npm install -g firebase-tools`
 * 2.  Войдите в свой аккаунт: `firebase login`
 * 3.  В корневой папке вашего проекта (рядом с `index.html`) создайте папку `functions`.
 * 4.  Перейдите в эту папку: `cd functions`
 * 5.  Инициализируйте Firebase Functions: `firebase init functions`. Выберите TypeScript.
 * 6.  Firebase создаст файлы, включая `package.json` и `src/index.ts`.
 * 7.  Установите зависимость: `npm install axios`
 * 8.  Замените содержимое файла `functions/src/index.ts` на код, представленный ниже.
 * 9.  Разверните функцию: из папки `functions` выполните команду `firebase deploy --only functions`
 * ==========================================================================================
 */

import * as functions from "firebase-functions";
import axios from "axios";

// Определяем интерфейс для данных, приходящих от клиента
interface RequestData {
    clientId: string;
    clientSecret: string;
    searchSettings: {
        query: string;
        location: string;
        salary: number;
        limit: number;
    };
}

// Определяем интерфейс для ответа от API Avito
interface AvitoVacancy {
    id: number;
    title: string;
    salary: {
        value: number;
        currency: string;
        period: string;
    } | string;
    address: string;
    url: string;
    description: string;
    company?: {
        name: string;
    };
}

// 1. Функция для получения токена доступа от Avito
const getAvitoToken = async (clientId: string, clientSecret: string): Promise<string> => {
    const AVITO_TOKEN_URL = "https://api.avito.ru/token/";
    
    try {
        const response = await axios.post(AVITO_TOKEN_URL, new URLSearchParams({
            "grant_type": "client_credentials",
            "client_id": clientId,
            "client_secret": clientSecret,
        }), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        return response.data.access_token;
    } catch (error: any) {
        console.error("Ошибка при получении токена Avito:", error.response?.data || error.message);
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Не удалось получить токен доступа от Avito. Проверьте Client ID и Client Secret.",
            error.response?.data
        );
    }
};


// 2. Основная HTTPS-функция, вызываемая из нашего приложения
// FIX: Updated the handler signature for `functions.https.onCall`.
// Newer versions of the `firebase-functions` SDK pass a single `request` object
// containing the payload in `request.data`, instead of passing the data directly. This resolves the type error.
export const findAvitoJobs = functions.https.onCall(async (request) => {
    const data: RequestData = request.data;
    const { clientId, clientSecret, searchSettings } = data;

    if (!clientId || !clientSecret) {
        throw new functions.https.HttpsError("unauthenticated", "Avito Client ID и Client Secret не предоставлены.");
    }
    
    if (!searchSettings || !searchSettings.query) {
        throw new functions.https.HttpsError("invalid-argument", "Необходимо указать параметры поиска.");
    }

    // Получаем токен доступа
    const accessToken = await getAvitoToken(clientId, clientSecret);
    
    const AVITO_API_URL = "https://api.avito.ru/job-search/v1/vacancies";

    try {
        const response = await axios.get(AVITO_API_URL, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            params: {
                q: searchSettings.query,
                // Параметры могут отличаться, сверьтесь с документацией Avito
                address: searchSettings.location,
                salary_from: searchSettings.salary,
                count: searchSettings.limit,
            },
        });

        const vacancies: AvitoVacancy[] = response.data.items || [];

        // Преобразуем ответ от Avito в наш внутренний формат Job
        const formattedJobs = vacancies.map((v) => ({
            title: v.title,
            company: v.company?.name || "Компания не указана",
            salary: typeof v.salary === 'string' ? v.salary : `${v.salary.value} ${v.salary.currency}`,
            location: v.address,
            description: v.description.replace(/<br\s*\/?>/gi, "\n"), // Очистка HTML из описания
            url: v.url,
            sourcePlatform: "Avito",
            // Поля, которых нет в API Avito, заполняем по умолчанию
            companyRating: 0,
            companyReviewSummary: "",
            responsibilities: [],
            requirements: [],
            contacts: {},
        }));

        return { jobs: formattedJobs };

    } catch (error: any) {
        console.error("Ошибка при запросе к API Avito:", error.response?.data || error.message);
        throw new functions.https.HttpsError(
            "internal",
            "Не удалось выполнить запрос к API Avito.",
            error.response?.data
        );
    }
});
