import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// Interfaces can be shared or redefined here. Let's redefine for clarity.
interface SearchSettings {
    query: string;
    location: string;
    salary: number;
    limit: number;
}

interface AvitoVacancy {
    id: number;
    title: string;
    salary: { value: number; currency: string; period: string } | string;
    address: string;
    url: string;
    description: string;
    company?: { name: string };
}

const getAvitoToken = async (clientId: string, clientSecret: string): Promise<string> => {
    const AVITO_TOKEN_URL = "https://api.avito.ru/token/";
    try {
        const response = await axios.post(AVITO_TOKEN_URL, new URLSearchParams({
            "grant_type": "client_credentials",
            "client_id": clientId,
            "client_secret": clientSecret,
        }), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        return response.data.access_token;
    } catch (error: any) {
        console.error("Ошибка при получении токена Avito:", error.response?.data || error.message);
        // Throw a generic error to be caught by the main handler
        throw new Error("Не удалось получить токен доступа от Avito.");
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end('Method Not Allowed');
    }

    const { AVITO_CLIENT_ID, AVITO_CLIENT_SECRET } = process.env;
    if (!AVITO_CLIENT_ID || !AVITO_CLIENT_SECRET) {
        console.error('Avito Client ID или Client Secret не установлены в переменных окружения.');
        return res.status(500).json({ error: "Сервис не настроен для работы с Avito." });
    }

    const searchSettings: SearchSettings = req.body.searchSettings;
    if (!searchSettings || !searchSettings.query) {
        return res.status(400).json({ error: "Необходимо указать параметры поиска." });
    }

    try {
        const accessToken = await getAvitoToken(AVITO_CLIENT_ID, AVITO_CLIENT_SECRET);
        const AVITO_API_URL = "https://api.avito.ru/job-search/v1/vacancies";

        const response = await axios.get(AVITO_API_URL, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            params: {
                q: searchSettings.query,
                address: searchSettings.location,
                salary_from: searchSettings.salary,
                count: searchSettings.limit,
            },
        });

        const vacancies: AvitoVacancy[] = response.data.items || [];

        const formattedJobs = vacancies.map((v) => ({
            title: v.title,
            company: v.company?.name || "Компания не указана",
            salary: typeof v.salary === 'string' ? v.salary : `${v.salary.value} ${v.salary.currency}`,
            location: v.address,
            description: v.description.replace(/<br\s*\/?>/gi, "\n"),
            url: v.url,
            sourcePlatform: "Avito",
            companyRating: 0,
            companyReviewSummary: "",
            responsibilities: [],
            requirements: [],
            contacts: {},
        }));

        return res.status(200).json({ jobs: formattedJobs });

    } catch (error: any) {
        console.error("Ошибка при запросе к API Avito:", error.message);
        return res.status(500).json({ error: "Не удалось выполнить запрос к API Avito." });
    }
}
