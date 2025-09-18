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
 * 10. После развертывания Firebase предоставит вам URL для вашей функции.
 * 11. Скопируйте этот URL и вставьте его в файл `services/avitoService.ts` вместо плейсхолдера.
 * 
 * ==========================================================================================
 */

import * as functions from "firebase-functions";
import axios from "axios";

// Определяем интерфейс для данных, приходящих от клиента
interface RequestData {
    apiKey: string;
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

// Создаем HTTPS-функцию, вызываемую из нашего приложения
export const findAvitoJobs = functions.https.onCall(async (data: RequestData, context) => {
    const { apiKey, searchSettings } = data;

    if (!apiKey) {
        throw new functions.https.HttpsError("unauthenticated", "API ключ Avito не предоставлен.");
    }
    
    if (!searchSettings || !searchSettings.query) {
        throw new functions.https.HttpsError("invalid-argument", "Необходимо указать параметры поиска.");
    }

    const AVITO_API_URL = "https://api.avito.ru/job-search/v1/vacancies";

    try {
        const response = await axios.get(AVITO_API_URL, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            params: {
                q: searchSettings.query,
                // Примечание: API Avito может иметь другие параметры для локации и зарплаты.
                // Этот код - пример, основанный на общей документации.
                // Возможно, потребуется адаптация параметров под точные требования API.
                location: searchSettings.location,
                salary_from: searchSettings.salary,
                per_page: searchSettings.limit,
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
